// app/reset-password/page.jsx
import { Suspense } from "react";
import ResetPasswordClient from "./reset-password-client";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-amber-200/70">Loading…</div>}>
      <ResetPasswordClient />
    </Suspense>
  );
}
