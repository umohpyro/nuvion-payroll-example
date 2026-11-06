"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-reads the page every few seconds while a transfer is unsettled, for up to two minutes. */
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    let runs = 0;
    const timer = setInterval(() => {
      runs += 1;
      router.refresh();
      if (runs >= 40) clearInterval(timer);
    }, 3000);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}
