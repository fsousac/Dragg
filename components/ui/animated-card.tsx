"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
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

  /* c8 ignore start */
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
  /* c8 ignore stop */

  const baseDelay =
    variant === "initial"
      ? DELAY.wave3 + index * STAGGER.loose
      : index * STAGGER.base;

  /* c8 ignore next */
  const visibleClass = visible ? "animated-card--visible" : undefined;

  return (
    <div
      ref={ref}
      className={cn("animated-card", visibleClass, className)}
      style={{ "--card-delay": `${baseDelay}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
