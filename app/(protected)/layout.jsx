"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShellPro from "../../components/AppShellPro";
import AvatarModal from "../../components/AvatarModal";
import { getCurrentUser, getUserProfile, createUserProfileIfMissing } from "../../lib/api";

export default function ProtectedLayout({ children }) {
  const router = useRouter();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const u = await getCurrentUser();
      if (!u) return router.replace("/signin");

      // Ensure profile exists (docId = user.$id)
      const p = await createUserProfileIfMissing(u).catch(() => null);
      if (!cancel) setProfile(p);
    })();
    return () => {
      cancel = true;
    };
  }, [router]);

  return <AppShellPro rightSlot={<AvatarModal profile={profile} />}>{children}</AppShellPro>;
}
