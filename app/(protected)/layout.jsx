// app/layout.jsx
import "./globals.css";
import BrandLogo from "../components/BrandLogo";
import RootHeaderGate from "../components/RootHeaderGate";

export const metadata = {
  title: { default: "Day Trader", template: "%s · Day Trader" },
  description: "Markets • Wallets • Execution",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050814",
};

function PublicHeader() {
  return (
    <header className="dt-header">
      <div className="dt-shell dt-header-inner">
        <div className="dt-brand">
          <div className="dt-brand-mark" aria-hidden>
            <BrandLogo size={28} />
          </div>
          <div className="dt-brand-text">
            <div className="dt-brand-title">Day Trader</div>
            <div className="dt-brand-sub">Markets • Wallets • Execution</div>
          </div>
        </div>

        <nav className="dt-top-actions">
          <a className="dt-chip" href="/signin">
            Sign in
          </a>
          <a className="dt-chip dt-chip-primary" href="/signup">
            Create account
          </a>
        </nav>
      </div>
    </header>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="dt-body">
        <RootHeaderGate header={<PublicHeader />}>
          <main className="dt-main">{children}</main>
        </RootHeaderGate>
      </body>
    </html>
  );
}
