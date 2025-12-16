// components/AppShellPro.jsx
"use client";

import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

export default function AppShellPro({ children, rightSlot }) {
  return (
    <div className="appShell">
      <Sidebar />
      <div className="appMain">
        <div className="topBar">
          <MobileNav />
          <div className="topBarRight">
            {/* IMPORTANT: do NOT render placeholders */}
            {rightSlot ? rightSlot : null}
          </div>
        </div>
        <div className="appContent">{children}</div>
      </div>
    </div>
  );
}
