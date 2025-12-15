"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShellPro from "../../components/AppShellPro";
import AvatarModal from "../../components/AvatarModal";
import { getCurrentUser, createUserProfileIfMissing, signOut } from "../../lib/api";

export default function ProtectedLayout({ children }) {
  const router = useRouter();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const u = await getCurrentUser();
      if (!u) return router.replace("/signin");
      const p = await createUserProfileIfMissing(u).catch(() => null);
      if (!cancel) setProfile(p);
    })();
    return () => {
      cancel = true;
    };
  }, [router]);

  const initials = (profile?.displayName || profile?.fullName || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("") || "U";

  return (
    <AppShellPro
      rightSlot={
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AvatarModal profile={profile} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ fontSize: 11, color: "rgba(148,163,184,.95)" }}>
                {profile?.email || ""}
              </div>
              <button
                className="pillBtn"
                onClick={async () => {
                  await signOut();
                  router.replace("/signin");
                }}
              >
                {initials} <span style={{ opacity: 0.8 }}>Sign out</span>
              </button>
            </div>
          </div>
        </>
      }
    >
      {children}
    </AppShellPro>
  );
}
