"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "../../lib/api";

export default function SignoutPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("Signing you out…");

  useEffect(() => {
    let done = false;
    (async () => {
      try {
        await signOut();
        if (!done) setMsg("Signed out. Redirecting…");
      } catch {
        // even if session delete fails, still redirect
      } finally {
        if (!done) router.replace("/signin");
      }
    })();

    return () => {
      done = true;
    };
  }, [router]);

  return <div className="cardSub">{msg}</div>;
}
