import "./globals.css";
import BrandLogo from "@/components/BrandLogo";

export const metadata = {
  title: "Day Trader",
  description: "Markets • Wallets • Execution",
  themeColor: "#000000",
  icons: {
    icon: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased">
        <header className="border-b border-yellow-500/30 bg-black/80 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-3">
            <BrandLogo size={28} />
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
