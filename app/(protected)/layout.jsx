"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AppShellPro from "../../components/AppShellPro";
import AvatarModal from "../../components/AvatarModal";
import FakeNotifications from "../../components/FakeNotifications";
import { ensureUserBootstrap, signOut } from "../../lib/api";

export default function ProtectedLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [boot, setBoot] = useState(null); // { user, profile, wallets? }
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

        // 1) Not signed in -> signin
        if (!user?.$id) {
          router.replace(`/signin?next=${encodeURIComponent(pathname || "/overview")}`);
          return;
        }

        // 2) DB missing (bootstrap can throw, but guard anyway)
        // If your DB env is missing, many pages will fail silently later.
        // Send user to debug page with reason.
        if (!profile) {
          router.replace("/debug-appwrite?from=protected&reason=profile_missing");
          return;
        }

        // 3) Email/code verification gate -> verify page (NOT signin)
        const verified = Boolean(profile?.verificationCodeVerified);
        if (!verified) {
          router.replace("/verify-code");
          return;
        }

        // 4) Allowed -> render children
      } catch (e) {
        // Decide redirect based on error message
        const msg = String(e?.message || e || "");

        if (/database\s*\(db_id\)\s*is not configured/i.test(msg)) {
          router.replace("/debug-appwrite?from=protected&reason=db_missing");
          return;
        }

        // default: treat as unauth / session expired
        router.replace(`/signin?next=${encodeURIComponent(pathname || "/overview")}`);
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
    if (!boot?.user) return null;

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
  }, [loading, boot?.user, badge, profile, displayName, router]);

  // Gate rendering:
  // - while loading -> show shell with nothing (or a tiny loading)
  // - if not verified -> children should not render (we redirect)
  // - if not signed in -> children should not render (we redirect)
  const canRenderChildren =
    !loading && Boolean(boot?.user?.$id) && Boolean(profile?.verificationCodeVerified);

  return (
    <>
      {!loading && boot?.user ? <FakeNotifications enabled sound /> : null}

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
