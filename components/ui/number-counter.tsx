"use client";

import { useEffect, useRef, useState } from "react";
import { DURATION } from "@/lib/animations/tokens";

interface NumberCounterProps {
  value: number;
  duration?: number;
  format?: (value: number) => string;
  prefix?: string;
  suffix?: string;
  muted?: string;
  className?: string;
  mutedClassName?: string;
  startOnView?: boolean;
}

export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function useStartOnView(
  startOnView: boolean,
  ref: React.RefObject<HTMLSpanElement | null>,
) {
  const [started, setStarted] = useState(!startOnView);

  useEffect(() => {
    if (!startOnView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [startOnView, ref]);

  return started;
}

function useAnimatedNumber(started: boolean, value: number, duration: number) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!started) return;

    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const next = easeOutExpo(t) * value;
      setCurrent(next);
      if (t < 1) requestAnimationFrame(tick);
      else setCurrent(value);
    }

    requestAnimationFrame(tick);
  }, [started, value, duration]);

  return current;
}

export function NumberCounter({
  value,
  duration = DURATION.counter,
  format,
  prefix = "",
  suffix = "",
  muted,
  className,
  mutedClassName,
  startOnView = true,
}: NumberCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const started = useStartOnView(startOnView, ref);
  const current = useAnimatedNumber(started, value, duration);

  const formatted = format
    ? format(current)
    : `${prefix}${current.toFixed(0)}${suffix}`;

  return (
    <span ref={ref}>
      <span className={className}>{formatted}</span>
      {muted && <span className={mutedClassName ?? "opacity-40"}>{muted}</span>}
    </span>
  );
}
