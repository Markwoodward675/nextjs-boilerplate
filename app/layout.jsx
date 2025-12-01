import "../styles/globals.css";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

export const metadata = {
  title: "Day Trader – Trading, Investments, Wallets",
  description:
    "Day Trader is a modern trading and investment platform for managing wallets, tracking markets, and preparing trades. Trades are executed via your own broker or exchange."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <Sidebar />
          <main className="app-main flex flex-col">
            <div className="w-full max-w-6xl mx-auto px-4 md:px-8 py-4 md:py-6">
              <Topbar />
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
