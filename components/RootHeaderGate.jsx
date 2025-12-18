// components/RootHeaderGate.jsx
"use client";

import { usePathname } from "next/navigation";

function isProtectedPath(pathname = "") {
  // Your protected pages live at root routes like /overview, /wallet, etc.
  const PROTECTED = [
    "/overview",
    "/dashboard",
    "/wallet",
    "/trade",
    "/invest",
    "/deposit",
    "/withdraw",
    "/transactions",
    "/affiliate",
    "/giftcards",
    "/alerts",
    "/settings",
  ];

  // Admin must also not show public header
  if (pathname.startsWith("/admin")) return true;

  return PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default function RootHeaderGate({ header, children }) {
  const pathname = usePathname() || "";
  const hideHeader = isProtectedPath(pathname);

  return (
    <>
      {!hideHeader ? header : null}
      {children}
    </>
  );
}
