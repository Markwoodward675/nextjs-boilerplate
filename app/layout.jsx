import "../styles/globals.css";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import FakeNotifications from "../components/FakeNotifications";

export const metadata = {
  title: "Day Trader – Trading, Investments, Wallets",
  description:
    "Day Trader is a modern trading and investment platform for organizing capital, tracking markets, and managing affiliate revenue."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="crypto-particles">
          <span />
          <span />
          <span />
        </div>

        <div className="app-shell relative z-10">
          <Sidebar />
          <main className="flex-1 flex flex-col">
            <div className="w-full max-w-6xl mx-auto px-4 md:px-8 py-4 md:py-6">
              <Topbar />
              {children}
            </div>
          </main>
          <FakeNotifications />
        </div>
      </body>
    </html>
  );
}
