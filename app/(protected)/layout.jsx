"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShellPro from "../../components/AppShellPro";
import AvatarModal from "../../components/AvatarModal";
import { ensureUserBootstrap, signOut } from "../../lib/api";

export default function ProtectedLayout({ children }) {
  const router = useRouter();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const { profile: p } = await ensureUserBootstrap();
        if (!cancel) setProfile(p);
      } catch {
        router.replace("/signin");
      }
    })();
    return () => (cancel = true);
  }, [router]);

  const badge = useMemo(() => {
    const ok = profile?.kycStatus === "approved";
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

  return (
    <AppShellPro
      rightSlot={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {badge}
          <AvatarModal profile={profile} />
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
