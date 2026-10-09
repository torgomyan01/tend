"use client";

import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CALL_STUN_SERVERS } from "@/lib/call-constants";
import { toastError } from "@/lib/toast";

export type CallDto = {
  id: string;
  conversationId: string;
  callerId: string;
  calleeId: string;
  mediaType: "AUDIO" | "VIDEO";
  status: string;
  startedAt: string | null;
  caller: { id: string; name: string; image: string | null } | null;
  callee: { id: string; name: string; image: string | null } | null;
};

type Props = {
  call: CallDto;
  currentUserId: string;
  peerName: string;
  onClose: (opts?: { refreshChat?: boolean }) => void;
};

function pickRecorderMime(kinds: string[]): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return kinds.find((t) => MediaRecorder.isTypeSupported(t));
}

/** Draw video into a box without stretching (letterbox / pillarbox). */
function drawVideoContain(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
) {
  const srcW = video.videoWidth;
  const srcH = video.videoHeight;
  if (!srcW || !srcH || boxW <= 0 || boxH <= 0) return;
  const scale = Math.min(boxW / srcW, boxH / srcH);
  const drawW = srcW * scale;
  const drawH = srcH * scale;
  const x = boxX + (boxW - drawW) / 2;
  const y = boxY + (boxH - drawH) / 2;
  ctx.drawImage(video, x, y, drawW, drawH);
}

/** Size recording canvas from the primary video track (portrait phone → 9:16). */
function sizeCanvasForVideo(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement | null,
) {
  const srcW = video?.videoWidth ?? 0;
  const srcH = video?.videoHeight ?? 0;
  const longEdge = 1280;
  if (srcW > 0 && srcH > 0) {
    if (srcW >= srcH) {
      canvas.width = longEdge;
      canvas.height = Math.max(2, Math.round(longEdge * (srcH / srcW)));
    } else {
      canvas.height = longEdge;
      canvas.width = Math.max(2, Math.round(longEdge * (srcW / srcH)));
    }
    return;
  }
  // Fallback before metadata: prefer portrait on narrow viewports.
  const preferPortrait =
    typeof window !== "undefined" && window.innerHeight > window.innerWidth;
  if (preferPortrait) {
    canvas.width = 720;
    canvas.height = 1280;
  } else {
    canvas.width = 1280;
    canvas.height = 720;
  }
}

export function CallRoom({ call, currentUserId, peerName, onClose }: Props) {
  const isCaller = currentUserId === call.callerId;
  const isVideo = call.mediaType === "VIDEO";

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const signalAfterRef = useRef<string | null>(null);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recordRafRef = useRef<number | null>(null);
  const recordAudioCtxRef = useRef<AudioContext | null>(null);
  const closedRef = useRef(false);
  const uploadChainRef = useRef<Promise<void>>(Promise.resolve());
  const recordMimeRef = useRef<string>("");
  const uploadedBytesRef = useRef(0);

  const [status, setStatus] = useState(call.status);
  const [connecting, setConnecting] = useState(true);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [localHasCamera, setLocalHasCamera] = useState(false);
  const [remoteVideoLive, setRemoteVideoLive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [remoteReady, setRemoteReady] = useState(false);
  const videoSenderRef = useRef<RTCRtpSender | null>(null);

  const peerLabel =
    (isCaller ? call.callee?.name : call.caller?.name) || peerName;

  const cleanupMedia = useCallback(() => {
    if (recordRafRef.current) {
      cancelAnimationFrame(recordRafRef.current);
      recordRafRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    recorderRef.current = null;
    void recordAudioCtxRef.current?.close().catch(() => undefined);
    recordAudioCtxRef.current = null;

    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
  }, []);

  const enqueueChunkUpload = useCallback(
    (blob: Blob, mimeType: string) => {
      if (blob.size <= 0) return;
      uploadChainRef.current = uploadChainRef.current
        .then(async () => {
          for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
              const form = new FormData();
              form.set("action", "chunk");
              form.set("mimeType", mimeType);
              form.set(
                "chunk",
                new File([blob], "chunk.bin", {
                  type: mimeType.split(";")[0] || mimeType,
                }),
              );
              const res = await fetch(`/api/calls/${call.id}/recording`, {
                method: "POST",
                body: form,
              });
              if (res.ok) {
                uploadedBytesRef.current += blob.size;
                return;
              }
            } catch {
              /* retry */
            }
            await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
          }
        })
        .catch(() => {
          /* keep chain alive */
        });
    },
    [call.id],
  );

  const finalizeRecordingOnServer = useCallback(async () => {
    await uploadChainRef.current;
    // Always try finalize — server decides if files exist.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const form = new FormData();
      form.set("action", "finalize");
      try {
        const res = await fetch(`/api/calls/${call.id}/recording`, {
          method: "POST",
          body: form,
        });
        if (res.ok) return true;
        if (res.status === 404 && attempt < 3) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
      } catch {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
    }
    return false;
  }, [call.id]);

  const stopRecordingAndUpload = useCallback(async () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      await new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve();
        };
        recorder.onstop = () => finish();
        try {
          if (typeof recorder.requestData === "function") {
            recorder.requestData();
          }
          recorder.stop();
        } catch {
          finish();
        }
        window.setTimeout(finish, 1500);
      });
      recorderRef.current = null;
    }
    // Let last ondataavailable enqueue + upload.
    await new Promise((r) => setTimeout(r, 400));
    await finalizeRecordingOnServer();
  }, [finalizeRecordingOnServer]);

  const hangup = useCallback(
    async (rejectOrCancel = false) => {
      if (closedRef.current) return;
      closedRef.current = true;
      await stopRecordingAndUpload();
      try {
        await fetch(
          `/api/calls/${call.id}/${rejectOrCancel ? "reject" : "hangup"}`,
          { method: "POST" },
        );
      } catch {
        /* ignore */
      }
      // Extra finalize after hangup in case late chunks landed.
      await finalizeRecordingOnServer();
      cleanupMedia();
      onClose({ refreshChat: true });
    },
    [
      call.id,
      cleanupMedia,
      finalizeRecordingOnServer,
      onClose,
      stopRecordingAndUpload,
    ],
  );

  const wireRemoteAudioToRecorder = useCallback(() => {
    const audioCtx = recordAudioCtxRef.current;
    const remote = remoteStreamRef.current;
    if (!audioCtx || !remote) return;
    try {
      for (const track of remote.getAudioTracks()) {
        const key = `wired:${track.id}`;
        if ((track as unknown as { __tendWired?: string }).__tendWired) continue;
        (track as unknown as { __tendWired?: string }).__tendWired = key;
        const src = audioCtx.createMediaStreamSource(new MediaStream([track]));
        // Reconnect into destination via a gain node kept on ctx.
        const dest = (audioCtx as unknown as { __tendDest?: MediaStreamAudioDestinationNode }).__tendDest;
        if (dest) src.connect(dest);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const startRecording = useCallback(() => {
    // Only the caller records — stream already mixes both sides (audio + PiP video).
    // Saves ~50% server storage vs both peers uploading nearly identical files.
    if (!isCaller) return;
    if (recorderRef.current) return;
    const local = localStreamRef.current;
    if (!local) return;

    try {
      const audioCtx = new AudioContext();
      recordAudioCtxRef.current = audioCtx;
      const dest = audioCtx.createMediaStreamDestination();
      (audioCtx as unknown as { __tendDest?: MediaStreamAudioDestinationNode }).__tendDest = dest;
      if (audioCtx.state === "suspended") {
        void audioCtx.resume().catch(() => undefined);
      }

      for (const stream of [local, remoteStreamRef.current].filter(Boolean) as MediaStream[]) {
        for (const track of stream.getAudioTracks()) {
          try {
            const src = audioCtx.createMediaStreamSource(new MediaStream([track]));
            src.connect(dest);
            (track as unknown as { __tendWired?: string }).__tendWired = track.id;
          } catch {
            /* ignore track */
          }
        }
      }

      let mixed: MediaStream | null = null;
      if (isVideo) {
        try {
          const canvas = document.createElement("canvas");
          recordCanvasRef.current = canvas;
          const ctx = canvas.getContext("2d");
          let lastCanvasKey = "";
          const draw = () => {
            if (!ctx) return;
            const remoteEl = remoteVideoRef.current;
            const localEl = localVideoRef.current;
            const primary =
              remoteEl && remoteEl.videoWidth > 0
                ? remoteEl
                : localEl && localEl.videoWidth > 0
                  ? localEl
                  : null;
            const key = primary
              ? `${primary.videoWidth}x${primary.videoHeight}`
              : "fallback";
            if (key !== lastCanvasKey) {
              sizeCanvasForVideo(canvas, primary);
              lastCanvasKey = key;
            }

            ctx.fillStyle = "#0f172a";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            if (remoteEl && remoteEl.readyState >= 2 && remoteEl.videoWidth > 0) {
              drawVideoContain(ctx, remoteEl, 0, 0, canvas.width, canvas.height);
            } else if (
              localEl &&
              localEl.readyState >= 2 &&
              localEl.videoWidth > 0
            ) {
              drawVideoContain(ctx, localEl, 0, 0, canvas.width, canvas.height);
            }

            if (localEl && localEl.readyState >= 2 && localEl.videoWidth > 0) {
              const pipMaxW = Math.round(canvas.width * 0.28);
              const pipMaxH = Math.round(canvas.height * 0.28);
              const srcRatio = localEl.videoWidth / localEl.videoHeight;
              let pipW = pipMaxW;
              let pipH = Math.round(pipW / srcRatio);
              if (pipH > pipMaxH) {
                pipH = pipMaxH;
                pipW = Math.round(pipH * srcRatio);
              }
              const pad = Math.max(16, Math.round(canvas.width * 0.03));
              const pipX = canvas.width - pipW - pad;
              const pipY = canvas.height - pipH - pad;
              ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
              ctx.fillRect(pipX - 4, pipY - 4, pipW + 8, pipH + 8);
              drawVideoContain(ctx, localEl, pipX, pipY, pipW, pipH);
            }
            recordRafRef.current = requestAnimationFrame(draw);
          };
          sizeCanvasForVideo(canvas, remoteVideoRef.current);
          draw();
          const canvasStream = canvas.captureStream(15);
          mixed = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...dest.stream.getAudioTracks(),
          ]);
        } catch {
          mixed = null;
        }
      }

      if (!mixed) {
        // Audio-only fallback (also used if canvas capture is unsupported).
        const remote = remoteStreamRef.current;
        const videoTrack =
          remote?.getVideoTracks()[0] ?? local.getVideoTracks()[0] ?? null;
        mixed = new MediaStream([
          ...(videoTrack && isVideo ? [videoTrack] : []),
          ...dest.stream.getAudioTracks(),
        ]);
      }

      if (mixed.getTracks().length === 0) return;

      const mime = isVideo
        ? pickRecorderMime([
            "video/webm;codecs=vp9,opus",
            "video/webm;codecs=vp8,opus",
            "video/webm",
            "video/mp4",
            "audio/webm;codecs=opus",
            "audio/webm",
            "audio/mp4",
          ])
        : pickRecorderMime([
            "audio/webm;codecs=opus",
            "audio/webm",
            "audio/mp4",
          ]);

      const wantsVideo = isVideo && mixed.getVideoTracks().length > 0;
      const recorder = mime
        ? new MediaRecorder(
            mixed,
            wantsVideo
              ? {
                  mimeType: mime,
                  videoBitsPerSecond: 1_200_000,
                  audioBitsPerSecond: 64_000,
                }
              : {
                  mimeType: mime.startsWith("video/")
                    ? pickRecorderMime(["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]) || mime
                    : mime,
                  audioBitsPerSecond: 64_000,
                },
          )
        : new MediaRecorder(mixed);

      recordMimeRef.current =
        recorder.mimeType ||
        mime ||
        (wantsVideo ? "video/webm" : "audio/webm");
      uploadedBytesRef.current = 0;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          enqueueChunkUpload(e.data, recordMimeRef.current);
        }
      };
      recorder.onerror = () => {
        /* keep call alive even if recorder errors */
      };
      recorder.start(2_000);
      recorderRef.current = recorder;
      wireRemoteAudioToRecorder();
    } catch {
      /* best-effort — call continues without local recording */
    }
  }, [enqueueChunkUpload, isCaller, isVideo, wireRemoteAudioToRecorder]);

  const postSignal = useCallback(
    async (type: "OFFER" | "ANSWER" | "ICE", payload: unknown) => {
      await fetch(`/api/calls/${call.id}/signals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, payload: JSON.stringify(payload) }),
      });
    },
    [call.id],
  );

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        // Mic is required; camera is optional on video calls.
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
          toastError(
            "Միկրոֆոն",
            "Զանգի համար անհրաժեշտ է թույլատրել միկրոֆոնը։",
          );
          void hangup(true);
          return;
        }

        let hasCamera = false;
        if (isVideo) {
          try {
            const cam = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: "user",
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
            });
            for (const track of cam.getVideoTracks()) {
              stream.addTrack(track);
              hasCamera = true;
            }
          } catch {
            hasCamera = false;
            setCameraOff(true);
          }
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalHasCamera(hasCamera);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const pc = new RTCPeerConnection({ iceServers: CALL_STUN_SERVERS });
        pcRef.current = pc;
        const remote = new MediaStream();
        remoteStreamRef.current = remote;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remote;

        for (const track of stream.getAudioTracks()) {
          pc.addTrack(track, stream);
        }

        if (isVideo) {
          const videoTrack = stream.getVideoTracks()[0] ?? null;
          if (videoTrack) {
            videoSenderRef.current = pc.addTrack(videoTrack, stream);
          } else {
            // Keep a video m-line so the peer can still send video unilaterally.
            const transceiver = pc.addTransceiver("video", {
              direction: "sendrecv",
            });
            videoSenderRef.current = transceiver.sender;
          }
        }

        pc.ontrack = (event) => {
          const tracks =
            event.streams[0]?.getTracks() ??
            (event.track ? [event.track] : []);
          for (const track of tracks) {
            const already = remote.getTracks().some((t) => t.id === track.id);
            if (!already) remote.addTrack(track);
            if (track.kind === "video") {
              const syncRemoteVideo = () => {
                setRemoteVideoLive(
                  track.readyState === "live" && track.enabled && !track.muted,
                );
              };
              syncRemoteVideo();
              track.addEventListener("mute", syncRemoteVideo);
              track.addEventListener("unmute", syncRemoteVideo);
              track.addEventListener("ended", () => setRemoteVideoLive(false));
            }
          }
          remoteStreamRef.current = remote;
          setRemoteReady(true);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;
          if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remote;
          wireRemoteAudioToRecorder();
          // Ensure recording is running once media actually flows (active calls only).
          if (
            !recorderRef.current &&
            (status === "ACTIVE" || call.status === "ACTIVE")
          ) {
            startRecording();
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            void postSignal("ICE", event.candidate.toJSON());
          }
        };

        const maybeStartRec = () => {
          setConnecting(false);
          // Only after answer — avoid uploading RINGING wait noise.
          if (
            (status === "ACTIVE" || call.status === "ACTIVE") &&
            !recorderRef.current
          ) {
            startRecording();
          }
        };
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "connected") {
            maybeStartRec();
          }
          if (
            pc.connectionState === "failed" ||
            pc.connectionState === "disconnected" ||
            pc.connectionState === "closed"
          ) {
            setConnecting(false);
          }
        };
        pc.oniceconnectionstatechange = () => {
          if (
            pc.iceConnectionState === "connected" ||
            pc.iceConnectionState === "completed"
          ) {
            maybeStartRec();
          }
        };
        // Fallback: some mobiles never fire connected promptly.
        window.setTimeout(() => {
          if (
            !closedRef.current &&
            !recorderRef.current &&
            (status === "ACTIVE" || call.status === "ACTIVE")
          ) {
            startRecording();
          }
        }, 2500);

        if (isCaller && (status === "ACTIVE" || call.status === "ACTIVE")) {
          makingOfferRef.current = true;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await postSignal("OFFER", pc.localDescription);
          makingOfferRef.current = false;
        }

        setConnecting(false);
      } catch {
        toastError("Զանգ", "Չհաջողվեց միանալ զանգին։ Փորձեք նորից։");
        void hangup(true);
      }
    }

    void setup();

    const onPageHide = () => {
      if (closedRef.current) return;
      // Best-effort hangup if the tab is closed/navigated away.
      void hangup(false);
    };
    window.addEventListener("pagehide", onPageHide);

    return () => {
      cancelled = true;
      window.removeEventListener("pagehide", onPageHide);
      if (!closedRef.current) {
        // Finalize recording + hangup when leaving the call UI.
        void hangup(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once per call
  }, [call.id]);

  // When call becomes ACTIVE (callee accepted), caller creates offer; callee waits
  useEffect(() => {
    setStatus(call.status);
  }, [call.status]);

  useEffect(() => {
    if (status !== "ACTIVE" || closedRef.current) return;
    if (!recorderRef.current) {
      startRecording();
    }
  }, [status, startRecording]);

  useEffect(() => {
    if (status !== "ACTIVE") return;
    const pc = pcRef.current;
    if (!pc || !isCaller) return;
    if (pc.localDescription) return;

    let cancelled = false;
    (async () => {
      try {
        makingOfferRef.current = true;
        const offer = await pc.createOffer();
        if (cancelled) return;
        await pc.setLocalDescription(offer);
        await postSignal("OFFER", pc.localDescription);
      } catch {
        /* ignore */
      } finally {
        makingOfferRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, isCaller, postSignal]);

  // Signal polling
  useEffect(() => {
    let stopped = false;

    async function poll() {
      if (stopped || closedRef.current) return;
      try {
        const after = signalAfterRef.current;
        const qs = after ? `?after=${encodeURIComponent(after)}` : "";
        const res = await fetch(`/api/calls/${call.id}/signals${qs}`);
        const data = (await res.json().catch(() => null)) as {
          signals?: Array<{
            id: string;
            type: "OFFER" | "ANSWER" | "ICE";
            payload: string;
            createdAt: string;
          }>;
          callStatus?: string;
        } | null;

        if (data?.callStatus) {
          setStatus(data.callStatus);
          if (
            data.callStatus === "ENDED" ||
            data.callStatus === "REJECTED" ||
            data.callStatus === "CANCELLED" ||
            data.callStatus === "MISSED" ||
            data.callStatus === "FAILED"
          ) {
            await stopRecordingAndUpload();
            cleanupMedia();
            closedRef.current = true;
            onClose({ refreshChat: true });
            return;
          }
        }

        const pc = pcRef.current;
        if (pc && data?.signals?.length) {
          for (const signal of data.signals) {
            signalAfterRef.current = signal.createdAt;
            const payload = JSON.parse(signal.payload) as RTCSessionDescriptionInit | RTCIceCandidateInit;
            if (signal.type === "OFFER" && !isCaller) {
              const offerCollision =
                makingOfferRef.current || pc.signalingState !== "stable";
              ignoreOfferRef.current = offerCollision;
              if (offerCollision) continue;
              await pc.setRemoteDescription(payload as RTCSessionDescriptionInit);
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await postSignal("ANSWER", pc.localDescription);
            } else if (signal.type === "ANSWER" && isCaller) {
              if (!pc.currentRemoteDescription) {
                await pc.setRemoteDescription(
                  payload as RTCSessionDescriptionInit,
                );
              }
            } else if (signal.type === "ICE") {
              try {
                await pc.addIceCandidate(payload as RTCIceCandidateInit);
              } catch {
                /* ignore early ICE */
              }
            }
          }
        }
      } catch {
        /* ignore */
      }
    }

    const id = window.setInterval(() => void poll(), 800);
    void poll();
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [
    call.id,
    cleanupMedia,
    isCaller,
    onClose,
    postSignal,
    stopRecordingAndUpload,
  ]);

  // Elapsed timer
  useEffect(() => {
    if (status !== "ACTIVE") return;
    const started = call.startedAt ? new Date(call.startedAt).getTime() : Date.now();
    const tick = () =>
      setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [status, call.startedAt]);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
  }

  async function toggleCamera() {
    if (!isVideo) return;
    const pc = pcRef.current;
    const stream = localStreamRef.current;
    if (!pc || !stream) return;

    if (!cameraOff) {
      // Turn camera off — keep the video m-line, just stop sending frames.
      setCameraOff(true);
      const existing = stream.getVideoTracks()[0];
      if (existing) {
        existing.enabled = false;
      }
      if (videoSenderRef.current) {
        try {
          await videoSenderRef.current.replaceTrack(null);
        } catch {
          /* ignore */
        }
      }
      return;
    }

    // Turn camera on (or request permission the first time).
    try {
      let track = stream.getVideoTracks()[0];
      if (!track || track.readyState === "ended") {
        const cam = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        track = cam.getVideoTracks()[0];
        if (!track) return;
        for (const old of stream.getVideoTracks()) {
          stream.removeTrack(old);
          old.stop();
        }
        stream.addTrack(track);
        setLocalHasCamera(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } else {
        track.enabled = true;
      }

      if (videoSenderRef.current) {
        await videoSenderRef.current.replaceTrack(track);
      } else {
        videoSenderRef.current = pc.addTrack(track, stream);
        // Renegotiate so peer learns about the new video track.
        if (isCaller || pc.signalingState === "stable") {
          makingOfferRef.current = true;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await postSignal("OFFER", pc.localDescription);
          makingOfferRef.current = false;
        }
      }
      setCameraOff(false);
    } catch {
      setCameraOff(true);
      toastError(
        "Տեսախցիկ",
        "Տեսախցիկը չի բացվեց կամ մերժվեց է։ Կարող եք շարունակել ձայնով։",
      );
    }
  }

  const mm = Math.floor(elapsed / 60);
  const ss = elapsed % 60;
  const timeLabel = `${mm}:${String(ss).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/90 p-3 backdrop-blur-sm">
      <div className="relative flex h-[min(96vh,860px)] w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem] bg-slate-950 shadow-2xl ring-1 ring-white/10 max-sm:max-w-md">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-400">
              {isVideo ? "Տեսազանգ" : "Ձայնային զանգ"}
            </p>
            <p className="mt-1 text-lg font-black text-white">{peerLabel}</p>
            <p className="text-xs font-semibold text-white/50">
              {status === "RINGING"
                ? isCaller
                  ? "Զանգում ենք…"
                  : "Մուտքային զանգ"
                : connecting
                  ? "Միանում ենք…"
                  : remoteReady
                    ? timeLabel
                    : "Սպասում ենք կապին…"}
            </p>
          </div>
          {status === "ACTIVE" ? (
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-300 ring-1 ring-emerald-400/30">
              {timeLabel}
            </span>
          ) : null}
        </div>

        <div className="relative min-h-0 flex-1 bg-slate-900">
          {isVideo ? (
            <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`h-full w-full object-contain bg-slate-950 ${
                  remoteVideoLive ? "opacity-100" : "opacity-0"
                }`}
              />
              {!remoteVideoLive ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="grid size-28 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-4xl font-black text-slate-950 shadow-xl">
                    {peerLabel.slice(0, 1).toUpperCase()}
                  </div>
                  <p className="text-sm font-bold text-white/70">
                    {remoteReady
                      ? "Դիմացինի տեսախցիկը անջատ է"
                      : status === "RINGING"
                        ? "Զանգի ազդանշան…"
                        : "Սպասում ենք կապին…"}
                  </p>
                </div>
              ) : null}
              <div className="absolute bottom-4 right-4 overflow-hidden rounded-2xl bg-slate-950 shadow-lg ring-2 ring-white/20">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`h-32 w-auto max-w-[40vw] object-contain sm:h-40 ${
                    cameraOff || !localHasCamera ? "hidden" : ""
                  }`}
                />
                {cameraOff || !localHasCamera ? (
                  <div className="flex h-28 w-20 flex-col items-center justify-center gap-1 bg-slate-800 sm:h-36 sm:w-28">
                    <VideoOff className="size-5 text-white/70" />
                    <span className="px-1 text-center text-[9px] font-bold text-white/55">
                      Ձեր տեսախցիկը անջատ է
                    </span>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <div className="grid size-28 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-4xl font-black text-slate-950 shadow-xl">
                {peerLabel.slice(0, 1).toUpperCase()}
              </div>
              <p className="text-sm font-bold text-white/70">
                {status === "RINGING" ? "Զանգի ազդանշան…" : "Խոսակցություն"}
              </p>
              <audio ref={remoteAudioRef} autoPlay />
            </div>
          )}
          {isVideo ? <audio ref={remoteAudioRef} autoPlay className="hidden" /> : null}

          {connecting || status === "RINGING" ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/30">
              <Loader2 className="size-8 animate-spin text-amber-300" />
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-center gap-3 px-5 py-5">
          <button
            type="button"
            onClick={toggleMute}
            className={`grid size-12 place-items-center rounded-full transition ${
              muted
                ? "bg-rose-500 text-white"
                : "bg-white/10 text-white hover:bg-white/15"
            }`}
            aria-label={muted ? "Միացնել միկրոֆոնը" : "Անջատել միկրոֆոնը"}
          >
            {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </button>

          {isVideo ? (
            <button
              type="button"
              onClick={() => void toggleCamera()}
              className={`grid size-12 place-items-center rounded-full transition ${
                cameraOff
                  ? "bg-rose-500 text-white"
                  : "bg-white/10 text-white hover:bg-white/15"
              }`}
              aria-label={cameraOff ? "Միացնել տեսախցիկը" : "Անջատել տեսախցիկը"}
            >
              {cameraOff ? (
                <VideoOff className="size-5" />
              ) : (
                <Video className="size-5" />
              )}
            </button>
          ) : null}

          {status === "RINGING" && !isCaller ? (
            <>
              <button
                type="button"
                onClick={() => {
                  void (async () => {
                    const res = await fetch(`/api/calls/${call.id}/accept`, {
                      method: "POST",
                    });
                    if (!res.ok) {
                      toastError("Չհաջողվեց պատասխանել", "Փորձեք նորից։");
                      return;
                    }
                    const data = (await res.json()) as { call?: CallDto };
                    if (data.call) setStatus(data.call.status);
                  })();
                }}
                className="grid size-14 place-items-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 hover:bg-emerald-400"
                aria-label="Պատասխանել"
              >
                <Phone className="size-6" />
              </button>
              <button
                type="button"
                onClick={() => void hangup(true)}
                className="grid size-14 place-items-center rounded-full bg-rose-600 text-white shadow-lg hover:bg-rose-500"
                aria-label="Մերժել"
              >
                <PhoneOff className="size-6" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => void hangup(status === "RINGING")}
              className="grid size-14 place-items-center rounded-full bg-rose-600 text-white shadow-lg hover:bg-rose-500"
              aria-label="Ավարտել"
            >
              <PhoneOff className="size-6" />
            </button>
          )}
        </div>

        <p className="pb-4 text-center text-[11px] font-semibold text-white/40">
          Զանգը շարունակ հոսքով մաս-մաս պահպվում է սերվերում առանց կառելի
        </p>
      </div>
    </div>
  );
}
