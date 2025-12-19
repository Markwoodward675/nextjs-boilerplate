"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "../../lib/api";

export default function SignoutPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("Signing you out…");

  useEffect(() => {
    (async () => {
      try {
        await signOut();
        setMsg("Signed out. Redirecting…");
      } finally {
        router.replace("/signin");
      }
    })();
  }, [router]);

  return (
    <div className="dt-shell" style={{ paddingTop: 26 }}>
      <div className="contentCard">
        <div className="contentInner">
          <div className="card">
            <div className="cardTitle">Sign out</div>
            <div className="cardSub" style={{ marginTop: 6 }}>{msg}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
