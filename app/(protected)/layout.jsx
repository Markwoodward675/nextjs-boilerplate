"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShellPro from "../../components/AppShellPro";
import AvatarModal from "../../components/AvatarModal";
import { ensureUserBootstrap, signOut } from "../../lib/api";

export default function ProtectedLayout({ children }) {
  const router = useRouter();
  const [boot, setBoot] = useState(null); // { user, profile }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;

    (async () => {
      try {
        const b = await ensureUserBootstrap();
        if (!cancel) setBoot(b);
      } catch {
        router.replace("/signin");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [router]);

  const profile = boot?.profile || null;

  const displayName = useMemo(() => {
    return (
      profile?.fullName?.trim() ||
      boot?.user?.name?.trim() ||
      boot?.user?.email?.split("@")?.[0] ||
      "User"
    );
  }, [profile?.fullName, boot?.user?.name, boot?.user?.email]);

  const badge = useMemo(() => {
    const ok = String(profile?.kycStatus || "").toLowerCase() === "approved";
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

  const rightSlot = useMemo(() => {
    if (loading) return null; // prevents flicker + duplicate “U” placeholder moments
    if (!boot?.user) return null;

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {badge}
        <AvatarModal profile={{ ...(profile || {}), fullName: displayName }} />
        <button
          className="pillBtn"
          onClick={async () => {
            await signOut();
            router.replace("/signin");
          }}
          type="button"
        >
          Sign out
        </button>
      </div>
    );
  }, [loading, boot?.user, badge, profile, displayName, router]);

  return <AppShellPro rightSlot={rightSlot}>{children}</AppShellPro>;
}
