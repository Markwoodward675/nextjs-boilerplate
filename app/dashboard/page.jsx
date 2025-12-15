"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureUserBootstrap, getUserAlerts, getErrorMessage } from "../../lib/api";

export default function DashboardPage() {
  const router = useRouter();

  const [boot, setBoot] = useState(null); // { user, profile }
  const [alerts, setAlerts] = useState([]);

  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");

  // quick derived values
  const displayName = useMemo(() => {
    const p = boot?.profile;
    const u = boot?.user;
    return (
      p?.fullName?.trim() ||
      u?.name?.trim() ||
      u?.email?.split("@")?.[0] ||
      "User"
    );
  }, [boot?.profile, boot?.user]);

  const verified = !!boot?.profile?.verificationCodeVerified;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setBusy(true);
      setErr("");

      try {
        const b = await ensureUserBootstrap();
        if (cancelled) return;

        // Must be signed in
        if (!b?.user) {
          router.replace("/signin");
          return;
        }

        // Must verify 6-digit code first
        if (!b?.profile?.verificationCodeVerified) {
          router.replace("/verify-code");
          return;
        }

        setBoot(b);

        // Load alerts (non-blocking)
        try {
          const a = await getUserAlerts(b.user.$id);
          if (!cancelled) setAlerts(Array.isArray(a) ? a : []);
        } catch (e) {
          // Alerts failing shouldn't block dashboard
          if (!cancelled) setAlerts([]);
        }
      } catch (e) {
        if (!cancelled) {
          setErr(getErrorMessage(e, "Unable to load dashboard. Please sign in again."));
          router.replace("/signin");
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (busy && !boot) {
    return <div className="cardSub">Loading…</div>;
  }

  // If boot exists but verification was revoked somehow, gate it
  if (boot && !verified) {
    router.replace("/verify-code");
    return <div className="cardSub">Redirecting to verification…</div>;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <div className="cardTitle">Welcome, {displayName}</div>
        <div className="cardSub" style={{ marginTop: 6 }}>
          Your Day Trader overview is ready. You can access wallets, trade, invest, deposits, withdrawals, and affiliate tools.
        </div>
      </div>

      {err ? <div className="flashError">{err}</div> : null}

      {/* Quick action cards */}
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
        <QuickCard
          title="Wallets"
          sub="View balances & movements."
          href="/wallet"
        />
        <QuickCard
          title="Trade"
          sub="Place simulated trades."
          href="/trade"
        />
        <QuickCard
          title="Invest"
          sub="Long-term portfolio simulation."
          href="/invest"
        />
        <QuickCard
          title="Alerts"
          sub="Notifications & verification codes."
          href="/alerts"
        />
      </div>

      {/* Recent notifications */}
      <div className="card">
        <div className="cardTitle" style={{ fontSize: 14 }}>Recent notifications</div>
        <div className="cardSub" style={{ marginTop: 4 }}>
          Latest platform updates, security notices, and code messages.
        </div>

        <div style={{ marginTop: 10 }}>
          {alerts?.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {alerts.slice(0, 5).map((a) => (
                <div key={a.$id} className="card" style={{ padding: 12 }}>
                  <div className="cardTitle" style={{ fontSize: 13 }}>{a.title || "Notification"}</div>
                  <div className="cardSub" style={{ marginTop: 4 }}>{a.body || ""}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="cardSub" style={{ marginTop: 10 }}>No notifications yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickCard({ title, sub, href }) {
  return (
    <a
      href={href}
      className="card"
      style={{
        textDecoration: "none",
        display: "grid",
        gap: 6,
        border: "1px solid rgba(255,255,255,.08)",
      }}
    >
      <div className="cardTitle" style={{ fontSize: 14 }}>{title}</div>
      <div className="cardSub">{sub}</div>
      <div className="cardSub" style={{ marginTop: 6, opacity: 0.8 }}>
        Open →
      </div>
    </a>
  );
}
