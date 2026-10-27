"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const VISITOR_STORAGE_KEY = "feria-analytics-visitor-id";

function getVisitorId() {
  try {
    const storedId = window.localStorage.getItem(VISITOR_STORAGE_KEY);
    if (storedId) return storedId;

    const visitorId = window.crypto.randomUUID();
    window.localStorage.setItem(VISITOR_STORAGE_KEY, visitorId);
    return visitorId;
  } catch (error) {
    console.error("No fue posible guardar el identificador anónimo:", error);
    return window.crypto.randomUUID();
  }
}

export default function PageAnalyticsTracker() {
  const pathname = usePathname();
  const previousPathname = useRef<string | null>(null);

  useEffect(() => {
    if (
      pathname === "/admin" ||
      pathname.startsWith("/admin/") ||
      previousPathname.current === pathname
    ) {
      return;
    }

    const isInitialPageLoad = previousPathname.current === null;
    previousPathname.current = pathname;

    const loadMs = isInitialPageLoad
      ? Math.min(60_000, Math.round(window.performance.now()))
      : null;

    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: getVisitorId(),
        path: pathname,
        loadMs,
      }),
      keepalive: true,
    })
      .then(async (response) => {
        if (response.ok) return;
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? "No fue posible registrar la visita.");
      })
      .catch((error: unknown) => {
        console.error("No fue posible registrar las métricas de página:", error);
      });
  }, [pathname]);

  return null;
}
