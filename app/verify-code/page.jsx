"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureUserBootstrap } from "../../lib/api";

export default function VerifyCodePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureUserBootstrap()
      .then(({ profile }) => {
        if (profile.verificationCodeVerified) {
          router.replace("/dashboard");
        }
      })
      .catch(() => router.replace("/signin"))
      .finally(() => setLoading(false));
  }, [router]);

  const submit = async () => {
    try {
      setError("");
      const { profile } = await ensureUserBootstrap();

      if (profile.verificationCode !== code) {
        throw new Error("Invalid verification code");
      }

      await databases.updateDocument(
        DB_ID,
        USERS_COLLECTION_ID,
        profile.$id,
        {
          verificationCodeVerified: true,
          updatedAt: new Date().toISOString(),
        }
      );

      router.replace("/dashboard");
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return null;

  return (
    <div className="contentCard">
      <h2 className="cardTitle">Verify your account</h2>
      <p className="cardSub">
        Enter the 6-digit code sent to your email.
      </p>

      {error && <div className="flashError">{error}</div>}

      <input
        className="input"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="6-digit code"
      />

      <button className="btnPrimary" onClick={submit}>
        Verify
      </button>
    </div>
  );
}
