"use client";

import { useEffect, useState } from "react";

const messages = [
  {
    country: "United States",
    city: "Denver",
    text: "deposited",
    amount: "2k",
    currency: "USD"
  },
  {
    country: "United States",
    city: "New York",
    text: "invested",
    amount: "1.2k,
    currency: "USD"
  },
  {
    country: "United Kingdom",
    city: "London",
    text: "withdrew",
    amount: "3.2k",
    currency: "USD"
  },
  {
    country: "Germany",
    city: "Berlin",
    text: "earned",
    amount: "1.7k",
    currency: "USD"
  },
  {
    country: "South Africa",
    city: "Johannesburg",
    text: "bought a gift card",
    amount: "7.5k",
    currency: "USD"
  },
  {
    country: "Canada",
    city: "Toronto",
    text: "funded trading wallet",
    amount: "6.2",
    currency: "USD"
  }
];

export default function FakeNotifications() {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(messages[0]);

  useEffect(() => {
    let timeout;
    let interval;

    function scheduleNext() {
      timeout = setTimeout(() => {
        const idx = Math.floor(Math.random() * messages.length);
        setCurrent(messages[idx]);
        setVisible(true);

        // Hide after a few seconds
        setTimeout(() => setVisible(false), 3500);
      }, 6000 + Math.random() * 7000); // 6–13 seconds
    }

    scheduleNext();

    interval = setInterval(scheduleNext, 16000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-xs">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/95 px-4 py-3 shadow-xl shadow-black/40 text-xs text-slate-100 flex items-start gap-3">
        <div className="mt-0.5 h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-[11px] font-semibold text-slate-950">
          DT
        </div>
        <div>
          <div className="font-semibold">
            Trader from {current.city}, {current.country}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-300">
            just {current.text}{" "}
            <span className="font-semibold">
              {current.amount} {current.currency}
            </span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500">
            Live activity · Day Trader
          </div>
        </div>
      </div>
    </div>
  );
}
