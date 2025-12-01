import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center"
      }}
    >
      <div
        style={{
          textAlign: "center",
          width: "100%",
          padding: "0 16px"
        }}
      >
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#22c55e"
          }}
        >
          Trading · Investments · Wallets
        </span>

        <h1
          style={{
            marginTop: 12,
            fontSize: 26,
            fontWeight: 700,
            color: "#bfdbfe"
          }}
        >
          Day Trader — a modern trading & investment platform you can access
          from your phone.
        </h1>

        <p
          style={{
            marginTop: 12,
            fontSize: 14,
            color: "#9ca3af",
            maxWidth: 420,
            marginLeft: "auto",
            marginRight: "auto"
          }}
        >
          Create an account, track markets, manage wallets, and prepare your
          trades from one interface. Live execution and custody are handled by
          your own broker or exchange.
        </p>

        <div
          style={{
            marginTop: 20,
            display: "flex",
            gap: 8,
            justifyContent: "center",
            flexWrap: "wrap"
          }}
        >
          <Link
            href="/auth/register"
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              background: "#2563eb",
              color: "white",
              textDecoration: "none",
              fontSize: 14
            }}
          >
            Create account
          </Link>
          <Link
            href="/auth/login"
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "1px solid #4b5563",
              color: "#e5e7eb",
              textDecoration: "none",
              fontSize: 14
            }}
          >
            Log in
          </Link>
        </div>

        <p
          style={{
            marginTop: 16,
            fontSize: 11,
            color: "#6b7280"
          }}
        >
          Day Trader provides tools and data. We don&apos;t execute trades,
          hold client funds, or give personalized investment advice.
        </p>
      </div>
    </main>
  );
}
