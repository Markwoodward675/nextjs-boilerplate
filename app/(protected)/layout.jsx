"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShellPro from "../../components/AppShellPro";
import AvatarModal from "../../components/AvatarModal";
import { getCurrentUser, getUserProfile } from "../../lib/api";

export default function ProtectedLayout({ children }) {
  const router = useRouter();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const u = await getCurrentUser();
        if (!u) return router.replace("/signin");
        const p = await getUserProfile(u.$id).catch(() => null);
        if (!cancel) setProfile(p);
      } catch {
        // let pages handle errors
      }
    })();
    return () => {
      cancel = true;
    };
  }, [router]);

  return (
    <AppShellPro rightSlot={<AvatarModal profile={profile} />}>
      {children}
    </AppShellPro>
  );
}
