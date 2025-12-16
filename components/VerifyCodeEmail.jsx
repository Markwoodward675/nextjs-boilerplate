import * as React from "react";

export default function VerifyCodeEmail({ brand = "Day Trader", code = "000000", email = "" }) {
  return (
    <div style={{ fontFamily: "Inter,Arial,sans-serif", lineHeight: 1.5, color: "#111" }}>
      <div style={{ maxWidth: 520, margin: "0 auto", padding: 20 }}>
        <div style={{ background: "#000", borderRadius: 14, padding: 18, border: "1px solid #facc15" }}>
          <div style={{ color: "#facc15", fontWeight: 900, fontSize: 22 }}>{brand}</div>
          <div style={{ color: "#d1d5db", marginTop: 6, fontSize: 13 }}>
            Secure verification required to unlock your dashboard.
          </div>

          <div style={{ marginTop: 18, background: "#0b0b0b", borderRadius: 14, padding: 16 }}>
            <div style={{ color: "#e5e7eb", fontSize: 13 }}>Your 6-digit verification code</div>

            <div
              style={{
                marginTop: 10,
                fontSize: 30,
                fontWeight: 900,
                letterSpacing: 6,
                color: "#facc15",
              }}
            >
              {code}
            </div>

            <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 10 }}>
              If you didn’t request this, ignore this email.
            </div>

            {email ? (
              <div style={{ color: "#6b7280", fontSize: 12, marginTop: 10 }}>
                Requested for: <span style={{ color: "#d1d5db" }}>{email}</span>
              </div>
            ) : null}
          </div>

          <div style={{ color: "#6b7280", fontSize: 12, marginTop: 14 }}>
            © {new Date().getFullYear()} {brand}. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
