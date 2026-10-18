"use client";

import { useEffect } from "react";

// Registers the small service worker that makes Bilva installable.
export default function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installing is a bonus; the app works without it.
    });
  }, []);
  return null;
}
