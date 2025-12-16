// app/layout.jsx
import "./globals.css";

export const metadata = {
  title: {
    default: "Day Trader",
    template: "%s · Day Trader",
  },
  description: "Markets • Wallets • Execution",
  applicationName: "Day Trader",

  // ✅ Mobile theme color
  themeColor: "#000000",

  // ✅ Favicons + Apple Touch Icon
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },

  // ✅ Web App Manifest (Android / PWA)
  manifest: "/site.webmanifest",
};

export const viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

