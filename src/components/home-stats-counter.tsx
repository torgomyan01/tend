"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  /** Suffix rendered after the animated number, e.g. "+" or "֏". */
  suffix?: string;
  /** Animation duration in ms. */
  duration?: number;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("hy-AM").format(Math.max(0, Math.round(value)));
}

export function HomeStatsCounter({
  value,
  suffix = "",
  duration = 1400,
}: Props) {
  const [display, setDisplay] = useState(0);
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const animatedRef = useRef(false);

  useEffect(() => {
    if (animatedRef.current) return;
    const target = value;
    if (target <= 0) {
      setDisplay(0);
      return;
    }

    const node = containerRef.current;
    if (!node) {
      setDisplay(target);
      animatedRef.current = true;
      return;
    }

    const runAnimation = () => {
      animatedRef.current = true;
      const start = performance.now();
      let frame = 0;

      const step = (now: number) => {
        const elapsed = now - start;
        const t = Math.min(1, elapsed / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(target * eased);
        if (t < 1) {
          frame = window.requestAnimationFrame(step);
        } else {
          setDisplay(target);
        }
      };

      frame = window.requestAnimationFrame(step);
      return () => window.cancelAnimationFrame(frame);
    };

    if (typeof IntersectionObserver === "undefined") {
      runAnimation();
      return;
    }

    let cleanup: (() => void) | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            cleanup = runAnimation();
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      cleanup?.();
    };
  }, [value, duration]);

  return (
    <span ref={containerRef} className="tabular-nums">
      {formatNumber(display)}
      {suffix}
    </span>
  );
}
