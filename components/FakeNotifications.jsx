"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

/**
 * Format amounts in "k" style.
 * Example: 2100 -> "2.1k"
 */
function formatK(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0";
  if (x < 1000) return String(Math.round(x));
  const k = x / 1000;
  const dp = k < 10 ? 1 : 1; // keep 1dp like examples
  return `${k.toFixed(dp)}k`.replace(/\.0k$/, "k");
}

/**
 * A short, clean "pop" sound using WebAudio (no mp3 needed).
 * Browsers require a user gesture before audio can play; we "arm" on first click/tap.
 */
function createPopPlayer() {
  let ctx = null;

  const ensureCtx = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  };

  const play = async () => {
    try {
      const audioCtx = ensureCtx();
      if (audioCtx.state === "suspended") await audioCtx.resume();

      const t0 = audioCtx.currentTime;

      // oscillator
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(720, t0);
      osc.frequency.exponentialRampToValueAtTime(420, t0 + 0.06);

      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(t0);
      osc.stop(t0 + 0.1);
    } catch {
      // silent fail
    }
  };

  return { play };
}

const CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "JPY", symbol: "¥" },
  { code: "GBP", symbol: "£" },

  // extra “flavor” symbols you requested (display-only)
  { code: "KRW", symbol: "₩" },
  { code: "PHP", symbol: "₱" },
  { code: "RUB", symbol: "₽" },
  { code: "NGN", symbol: "₦" },
  { code: "INR", symbol: "₹" },
];

const EVENTS = [
  { type: "deposit", title: "Deposit confirmed", tone: "success" },
  { type: "withdraw", title: "Withdrawal requested", tone: "warn" },
  { type: "invest", title: "Investment started", tone: "info" },
  { type: "commission", title: "Affiliate commission paid", tone: "success" },
  { type: "affiliate_join", title: "New affiliate signup", tone: "info" },
  { type: "trade", title: "Trade executed", tone: "info" },
  { type: "admin_adjustment", title: "Balance updated", tone: "warn" },
];

function makeFakeMessage() {
  const e = pick(EVENTS);
  const c = pick(CURRENCIES);

  // generate realistic amounts (in base units)
  // we’ll display them in k-form
  const base = clamp(Math.random(), 0.1, 1.0);
  const amt =
    e.type === "withdraw"
      ? Math.round((1500 + base * 65000) / 10) * 10
      : e.type === "commission"
      ? Math.round((900 + base * 12000) / 10) * 10
      : e.type === "invest"
      ? Math.round((2000 + base * 90000) / 10) * 10
      : Math.round((1000 + base * 45000) / 10) * 10;

  const nice = `${c.symbol}${formatK(amt)}`;

  const extras = {
    deposit: `Wallet credited: ${nice}`,
    withdraw: `Request received: ${nice}`,
    invest: `Allocation confirmed: ${nice}`,
    commission: `Commission: ${nice}`,
    affiliate_join: `A new user joined through your link`,
    trade: `Executed: ${nice}`,
    admin_adjustment: `Updated by Admin: ${nice}`,
  };

  return {
    id: crypto.randomUUID(),
    type: e.type,
    tone: e.tone,
    title: e.title,
    body: extras[e.type] || `${nice}`,
    when: Date.now(),
  };
}

export default function FakeNotifications({
  enabled = true,
  sound = true,
  minDelayMs = 6500,
  maxDelayMs = 14000,
  maxToasts = 3,
}) {
  const [toasts, setToasts] = useState([]);
  const [armed, setArmed] = useState(false);

  const player = useMemo(() => (typeof window !== "undefined" ? createPopPlayer() : null), []);
  const timerRef = useRef(null);

  // Arm audio on first user interaction
  useEffect(() => {
    if (!sound) return;
    const arm = () => setArmed(true);
    window.addEventListener("pointerdown", arm, { once: true });
    window.addEventListener("keydown", arm, { once: true });
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
  }, [sound]);

  useEffect(() => {
    if (!enabled) return;

    const schedule = () => {
      const delay =
        Math.floor(minDelayMs + Math.random() * (maxDelayMs - minDelayMs));
      timerRef.current = setTimeout(() => {
        const n = makeFakeMessage();

        setToasts((prev) => {
          const next = [n, ...prev].slice(0, maxToasts);
          return next;
        });

        // Play sound only after arming
        if (sound && armed && player) player.play();

        schedule();
      }, delay);
    };

    schedule();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [enabled, minDelayMs, maxDelayMs, maxToasts, sound, armed, player]);

  // auto-remove each toast
  useEffect(() => {
    if (!toasts.length) return;
    const id = setInterval(() => {
      setToasts((prev) =>
        prev.filter((t) => Date.now() - t.when < 5200)
      );
    }, 500);
    return () => clearInterval(id);
  }, [toasts.length]);

  if (!enabled) return null;

  return (
    <div className="dt-toasts" aria-live="polite" aria-relevant="additions">
      {toasts.map((t) => (
        <div key={t.id} className={`dt-toast dt-toast-${t.tone}`}>
          <div className="dt-toast-title">{t.title}</div>
          <div className="dt-toast-body">{t.body}</div>
        </div>
      ))}
      {/* Optional hint until sound is armed */}
      {sound && !armed ? (
        <div className="dt-toast dt-toast-muted">
          <div className="dt-toast-title">Sound ready</div>
          <div className="dt-toast-body">Tap or click once to enable popup sound.</div>
        </div>
      ) : null}
    </div>
  );
}
