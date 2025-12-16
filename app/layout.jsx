// app/layout.jsx
import "./globals.css";

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

import RootChrome from "./root-chrome";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="dt-body">
        <RootChrome>{children}</RootChrome>
      </body>
    </html>
  );
}
