import "./globals.css";
import BrandLogo from "../components/BrandLogo";

export const metadata = {
  title: "Day Trader",
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
  themeColor: "#000000",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased">
        <header className="border-b border-yellow-500/30 bg-black/80 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl border border-yellow-500/60 bg-black/50 flex items-center justify-center overflow-hidden">
              <BrandLogo size={28} />
            </div>
            <div>
              <div className="font-semibold text-yellow-400 leading-tight">
                Day Trader
              </div>
              <div className="text-[11px] text-slate-400">
                Markets • Wallets • Execution
              </div>
            </div>
          </div>
        </header>

        <main>{children}</main>
      </body>
    </html>
  );
}
