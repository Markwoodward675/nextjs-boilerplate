"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "../../lib/api";

export default function SignoutPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        await signOut();
      } finally {
        router.replace("/signin");
      }
    })();
  }, [router]);

  return (
    <div className="dt-shell" style={{ paddingTop: 28 }}>
      <div className="contentCard">
        <div className="contentInner">
          <div className="card">
            <div className="cardTitle">Signing you out…</div>
            <div className="cardSub" style={{ marginTop: 6 }}>Please wait.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
