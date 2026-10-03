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
  const recordChunksRef = useRef<Blob[]>([]);
  const recordCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recordRafRef = useRef<number | null>(null);
  const recordAudioCtxRef = useRef<AudioContext | null>(null);
  const closedRef = useRef(false);

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

  const uploadRecording = useCallback(
    async (blob: Blob) => {
      if (blob.size < 1000) return;
      const ext = blob.type.includes("mp4") ? "mp4" : "vwebm";
      const file = new File([blob], `call-${call.id}.${ext}`, {
        type: blob.type.split(";")[0] || (isVideo ? "video/webm" : "audio/webm"),
      });
      const form = new FormData();
      form.set("file", file);
      try {
        await fetch(`/api/calls/${call.id}/recording`, {
          method: "POST",
          body: form,
        });
      } catch {
        /* non-blocking */
      }
    },
    [call.id, isVideo],
  );

  const stopRecordingAndUpload = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    await new Promise<void>((resolve) => {
      recorder.onstop = () => {
        const type =
          recorder.mimeType ||
          (isVideo ? "video/webm" : "audio/webm");
        const blob = new Blob(recordChunksRef.current, { type });
        recordChunksRef.current = [];
        void uploadRecording(blob).finally(() => resolve());
      };
      try {
        recorder.stop();
      } catch {
        resolve();
      }
    });
  }, [isVideo, uploadRecording]);

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
      cleanupMedia();
      onClose({ refreshChat: true });
    },
    [call.id, cleanupMedia, onClose, stopRecordingAndUpload],
  );

  const startRecording = useCallback(() => {
    if (!isCaller) return;
    if (recorderRef.current) return;
    const local = localStreamRef.current;
    const remote = remoteStreamRef.current;
    if (!local) return;

    try {
      const audioCtx = new AudioContext();
      recordAudioCtxRef.current = audioCtx;
      const dest = audioCtx.createMediaStreamDestination();
      for (const stream of [local, remote].filter(Boolean) as MediaStream[]) {
        for (const track of stream.getAudioTracks()) {
          const src = audioCtx.createMediaStreamSource(
            new MediaStream([track]),
          );
          src.connect(dest);
        }
      }

      let mixed: MediaStream;
      if (isVideo) {
        const canvas = document.createElement("canvas");
        canvas.width = 1280;
        canvas.height = 720;
        recordCanvasRef.current = canvas;
        const ctx = canvas.getContext("2d");
        const draw = () => {
          if (!ctx) return;
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          const remoteEl = remoteVideoRef.current;
          const localEl = localVideoRef.current;
          if (remoteEl && remoteEl.readyState >= 2) {
            ctx.drawImage(remoteEl, 0, 0, canvas.width, canvas.height);
          }
          if (localEl && localEl.readyState >= 2) {
            const w = 320;
            const h = 180;
            ctx.drawImage(
              localEl,
              canvas.width - w - 24,
              canvas.height - h - 24,
              w,
              h,
            );
          }
          recordRafRef.current = requestAnimationFrame(draw);
        };
        draw();
        const canvasStream = canvas.captureStream(15);
        mixed = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...dest.stream.getAudioTracks(),
        ]);
      } else {
        mixed = dest.stream;
      }

      const mime = isVideo
        ? pickRecorderMime([
            "video/webm;codecs=vp9,opus",
            "video/webm;codecs=vp8,opus",
            "video/webm",
            "video/mp4",
          ])
        : pickRecorderMime([
            "audio/webm;codecs=opus",
            "audio/webm",
            "audio/mp4",
          ]);

      const recorder = mime
        ? new MediaRecorder(mixed, { mimeType: mime })
        : new MediaRecorder(mixed);
      recordChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordChunksRef.current.push(e.data);
      };
      recorder.start(1000);
      recorderRef.current = recorder;
    } catch {
      /* recording optional */
    }
  }, [isCaller, isVideo]);

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
          setRemoteReady(true);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;
          if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remote;
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            void postSignal("ICE", event.candidate.toJSON());
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "connected") {
            setConnecting(false);
            startRecording();
          }
          if (
            pc.connectionState === "failed" ||
            pc.connectionState === "disconnected" ||
            pc.connectionState === "closed"
          ) {
            setConnecting(false);
          }
        };

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
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once per call
  }, [call.id]);

  // When call becomes ACTIVE (callee accepted), caller creates offer; callee waits
  useEffect(() => {
    setStatus(call.status);
  }, [call.status]);

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
      <div className="relative flex h-[min(92vh,720px)] w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem] bg-slate-950 shadow-2xl ring-1 ring-white/10">
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
                className={`h-full w-full object-cover ${
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
                      ? "Դիմածողի տեսախցիկը անջատ է"
                      : status === "RINGING"
                        ? "Զանգի ազդանշան…"
                        : "Սպասում ենք կապին…"}
                  </p>
                </div>
              ) : null}
              <div className="absolute bottom-4 right-4 overflow-hidden rounded-2xl shadow-lg ring-2 ring-white/20">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`h-28 w-20 object-cover sm:h-36 sm:w-28 ${
                    cameraOff || !localHasCamera ? "hidden" : ""
                  }`}
                />
                {cameraOff || !localHasCamera ? (
                  <div className="flex h-28 w-20 flex-col items-center justify-center gap-1 bg-slate-800 sm:h-36 sm:w-28">
                    <VideoOff className="size-5 text-white/70" />
                    <span className="px-1 text-center text-[9px] font-bold text-white/55">
                      Ծեր տեսախցիկը անջատ է
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

        {isVideo ? (
          <p className="pb-4 text-center text-[11px] font-semibold text-white/40">
            Տեսախցիկը պառտադիր է։ կարող եք բացել/անջատել անկախ։
          </p>
        ) : isCaller ? (
          <p className="pb-4 text-center text-[11px] font-semibold text-white/40">
            Ցայնային զանգը կպահպանվի զրույցում
          </p>
        ) : null}
      </div>
    </div>
  );
}
