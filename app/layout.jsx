// app/layout.jsx
import "./globals.css";
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Day Trader",
  description:
    "Day Trader - an educational trading and investment platform for simulated dashboards, wallets, and affiliate insights.",
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
  themeColor: "#000000",
};

function BrandHeader() {
  return (
    <div className="w-full max-w-md">
      <div className="flex items-center justify-center gap-3">
        <div className="h-11 w-11 rounded-xl border border-yellow-500/60 bg-black/50 flex items-center justify-center overflow-hidden">
          {/* No onError handlers here (build-safe) */}
          <Image
            src="/brand/logo-mark.png"
            alt="Day Trader"
            width={44}
            height={44}
            priority
          />
        </div>

        <div className="text-left">
          <div className="text-lg font-bold tracking-wide text-yellow-400 leading-tight">
            Day Trader
          </div>
          <div className="text-[11px] text-slate-200/80">
            Markets • Wallets • Execution
          </div>
        </div>
      </div>

      <div className="mt-4 text-center text-[11px] text-slate-200/70">
        Educational simulation platform — not a broker. Funds and execution stay
        with your own providers.
      </div>
    </div>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-black text-slate-50">
        {/* Global background (auth + landing consistent) */}
        <div className="min-h-screen w-full bg-black bg-[url('https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center">
          <div className="min-h-screen w-full bg-black/65 backdrop-blur-[1px]">
            {/* Top bar (optional, keep minimal) */}
            <div className="w-full px-4 pt-6 flex justify-center">
              <div className="w-full max-w-5xl flex items-center justify-between">
                <Link href="/" className="inline-flex items-center gap-2">
                  <span className="text-yellow-400 font-semibold">DT</span>
                  <span className="text-slate-200/80 text-sm">Day Trader</span>
                </Link>

                <div className="flex items-center gap-3 text-sm">
                  <Link
                    href="/signin"
                    className="text-slate-200/80 hover:text-yellow-300 transition"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-full bg-yellow-500 px-4 py-2 text-black font-semibold hover:bg-yellow-400 transition"
                  >
                    Create account
                  </Link>
                </div>
              </div>
            </div>

            {/* Centered content shell (auth pages will look consistent automatically) */}
            <div className="px-4 py-10 flex items-start justify-center">
              <div className="w-full max-w-5xl flex flex-col items-center">
                <BrandHeader />
                <div className="w-full mt-8">{children}</div>
              </div>
            </div>

            <div className="px-4 pb-10 text-center text-[11px] text-slate-200/60">
              © {new Date().getFullYear()} Day Trader • All rights reserved.
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
