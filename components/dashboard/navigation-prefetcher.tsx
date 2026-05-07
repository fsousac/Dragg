"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  getCurrentMonthValue,
  getMonthFromSearchParams,
  withSelectedMonth,
} from "@/components/dashboard/month-route";

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
  const searchParams = useSearchParams();
  const didMount = useRef(false);

  useEffect(() => {
    if (getMonthFromSearchParams(searchParams)) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set("month", getCurrentMonthValue());
    router.replace(`${pathname}?${nextSearchParams.toString()}`, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const prefetchRoutes = () => {
      sidebarRoutes
        .filter((route) => route !== pathname)
        .map((route) => withSelectedMonth(route, searchParams))
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
  }, [pathname, router, searchParams]);

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
