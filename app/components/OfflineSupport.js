"use client";

import { useEffect } from "react";

export default function OfflineSupport() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Could not register the offline scanner service worker.", error);
      });
    }
  }, []);

  return null;
}
