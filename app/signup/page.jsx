import { Suspense } from "react";
import SignupClient from "./signup-client";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="cardSub">Loading…</div>}>
      <SignupClient />
    </Suspense>
  );
}
