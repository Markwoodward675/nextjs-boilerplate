"use client";

import { useEffect, useMemo, useState } from "react";
import { Query } from "appwrite";
import { db, DB_ID, COL, storage, BUCKET_ID, errMsg, requireSession } from "../../../lib/appwriteClient";

function fileViewUrl(fileId) {
  if (!fileId) return "";
  try {
    return storage.getFileView(BUCKET_ID, fileId).href;
  } catch {
    return "";
  }
}

export default function WalletPage() {
  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [tx, setTx] = useState([]);
  const [profileDoc, setProfileDoc] = useState(null);
  const [err, setErr] = useState("");
  const [showAvatar, setShowAvatar] = useState(false);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const u = await requireSession();
        if (dead) return;
        setUser(u);

        const [w, t, p] = await Promise.all([
          db.listDocuments(DB_ID, COL.WALLETS, [Query.equal("userId", u.$id), Query.limit(50)]),
          db.listDocuments(DB_ID, COL.TX, [Query.equal("userId", u.$id), Query.orderDesc("transactionDate"), Query.limit(250)]),
          db.getDocument(DB_ID, COL.USER_PROFILE, u.$id).catch(() => null),
        ]);

        if (!dead) {
          setWallets(w.documents || []);
          setTx(t.documents || []);
          setProfileDoc(p);
        }
      } catch (e) {
        if (!dead) setErr(errMsg(e, "Unable to load wallet."));
      }
    })();
    return () => (dead = true);
  }, []);

  const total = useMemo(
    () => (wallets || []).reduce((s, w) => s + Number(w.balance || 0), 0),
    [wallets]
  );

  const avatarUrl = fileViewUrl(profileDoc?.profileImageFileId);

  return (
    <div className="dt-shell" style={{ paddingTop: 18, paddingBottom: 30 }}>
      <div className="dt-card dt-glow">
        <div className="dt-h2">Wallets</div>
        <div className="dt-subtle">Debit / credit style wallet cards + full transaction history.</div>
      </div>

      {err ? <div className="dt-flash dt-flash-err" style={{ marginTop: 12 }}>{err}</div> : null}

      <div className="dt-grid" style={{ marginTop: 14 }}>
        <div className="dt-card dt-walletCard">
          <div className="dt-walletTop">
            <div>
              <div className="dt-k">Total Balance</div>
              <div className="dt-money">${total.toLocaleString()}</div>
            </div>

            <button
              type="button"
              className="dt-avatarBtn"
              onClick={() => setShowAvatar(true)}
              aria-label="Open profile picture"
              title="Profile picture"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="dt-avatarImg" />
              ) : (
                <div className="dt-avatarFallback">{(user?.email || "U").slice(0, 1).toUpperCase()}</div>
              )}
            </button>
          </div>

          <div className="dt-walletStrip">
            {(wallets || []).slice(0, 3).map((w) => (
              <div key={w.$id} className="dt-miniWallet">
                <div className="dt-miniTitle">{String(w.currencyType || "Wallet").toUpperCase()}</div>
                <div className="dt-miniAmt">${Number(w.balance || 0).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="dt-card">
          <div className="dt-h3">Wallet Records</div>
          <div className="dt-subtle">Balances are updated by Admin actions and transaction approvals.</div>
        </div>
      </div>

      <div className="dt-card" style={{ marginTop: 14 }}>
        <div className="dt-h3">Transaction History</div>
        {tx?.length ? (
          <div className="dt-list" style={{ marginTop: 8 }}>
            {tx.map((t) => (
              <div key={t.$id} className="dt-row">
                <div>
                  <div className="dt-row-title">{t.transactionType}</div>
                  <div className="dt-row-sub">
                    {new Date(t.transactionDate).toLocaleString()} • {t.currencyType}
                  </div>
                </div>
                <div className="dt-row-right">
                  <div className="dt-row-amt">${Number(t.amount || 0).toLocaleString()}</div>
                  <div className="dt-row-sub">{t.status || "pending"}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="dt-subtle">No transaction history yet.</div>
        )}
      </div>

      {showAvatar ? (
        <div className="dt-modalBack" onClick={() => setShowAvatar(false)}>
          <div className="dt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dt-h3">Profile Picture</div>
            <div style={{ marginTop: 10 }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile preview" className="dt-avatarPreview" />
              ) : (
                <div className="dt-subtle">No profile picture uploaded yet.</div>
              )}
            </div>
            <button className="dt-btn" style={{ marginTop: 14 }} onClick={() => setShowAvatar(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
