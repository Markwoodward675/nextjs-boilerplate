"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../../../components/UnverifiedEmailGate";
import MetricStrip from "../../../../components/MetricStrip";
import { getCurrentUser } from "../../../../lib/api";

export default function GiftcardsSellPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const u = await getCurrentUser();
      if (!u) return router.replace("/signin");
      if (cancel) return;
      setMe(u);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [router]);

  const metrics = [
    { label: "Workflow", value: "Submission", sub: "sell request" },
    { label: "Review", value: "Manual", sub: "queue controlled" },
    { label: "Settlement", value: "TBD", sub: "policy" },
    { label: "State", value: "Read-only", sub: "no uploads yet" },
  ];

  if (loading) return <div className="text-sm text-slate-400">Loading sell desk…</div>;
  if (!me) return null;

  return (
    <UnverifiedEmailGate>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Giftcard Sell Desk</h1>
          <p className="text-sm text-slate-400">Submission intake and review routing.</p>
        </div>

        <MetricStrip items={metrics} />

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-sm font-semibold text-slate-200">Submission</div>
          <div className="mt-2 text-sm text-slate-400">
            Next step: add upload + validation + create a transaction record with status routing.
          </div>
          <button
            type="button"
            className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 hover:bg-amber-500/15 transition"
            onClick={() => alert("Next: implement upload + sell request table + admin review.")}
          >
            Create Sell Request
          </button>
        </div>
      </div>
    </UnverifiedEmailGate>
  );
}
