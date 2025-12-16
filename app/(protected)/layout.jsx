// app/(protected)/layout.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import AppShellPro from "../../components/AppShellPro";
import AvatarModal from "../../components/AvatarModal";
import { ensureUserBootstrap, signOut } from "../../lib/api";

export default function ProtectedLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [boot, setBoot] = useState(null); // { user, profile }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const b = await ensureUserBootstrap();

        if (cancelled) return;

        // No session -> signin
        if (!b?.user?.$id) {
          router.replace("/signin");
          return;
        }

        // Not verified -> verify-code (but don’t loop if we’re already there)
        const verified = Boolean(b?.profile?.verificationCodeVerified);
        if (!verified && pathname !== "/verify-code") {
          router.replace("/verify-code");
          return;
        }

        setBoot(b);
      } catch {
        if (!cancelled) router.replace("/signin");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  const profile = boot?.profile || null;

  const displayName = useMemo(() => {
    const pName = profile?.fullName?.trim();
    const uName = boot?.user?.name?.trim();
    const emailName = boot?.user?.email?.split("@")?.[0];
    return pName || uName || emailName || "User";
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
        title={ok ? "KYC Approved" : "KYC Not Approved"}
      >
        {ok ? "Verified" : "Unverified"}
      </span>
    );
  }, [profile?.kycStatus]);

  const rightSlot = useMemo(() => {
    // Don’t show header user controls until we’ve confirmed session
    if (loading) return null;
    if (!boot?.user) return null;

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        {badge}
        <AvatarModal profile={{ ...(profile || {}), fullName: displayName }} />
        <button
          className="pillBtn"
          type="button"
          onClick={async () => {
            try {
              await signOut();
            } finally {
              router.replace("/signin");
            }
          }}
        >
          Sign out
        </button>
      </div>
    );
  }, [loading, boot?.user, badge, profile, displayName, router]);

  return <AppShellPro rightSlot={rightSlot}>{children}</AppShellPro>;
}
