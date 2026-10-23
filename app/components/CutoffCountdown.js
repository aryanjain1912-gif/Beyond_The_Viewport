"use client";

import { useEffect, useState } from "react";

function getRemaining(cutoffAt) {
  const milliseconds = new Date(cutoffAt).getTime() - Date.now();
  if (milliseconds <= 0) return null;
  const seconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export default function CutoffCountdown({ cutoffAt }) {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    const update = () => setRemaining(getRemaining(cutoffAt));
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, [cutoffAt]);

  return <span>{remaining ? `${remaining} remaining` : "Cutoff passed"}</span>;
}
