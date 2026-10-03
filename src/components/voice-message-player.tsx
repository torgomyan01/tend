"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type Tone = "outgoing" | "incoming" | "staff";

type Props = {
  src: string;
  tone?: Tone;
};

const BAR_COUNT = 32;
const STOP_EVENT = "tend:voice-stop";

/** Stable pseudo-waveform from src so each message looks distinct. */
function barsForSrc(src: string): number[] {
  let seed = 0;
  for (let i = 0; i < src.length; i += 1) {
    seed = (seed * 31 + src.charCodeAt(i)) >>> 0;
  }
  const bars: number[] = [];
  for (let i = 0; i < BAR_COUNT; i += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const wave = 0.32 + 0.58 * Math.abs(Math.sin(i * 0.48 + (seed % 97) / 28));
    const jitter = 0.22 + ((seed >>> 8) % 78) / 100;
    bars.push(Math.min(1, Math.max(0.16, wave * jitter)));
  }
  return bars;
}

function formatClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const toneStyles: Record<
  Tone,
  {
    shell: string;
    button: string;
    buttonIcon: string;
    barIdle: string;
    barPlayed: string;
    time: string;
  }
> = {
  outgoing: {
    shell: "bg-white/[0.08] ring-1 ring-white/12",
    button: "bg-amber-400 text-slate-950 hover:bg-amber-300",
    buttonIcon: "text-slate-950",
    barIdle: "bg-white/22",
    barPlayed: "bg-amber-300",
    time: "text-white/60",
  },
  incoming: {
    shell: "bg-gradient-to-r from-slate-50 to-amber-50/40 ring-1 ring-slate-200/90",
    button: "bg-slate-950 text-white hover:bg-slate-800",
    buttonIcon: "text-white",
    barIdle: "bg-slate-300/90",
    barPlayed: "bg-amber-500",
    time: "text-slate-500",
  },
  staff: {
    shell: "bg-white/80 ring-1 ring-indigo-200",
    button: "bg-indigo-700 text-white hover:bg-indigo-600",
    buttonIcon: "text-white",
    barIdle: "bg-indigo-200",
    barPlayed: "bg-indigo-600",
    time: "text-indigo-700/75",
  },
};

export function VoiceMessagePlayer({ src, tone = "incoming" }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const instanceId = useId();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const bars = barsForSrc(src);
  const styles = toneStyles[tone];
  const labelId = useId();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => {
      setCurrent(audio.currentTime);
      const d = audio.duration;
      if (Number.isFinite(d) && d > 0) {
        setDuration(d);
        setProgress(audio.currentTime / d);
      }
    };
    const onMeta = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
      setCurrent(0);
      audio.currentTime = 0;
    };
    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    const onForeignStop = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail === instanceId) return;
      if (!audio.paused) audio.pause();
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);
    window.addEventListener(STOP_EVENT, onForeignStop);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
      window.removeEventListener(STOP_EVENT, onForeignStop);
    };
  }, [src, instanceId]);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      window.dispatchEvent(
        new CustomEvent(STOP_EVENT, { detail: instanceId }),
      );
      try {
        await audio.play();
      } catch {
        setPlaying(false);
      }
    } else {
      audio.pause();
    }
  }

  function seek(ratio: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      return;
    }
    const next = Math.min(1, Math.max(0, ratio)) * audio.duration;
    audio.currentTime = next;
    setCurrent(next);
    setProgress(next / audio.duration);
  }

  const displayTime = playing || current > 0 ? current : duration;

  return (
    <div
      className={`flex w-[min(100%,288px)] items-center gap-2.5 rounded-2xl px-2.5 py-2 ${styles.shell}`}
      role="group"
      aria-labelledby={labelId}
    >
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      <button
        type="button"
        onClick={() => void toggle()}
        className={`grid size-9 shrink-0 place-items-center rounded-full shadow-sm transition active:scale-95 ${styles.button}`}
        aria-label={playing ? "Դադարեցնել" : "Նվագարկել"}
      >
        {playing ? (
          <Pause className={`size-3.5 fill-current ${styles.buttonIcon}`} />
        ) : (
          <Play
            className={`size-3.5 translate-x-px fill-current ${styles.buttonIcon}`}
          />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          id={labelId}
          className="flex h-8 w-full cursor-pointer items-end gap-[2.5px]"
          aria-label="Ձայնային հաղորդագրություն"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            seek(ratio);
          }}
        >
          {bars.map((h, i) => {
            const filled = (i + 0.5) / bars.length <= progress;
            const live =
              playing &&
              Math.abs(i / bars.length - progress) < 0.08;
            return (
              <span
                key={i}
                className={`w-[2.5px] rounded-full transition-[colors,transform] duration-150 ${
                  filled ? styles.barPlayed : styles.barIdle
                } ${live ? "scale-y-110" : ""}`}
                style={{
                  height: `${Math.round(9 + h * 20)}px`,
                  opacity: filled ? 1 : 0.85,
                }}
              />
            );
          })}
        </button>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p
            className={`text-[10px] font-black tabular-nums tracking-wide ${styles.time}`}
          >
            {formatClock(displayTime)}
          </p>
          {duration > 0 && (playing || current > 0) ? (
            <p
              className={`text-[10px] font-bold tabular-nums tracking-wide ${styles.time}`}
            >
              {formatClock(duration)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
