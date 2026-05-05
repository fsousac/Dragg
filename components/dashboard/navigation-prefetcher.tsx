"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

export const sidebarRoutes = [
  "/dashboard",
  "/transactions",
  "/categories",
  "/budgets",
  "/payments",
  "/reports",
  "/goals",
  "/settings",
];

export function NavigationPrefetcher() {
  const pathname = usePathname();
  const router = useRouter();
  const didMount = useRef(false);

  useEffect(() => {
    const prefetchRoutes = () => {
      sidebarRoutes
        .filter((route) => route !== pathname)
        .forEach((route) => router.prefetch(route));
    };

    const hasIdleCallback = typeof window.requestIdleCallback === "function";
    const idleCallbackId = hasIdleCallback
      ? window.requestIdleCallback(prefetchRoutes)
      : window.setTimeout(prefetchRoutes, 150);

    return () => {
      if (hasIdleCallback && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleCallbackId);
      } else {
        window.clearTimeout(idleCallbackId);
      }
    };
  }, [pathname, router]);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }

    const refreshTimeoutId = window.setTimeout(() => router.refresh(), 250);

    return () => window.clearTimeout(refreshTimeoutId);
  }, [pathname, router]);

  return null;
}
