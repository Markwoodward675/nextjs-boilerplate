"use client";

import { useEffect, useMemo, useState } from "react";
import { Query } from "appwrite";
import { db, DB_ID, COL, errMsg, requireSession } from "../../../lib/appwriteClient";

const CURRENCIES = ["ALL", "USD", "EUR", "JPY", "GBP"];
const TYPES = [
  "ALL",
  "deposit",
  "withdraw",
  "transfer",
  "refund",
  "invest",
  "trade",
  "giftcard_buy",
  "giftcard_sell",
  "admin_adjustment",
  "commission",
];

export default function TransactionsPage() {
  const [user, setUser] = useState(null);
  const [docs, setDocs] = useState([]);

  const [type, setType] = useState("ALL");
  const [currency, setCurrency] = useState("ALL");
  const [q, setQ] = useState("");

  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");

  const load = async (uid) => {
    setBusy(true);
    setErr("");

    try {
      const queries = [
        Query.equal("userId", uid),
        Query.orderDesc("transactionDate"),
        Query.limit(200),
      ];

      if (type !== "ALL") queries.push(Query.equal("transactionType", type));
      if (currency !== "ALL") queries.push(Query.equal("currencyType", currency));

      const res = await db.listDocuments(DB_ID, COL.TX, queries);
      setDocs(res.documents || []);
    } catch (e) {
      setErr(errMsg(e, "Unable to load transactions."));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const u = await requireSession();
        if (dead) return;
        setUser(u);
        await load(u.$id);
      } catch (e) {
        if (!dead) setErr(errMsg(e, "We couldn’t confirm your session. Please sign in again."));
      }
    })();
    return () => (dead = true);
  }, []);

  useEffect(() => {
    if (!user?.$id) return;
    load(user.$id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, currency]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return docs;

    return (docs || []).filter((t) => {
      const meta = t.meta || "";
      return (
        String(t.transactionType || "").toLowerCase().includes(needle) ||
        String(t.currencyType || "").toLowerCase().includes(needle) ||
        String(t.status || "").toLowerCase().includes(needle) ||
        String(t.transactionId || "").toLowerCase().includes(needle) ||
        String(meta).toLowerCase().includes(needle)
      );
    });
  }, [docs, q]);

  return (
    <div className="dt-shell" style={{ paddingTop: 18, paddingBottom: 30 }}>
      <div className="dt-card dt-glow">
        <div className="dt-h2">Transactions</div>
        <div className="dt-subtle">All records: deposits, withdrawals, investments, trading intents, commissions, and admin adjustments.</div>
      </div>

      {err ? <div className="dt-flash dt-flash-err" style={{ marginTop: 12 }}>{err}</div> : null}

      <div className="dt-card" style={{ marginTop: 14 }}>
        <div className="dt-grid" style={{ gap: 10 }}>
          <div className="dt-form" style={{ margin: 0 }}>
            <label className="dt-label">Type</label>
            <select className="dt-input" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="dt-form" style={{ margin: 0 }}>
            <label className="dt-label">Currency</label>
            <select className="dt-input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="dt-form" style={{ margin: 0 }}>
            <label className="dt-label">Search</label>
            <input className="dt-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="status, id, meta…" />
          </div>
        </div>
      </div>

      <div className="dt-card" style={{ marginTop: 14 }}>
        <div className="dt-h3">History</div>

        {busy ? (
          <div className="dt-subtle" style={{ marginTop: 8 }}>Loading…</div>
        ) : filtered?.length ? (
          <div className="dt-list" style={{ marginTop: 8 }}>
            {filtered.map((t) => {
              const meta = safeJSON(t.meta);
              return (
                <div key={t.$id} className="dt-row">
                  <div>
                    <div className="dt-row-title">
                      {t.transactionType} • {t.currencyType} • ${Number(t.amount || 0).toLocaleString()}
                    </div>
                    <div className="dt-row-sub">
                      {new Date(t.transactionDate).toLocaleString()} • {t.status || "—"} • {t.transactionId}
                    </div>
                    {Object.keys(meta).length ? (
                      <div className="dt-row-sub" style={{ marginTop: 6, opacity: 0.9 }}>
                        <span className="dt-mono">{JSON.stringify(meta)}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="dt-row-right">
                    <div className="dt-pill">{(t.status || "pending").toUpperCase()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="dt-subtle" style={{ marginTop: 8 }}>No transactions found.</div>
        )}
      </div>
    </div>
  );
}

function safeJSON(s) {
  try { return JSON.parse(s || "{}"); } catch { return {}; }
}
