"use client";

import { useEffect, useState } from "react";
import Card from "../../components/Card";

const DEFAULT_ALERTS = {
  price: {
    enabled: true,
    asset: "BTCUSDT",
    direction: "above",
    level: "100000"
  },
  risk: {
    enabled: true,
    maxDailyLoss: "3",
    maxWeeklyLoss: "10"
  },
  payout: {
    enabled: false,
    frequency: "monthly",
    minBalance: "2000"
  }
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(DEFAULT_ALERTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("daytrader_alerts");
      if (raw) {
        setAlerts(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  }, []);

  function updateAlerts(partial) {
    setAlerts((prev) => ({ ...prev, ...partial }));
    setSaved(false);
  }

  function saveAlerts() {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "daytrader_alerts",
      JSON.stringify(alerts)
    );
    setSaved(true);
  }

  return (
    <main className="space-y-4 pb-10">
      <Card>
        <h1 className="text-sm font-semibold text-slate-100">
          Alerts & risk controls
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Configure price alerts, risk limits, and payout rules so your
          decisions are pre-planned instead of impulsive.
        </p>
      </Card>

      {/* Price alerts */}
      <Card>
        <h2 className="text-sm font-semibold text-slate-100">
          Price alerts
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Get notified when key assets break through levels you care about.
          Wire this into your own notification system or provider.
        </p>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <label className="flex items-center gap-2 text-slate-300">
            <input
              type="checkbox"
              checked={alerts.price.enabled}
              onChange={(e) =>
                updateAlerts({
                  price: {
                    ...alerts.price,
                    enabled: e.target.checked
                  }
                })
              }
            />
            Enable price alerts
          </label>
          <div>
            <p className="text-[11px] text-slate-500 mb-1">Asset</p>
            <input
              type="text"
              value={alerts.price.asset}
              onChange={(e) =>
                updateAlerts({
                  price: { ...alerts.price, asset: e.target.value }
                })
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 mb-1">Direction</p>
            <select
              value={alerts.price.direction}
              onChange={(e) =>
                updateAlerts({
                  price: {
                    ...alerts.price,
                    direction: e.target.value
                  }
                })
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="above">Crosses above</option>
              <option value="below">Crosses below</option>
            </select>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 mb-1">Price level</p>
            <input
              type="number"
              value={alerts.price.level}
              onChange={(e) =>
                updateAlerts({
                  price: { ...alerts.price, level: e.target.value }
                })
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </Card>

      {/* Risk alerts */}
      <Card>
        <h2 className="text-sm font-semibold text-slate-100">
          Risk limits
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Define how much drawdown you are willing to tolerate per day and week
          before you automatically stand aside.
        </p>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <label className="flex items-center gap-2 text-slate-300">
            <input
              type="checkbox"
              checked={alerts.risk.enabled}
              onChange={(e) =>
                updateAlerts({
                  risk: {
                    ...alerts.risk,
                    enabled: e.target.checked
                  }
                })
              }
            />
            Enforce risk alerts
          </label>
          <div>
            <p className="text-[11px] text-slate-500 mb-1">
              Max daily loss (% of equity)
            </p>
            <input
              type="number"
              value={alerts.risk.maxDailyLoss}
              onChange={(e) =>
                updateAlerts({
                  risk: {
                    ...alerts.risk,
                    maxDailyLoss: e.target.value
                  }
                })
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 mb-1">
              Max weekly loss (% of equity)
            </p>
            <input
              type="number"
              value={alerts.risk.maxWeeklyLoss}
              onChange={(e) =>
                updateAlerts({
                  risk: {
                    ...alerts.risk,
                    maxWeeklyLoss: e.target.value
                  }
                })
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </Card>

      {/* Payout alerts */}
      <Card>
        <h2 className="text-sm font-semibold text-slate-100">
          Payout alerts
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Use payout rules to remind yourself to take profits out of the
          account instead of constantly recycling everything into new risk.
        </p>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <label className="flex items-center gap-2 text-slate-300">
            <input
              type="checkbox"
              checked={alerts.payout.enabled}
              onChange={(e) =>
                updateAlerts({
                  payout: {
                    ...alerts.payout,
                    enabled: e.target.checked
                  }
                })
              }
            />
            Enable payout reminders
          </label>
          <div>
            <p className="text-[11px] text-slate-500 mb-1">
              Frequency
            </p>
            <select
              value={alerts.payout.frequency}
              onChange={(e) =>
                updateAlerts({
                  payout: {
                    ...alerts.payout,
                    frequency: e.target.value
                  }
                })
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 mb-1">
              Minimum account balance (USD)
            </p>
            <input
              type="number"
              value={alerts.payout.minBalance}
              onChange={(e) =>
                updateAlerts({
                  payout: {
                    ...alerts.payout,
                    minBalance: e.target.value
                  }
                })
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </Card>

      <button
        onClick={saveAlerts}
        className="rounded-full bg-blue-600 px-5 py-2 text-xs font-medium text-white hover:bg-blue-500"
      >
        Save alert preferences
      </button>
      {saved && (
        <p className="text-[11px] text-emerald-400 mt-1">
          Alert preferences saved locally for this browser.
        </p>
      )}
    </main>
  );
}
