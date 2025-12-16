"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShellPro from "../../components/AppShellPro";
import AvatarModal from "../../components/AvatarModal";
import FakeNotifications from "../../components/FakeNotifications";
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

  // IMPORTANT: do not render rightSlot at all until we have a real user (no placeholder avatar)
  const rightSlot = useMemo(() => {
    if (loading) return null;
    if (!boot?.user) return null;

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {badge}
        <AvatarModal profile={{ ...(profile || {}), fullName: displayName }} />
        <button
          className="pillBtn"
          type="button"
          onClick={async () => {
            await signOut();
            router.replace("/signin");
          }}
        >
          Sign out
        </button>
      </div>
    );
  }, [loading, boot?.user, badge, profile, displayName, router]);

  return (
    <>
      {/* Fake popups only after auth resolves, to avoid SSR/build weirdness */}
      {!loading && boot?.user ? <FakeNotifications enabled sound /> : null}

      <AppShellPro rightSlot={rightSlot}>
        {children}
      </AppShellPro>
    </>
  );
}
