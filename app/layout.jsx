import "../styles/globals.css";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import FakeNotifications from "../components/FakeNotifications";
import MobileNav from "../components/MobileNav";

export const metadata = {
  title: "Day Trader – Trading, Investments, Wallets, Affiliate",
  description:
    "Day Trader organizes trading capital, investments, and affiliate flows in one professional interface."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* make sure mobile viewport is set */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
      </head>
      <body className="overflow-x-hidden">
        {/* background particles / crypto coins (keep your existing components/classes) */}
        <div className="crypto-particles">
          <span />
          <span />
          <span />
        </div>

        <div className="floating-coins">
          <div className="floating-coin">BTC</div>
          <div className="floating-coin">ETH</div>
          <div className="floating-coin">USDT</div>
          <div className="floating-coin">SOL</div>
        </div>

        <div className="app-shell relative z-10">
          {/* Desktop sidebar */}
          <Sidebar />

          {/* Main content area */}
          <main className="flex-1 flex flex-col min-h-screen w-full pb-14 md:pb-0">
            <div className="w-full max-w-6xl mx-auto px-4 md:px-8 py-4 md:py-6">
              <Topbar />
              {children}
            </div>
          </main>

          {/* Fake notifications overlay (already used) */}
          <FakeNotifications />

          {/* Mobile bottom nav */}
          <MobileNav />
        </div>
      </body>
    </html>
  );
}
