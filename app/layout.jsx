// app/layout.jsx
import "../styles/globals.css";

export const metadata = {
  title: "Day Trader",
  description:
    "Day Trader - an educational trading and investment platform for simulated dashboards, wallets, and affiliate insights.",
};

// Next.js app router viewport config
export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full overflow-x-hidden">
      <body className="min-h-screen bg-slate-950 text-slate-50 overflow-x-hidden">
        <div className="app-shell flex min-h-screen w-full flex-col overflow-x-hidden">
          {/* Optional background particles layer */}
          <div className="crypto-particles" aria-hidden="true" />

          {/* Main content */}
          <main className="flex-1 w-full max-w-full overflow-x-hidden">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
