"use client";

import { useEffect } from "react";

/** Marks the document once React has hydrated the tree (used by E2E readiness). */
export function HydrationProbe() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
  }, []);
  return null;
}
