// app/layout.jsx
import "./globals.css";
import TopNav from "../components/TopNav";
import MobileNav from "../components/MobileNav";

export const metadata = {
  title: "Day Trader",
  description:
    "Day Trader - an educational trading and investment platform for simulated dashboards, wallets, and affiliate insights.",
};

// This replaces the manual <meta name="viewport" ...> in <head>
export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full overflow-x-hidden">
      <body className="min-h-screen bg-slate-950 text-slate-50 overflow-x-hidden">
        <div className="app-shell flex min-h-screen w-full flex-col overflow-x-hidden">
          {/* Optional background layer (keep your CSS/animation for .crypto-particles) */}
          <div className="crypto-particles" aria-hidden="true" />

          {/* Global navigation */}
          <TopNav />
          <MobileNav />

          {/* Main content area */}
          <main className="flex-1 w-full max-w-full overflow-x-hidden">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
