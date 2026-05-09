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
  const prefetched = useRef<Set<string>>(new Set());
  const lastRefreshed = useRef<string | null>(null);

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
    // Start prefetch only after the page has fully loaded (or after 1s fallback).
    const startPrefetch = () => {
      const prefetchRoutes = () => {
        sidebarRoutes
          .filter((route) => route !== pathname)
          .map((route) => withSelectedMonth(route, searchParams))
          .forEach((route) => {
            if (!prefetched.current.has(route)) {
              prefetched.current.add(route);
              try {
                router.prefetch(route);
              } catch {}
            }
          });
      };

      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(prefetchRoutes);
      } else {
        window.setTimeout(prefetchRoutes, 300);
      }
    };

    if (document.readyState === "complete") {
      startPrefetch();
    } else {
      const onLoad = () => startPrefetch();
      window.addEventListener("load", onLoad, { once: true });
      // Fallback: start after 1s if load doesn't fire for some reason
      const fallbackId = window.setTimeout(startPrefetch, 1000);

      return () => {
        window.removeEventListener("load", onLoad);
        window.clearTimeout(fallbackId);
      };
    }
  }, [pathname, router, searchParams]);

  useEffect(() => {
    // Only refresh once per pathname change and avoid repeated refreshes.
    if (!didMount.current) {
      didMount.current = true;
      lastRefreshed.current = pathname;
      return;
    }

    if (lastRefreshed.current === pathname) return;

    lastRefreshed.current = pathname;
    const refreshTimeoutId = window.setTimeout(() => router.refresh(), 250);

    return () => window.clearTimeout(refreshTimeoutId);
  }, [pathname, router]);

  return null;
}
