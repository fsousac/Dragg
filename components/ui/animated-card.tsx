"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  SPRING_EASING,
  DURATION,
  STAGGER,
  DELAY,
} from "@/lib/animations/tokens";

interface AnimatedCardProps {
  children: React.ReactNode;
  index?: number;
  variant?: "initial" | "page";
  className?: string;
}

export function AnimatedCard({
  children,
  index = 0,
  variant = "page",
  className,
}: AnimatedCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const baseDelay =
    variant === "initial"
      ? DELAY.wave3 + index * STAGGER.loose
      : index * STAGGER.base;

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: visible
          ? `opacity ${DURATION.slow}ms ${SPRING_EASING} ${baseDelay}ms,
             transform ${DURATION.slow}ms ${SPRING_EASING} ${baseDelay}ms`
          : "none",
      }}
    >
      {children}
    </div>
  );
}
