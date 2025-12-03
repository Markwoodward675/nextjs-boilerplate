// app/auth/signout/page.jsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { logoutUser } from "../../../lib/api";

export default function SignoutPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        await logoutUser();
      } catch (err) {
        console.error("Logout error:", err);
      } finally {
        router.replace("/auth/login");
      }
    })();
  }, [router]);

  return (
    <main className="px-4 pt-6 pb-24 text-xs text-slate-400">
      Signing you out…
    </main>
  );
}
