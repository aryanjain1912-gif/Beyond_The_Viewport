"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

const QUEUE_KEY = "mystic-sanctum-offline-scans-v1";
const EMPTY_QUEUE = [];
let cachedQueueValue = null;
let cachedQueue = EMPTY_QUEUE;

function readQueue() {
  try {
    const saved = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function getQueueSnapshot() {
  const value = localStorage.getItem(QUEUE_KEY);
  if (value !== cachedQueueValue) {
    cachedQueueValue = value;
    try {
      const parsed = JSON.parse(value ?? "[]");
      cachedQueue = Array.isArray(parsed) ? parsed : EMPTY_QUEUE;
    } catch {
      cachedQueue = EMPTY_QUEUE;
    }
  }
  return cachedQueue;
}

function subscribeToQueue(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener("sanctum-queue-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("sanctum-queue-change", callback);
  };
}

function writeQueue(queue) {
  const value = JSON.stringify(queue);
  localStorage.setItem(QUEUE_KEY, value);
  cachedQueueValue = value;
  cachedQueue = queue;
  window.dispatchEvent(new Event("sanctum-queue-change"));
}

export default function MealScanner({ offlineOnly = false }) {
  const queue = useSyncExternalStore(subscribeToQueue, getQueueSnapshot, () => EMPTY_QUEUE);
  const [cameraError, setCameraError] = useState("");
  const [cameraStatus, setCameraStatus] = useState("starting");
  const [message, setMessage] = useState("");
  const [failedToken, setFailedToken] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [pending, setPending] = useState(false);
  const scanning = useRef(false);
  const handledTokens = useRef(new Set());

  const processToken = useCallback(async (value, retry = false) => {
    const token = value.trim();
    if (!token || scanning.current || (handledTokens.current.has(token) && !retry)) return;
    scanning.current = true;
    handledTokens.current.add(token);
    setPending(true);
    setMessage("");
    setFailedToken("");

    if (offlineOnly) {
      try {
        const current = readQueue();
        if (!current.some((entry) => entry.token === token)) {
          writeQueue([...current, { id: crypto.randomUUID(), token, scanned_at: new Date().toISOString(), status: "queued" }]);
        }
        handledTokens.current.add(token);
        setMessage("Scan queued on this device. It will be verified when you reconnect and sign in.");
      } catch {
        setMessage("Browser storage is unavailable. This offline scan was not saved.");
      } finally {
        setPending(false);
        scanning.current = false;
      }
      return;
    }

    try {
      const response = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "The pass could not be verified.");
        setFailedToken(token);
        return;
      }
      setMessage(`${result.student_name} · ${result.meal} checked in.`);
    } catch {
      try {
        const current = readQueue();
        if (!current.some((entry) => entry.token === token)) {
          writeQueue([...current, { id: crypto.randomUUID(), token, scanned_at: new Date().toISOString(), status: "queued" }]);
        }
        setMessage("Network unavailable. Scan saved on this device for verification after reconnecting.");
      } catch {
        setMessage("The server could not be reached and browser storage is unavailable, so this scan was not saved.");
      }
    } finally {
      setPending(false);
      scanning.current = false;
    }
  }, [offlineOnly]);

  useEffect(() => {
    if (offlineOnly) return undefined;
    let scanner;
    let active = true;

    async function startCamera() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!active) return;
        scanner = new Html5Qrcode("sanctum-qr-reader");
        const config = { fps: 10, qrbox: { width: 230, height: 230 }, aspectRatio: 1 };
        const onScanSuccess = (decodedText) => processToken(decodedText);
        const onScanFailure = () => {};
        try {
          await scanner.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure);
        } catch (facingModeError) {
          if (!active) return;
          const cameras = await Html5Qrcode.getCameras();
          const rearCamera = cameras.find(({ label }) => /back|rear|environment|world/i.test(label));
          const fallbackCamera = rearCamera ?? cameras[0];
          if (!fallbackCamera) throw facingModeError;
          try {
            await scanner.start(fallbackCamera.id, config, onScanSuccess, onScanFailure);
          } catch (fallbackError) {
            const preferredError = facingModeError instanceof Error ? facingModeError.message : String(facingModeError);
            const alternateError = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
            throw new Error(`Camera start failed: ${preferredError}. Alternate camera failed: ${alternateError}`);
          }
        }
        if (active) {
          setCameraError("");
          setCameraStatus("ready");
        } else if (scanner.isScanning) {
          await scanner.stop();
        }
      } catch (error) {
        if (active) {
          setCameraStatus("error");
          setCameraError(error instanceof Error ? error.message : "Camera could not start.");
        }
      }
    }

    startCamera();
    return () => {
      active = false;
      if (scanner?.isScanning) {
        scanner.stop().catch((error) => console.error("Could not stop meal-pass camera.", error));
      }
    };
  }, [offlineOnly, processToken]);

  async function syncQueue() {
    let current;
    try {
      current = readQueue().filter((entry) => entry.status === "queued");
    } catch {
      setMessage("Browser storage is unavailable. The scan queue could not be read.");
      return;
    }
    if (!current.length) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/check-in/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scans: current.map(({ token, scanned_at }) => ({ token, scanned_at })) }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "The offline scans could not be synchronized.");
        return;
      }
      const rejected = result.results.filter((entry) => !entry.accepted);
      const acceptedCount = result.results.length - rejected.length;
      const updated = [
        ...readQueue().filter((entry) => !current.some((scan) => scan.token === entry.token)),
        ...rejected.map((entry) => ({
          id: crypto.randomUUID(),
          token: entry.token,
          scanned_at: entry.scanned_at,
          status: "rejected",
          reason: entry.error,
        })),
      ];
      try {
        writeQueue(updated);
        setMessage(`${acceptedCount} scan${acceptedCount === 1 ? "" : "s"} verified${rejected.length ? `; ${rejected.length} rejected` : ""}.`);
      } catch {
        setMessage(`${acceptedCount} scans were verified, but browser storage could not update the local queue. Refresh this page before retrying.`);
      }
    } catch {
      setMessage("Could not reach the server. The queued scans are still saved on this device.");
    } finally {
      setPending(false);
    }
  }

  function removeRejected(id) {
    writeQueue(readQueue().filter((entry) => entry.id !== id));
  }

  return (
    <section className="surface-card scanner-card">
      <div className="section-title-row">
        <div><p className="section-kicker">{offlineOnly ? "DEVICE-ONLY MODE" : "LIVE COUNTER"}</p><h2>{offlineOnly ? "Offline scan queue" : "Scan a meal pass"}</h2></div>
        {!offlineOnly && <span className={`live-label${cameraStatus === "error" ? " camera-unavailable" : ""}`}><i /> {cameraStatus === "ready" ? "CAMERA READY" : cameraStatus === "error" ? "CAMERA UNAVAILABLE" : "STARTING CAMERA"}</span>}
      </div>
      {!offlineOnly && <div className="scanner-window"><div id="sanctum-qr-reader" /></div>}
      {!offlineOnly && cameraStatus !== "error" && <p className="scanner-guidance">Allow camera access, then center the student&apos;s meal pass QR code in the frame.</p>}
      {cameraError && <p className="form-feedback error" role="alert">{cameraError}</p>}
      <form className="manual-scan-form" onSubmit={(event) => { event.preventDefault(); processToken(manualToken, true); setManualToken(""); }}>
        <label htmlFor="manual-token">Or enter the pass code</label>
        <div><input id="manual-token" value={manualToken} onChange={(event) => setManualToken(event.target.value)} placeholder="MS1.…" autoComplete="off" /><button className="button button-primary" type="submit" disabled={pending || !manualToken.trim()}>Verify</button></div>
      </form>
      {message && (
        <div className={`form-feedback scanner-result${failedToken ? " error" : ""}`} role={failedToken ? "alert" : "status"}>
          <span>{message}</span>
          {failedToken && <button className="text-button" type="button" onClick={() => processToken(failedToken, true)} disabled={pending}>Try this pass again</button>}
        </div>
      )}
      <div className="queue-heading">
        <div><h3>Saved scans <span>{queue.filter((entry) => entry.status === "queued").length}</span></h3><p>Offline entries are not confirmed until the server accepts them.</p></div>
        {!offlineOnly && <button className="button button-quiet" type="button" disabled={pending || !queue.some((entry) => entry.status === "queued")} onClick={syncQueue}>{pending ? "Syncing…" : "Sync queue"}</button>}
      </div>
      {queue.length > 0 && (
        <ul className="scan-queue">
          {queue.map((entry) => (
            <li key={entry.id}>
              <span><strong>{entry.status === "queued" ? "WAITING FOR SERVER" : "REJECTED"}</strong><small>{new Date(entry.scanned_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</small></span>
              {entry.reason && <span className="queue-error">{entry.reason}</span>}
              {entry.status === "rejected" && <button className="text-button" type="button" onClick={() => removeRejected(entry.id)}>Dismiss</button>}
            </li>
          ))}
        </ul>
      )}
      <p className="field-hint">Offline scans are stored in this browser&apos;s local storage and remain pending until checked by the server.</p>
    </section>
  );
}
