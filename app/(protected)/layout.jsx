"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AppShellPro from "../../components/AppShellPro";
import AvatarModal from "../../components/AvatarModal";
import FakeNotifications from "../../components/FakeNotifications";
import { ensureUserBootstrap, signOut, getErrorMessage } from "@/lib/api";

export default function ProtectedLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [boot, setBoot] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;

    (async () => {
      setLoading(true);

      try {
        const b = await ensureUserBootstrap();
        if (cancel) return;

        setBoot(b);

        const user = b?.user || null;
        const profile = b?.profile || null;

        // Not signed in -> /signin
        if (!user?.$id) {
          const next = pathname || "/overview";
          router.replace(`/signin?next=${encodeURIComponent(next)}`);
          return;
        }

        // Profile should always exist (your ensureUserBootstrap creates it),
        // but guard anyway:
        if (!profile) {
          router.replace("/verify-code");
          return;
        }

        // Unverified -> /verify-code
        if (!profile?.verificationCodeVerified) {
          router.replace("/verify-code");
          return;
        }

        // Verified -> allowed
      } catch (e) {
        const msg = getErrorMessage(e, "Unable to load your session.");

        // Only send to debug on real config issue
        if (/database\s*\(db_id\)\s*is not configured/i.test(msg)) {
          router.replace("/debug-appwrite?from=protected&reason=db_missing");
          return;
        }

        const next = pathname || "/overview";
        router.replace( `/signin?next=${encodeURIComponent(next)}` );
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [router, pathname]);

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
    if (loading) return null;
    if (!boot?.user?.$id) return null;
    if (!profile?.verificationCodeVerified) return null;

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
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
  }, [loading, boot?.user?.$id, profile?.verificationCodeVerified, badge, profile, displayName, router]);

  const canRenderChildren =
    !loading && Boolean(boot?.user?.$id) && Boolean(profile?.verificationCodeVerified);

  return (
    <>
      {canRenderChildren ? <FakeNotifications enabled sound /> : null}

      <AppShellPro rightSlot={rightSlot}>
        {canRenderChildren ? (
          children
        ) : (
          <div style={{ padding: 18, color: "rgba(226,232,240,.85)" }}>
            Loading…
          </div>
        )}
      </AppShellPro>
    </>
  );
}
