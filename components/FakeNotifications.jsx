// components/FakeNotifications.jsx
"use client";

import { useEffect, useRef, useState } from "react";

const NOTIFICATIONS = [
  {
    country: "United States",
    city: "New York",
    text: "invested",
    amount: "1.2k",
    currency: "USD",
  },
  {
    country: "United Kingdom",
    city: "London",
    text: "withdrew",
    amount: "450",
    currency: "GBP",
  },
  {
    country: "Nigeria",
    city: "Lagos",
    text: "deposited",
    amount: "300",
    currency: "USD",
  },
  {
    country: "Germany",
    city: "Berlin",
    text: "bought a gift card",
    amount: "150",
    currency: "EUR",
  },
  {
    country: "United Arab Emirates",
    city: "Dubai",
    text: "earned affiliate commission",
    amount: "85",
    currency: "USD",
  },
];

export default function FakeNotifications() {
  const [item, setItem] = useState(null);
  const [visible, setVisible] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    audioRef.current = new Audio("/sounds/notification.mp3");
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const pick =
        NOTIFICATIONS[Math.floor(Math.random() * NOTIFICATIONS.length)];
      setItem(pick);
      setVisible(true);

      // play sound if allowed by browser
      if (audioRef.current) {
        audioRef.current
          .play()
          .catch(() => {
            // ignore autoplay errors
          });
      }

      const hideTimer = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(hideTimer);
    }, 13000); // every ~13s

    return () => clearInterval(interval);
  }, []);

  if (!item || !visible) return null;

  return (
    <div className="fixed bottom-20 left-4 z-40 max-w-xs">
      <div className="rounded-2xl bg-slate-950/90 border border-slate-700/80 px-3 py-2 shadow-lg backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-[11px] font-semibold text-slate-950">
            ⚡
          </div>
          <div className="text-[11px] leading-tight text-slate-100">
            <div className="font-medium">
              {item.city}, {item.country}
            </div>
            <div className="text-slate-300">
              just {item.text}{" "}
              <span className="font-semibold">
                {item.amount} {item.currency}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
