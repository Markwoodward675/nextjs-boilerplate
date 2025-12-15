"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "../../../lib/api";

export default function SignoutPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      await signOut();
      router.replace("/signin");
    })();
  }, [router]);

  return (
    <div className="page-bg">
      <div className="shell">
        <div className="contentCard">
          <div className="contentInner">
            <div className="card">
              <div className="cardTitle">Signing out</div>
              <div className="cardSub">Redirecting…</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
