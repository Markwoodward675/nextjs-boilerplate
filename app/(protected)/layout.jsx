"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShellPro from "../../components/AppShellPro";
import AvatarModal from "../../components/AvatarModal";
import { ensureUserBootstrap, signOut } from "../../lib/api";

export default function ProtectedLayout({ children }) {
  const router = useRouter();
  const [boot, setBoot] = useState(null); // { user, profile }

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const b = await ensureUserBootstrap();
        if (!cancel) setBoot(b);
      } catch {
        router.replace("/signin");
      }
    })();
    return () => (cancel = true);
  }, [router]);

  const profile = boot?.profile || null;

  const badge = useMemo(() => {
    const ok = (profile?.kycStatus || "").toLowerCase() === "approved";
    return (
      <span
        className="pillBtn"
        style={{
          borderColor: ok ? "rgba(16,185,129,.55)" : "rgba(244,63,94,.45)",
          background: ok ? "rgba(16,185,129,.10)" : "rgba(244,63,94,.10)",
        }}
      >
        {ok ? "Verified" : "Unverified"}
      </span>
    );
  }, [profile?.kycStatus]);

  // ✅ stable displayName fallback
  const displayName = useMemo(() => {
    return (
      profile?.fullName?.trim() ||
      boot?.user?.name?.trim() ||
      boot?.user?.email?.split("@")?.[0] ||
      "User"
    );
  }, [profile?.fullName, boot?.user?.name, boot?.user?.email]);

  return (
    <AppShellPro
      rightSlot={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {badge}
          <AvatarModal profile={{ ...(profile || {}), fullName: displayName }} />
          <button
            className="pillBtn"
            onClick={async () => {
              await signOut();
              router.replace("/signin");
            }}
          >
            Sign out
          </button>
        </div>
      }
    >
      {children}
    </AppShellPro>
  );
}
