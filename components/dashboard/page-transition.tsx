"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Rendered with a key so React unmounts/remounts on every navigation,
// restarting the CSS animation without any JS-driven state.
function Animated({ children }: { children: ReactNode }) {
  return <div className="animate-page-enter">{children}</div>;
}

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <Animated key={pathname}>{children}</Animated>;
}
