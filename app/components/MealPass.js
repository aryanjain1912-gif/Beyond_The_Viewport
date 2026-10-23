"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function MealPass({ mealSlotId, mealDate }) {
  const [pass, setPass] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function generatePass() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meal_slot_id: mealSlotId, meal_date: mealDate }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Could not generate this meal pass.");
        return;
      }
      setPass(result);
    } catch {
      setError("Could not connect to the refectory server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="pass-card">
      <div className="pass-topline">
        <div><p className="section-kicker">YOUR REFECTORY PASS</p><h2>Meal pass</h2></div>
        {pass && <span className="pass-status"><i /> READY</span>}
      </div>
      {pass ? (
        <>
          <div className="pass-main">
            <div className="qr-frame"><QRCodeSVG value={pass.token} size={160} level="H" includeMargin /></div>
            <div className="pass-info">
              <span className="pass-meal">{pass.meal.toUpperCase()} · {mealDate}</span>
              <strong>{pass.time}</strong>
              <span className="pass-id">EXPIRES <b>{new Date(pass.expires_at).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" })}</b></span>
              <button className="text-button pass-refresh" type="button" onClick={generatePass} disabled={pending}>
                {pending ? "Refreshing…" : "Refresh pass"}
              </button>
            </div>
          </div>
          <p className="pass-note">This one-use code is private. Show it to refectory staff only.</p>
        </>
      ) : (
        <div className="pass-empty">
          <div className="pass-placeholder" aria-hidden="true">◈</div>
          <p>A one-use pass is generated for a confirmed booking.</p>
          <button className="button button-primary" onClick={generatePass} disabled={pending}>
            {pending ? "Generating…" : "Generate meal pass"}
          </button>
          {error && <p className="inline-feedback error" role="alert">{error}</p>}
        </div>
      )}
    </section>
  );
}
