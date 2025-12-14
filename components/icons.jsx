"use client";

export function Icon({ name, className = "h-4 w-4" }) {
  const props = { className, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2 };
  switch (name) {
    case "dashboard":
      return (
        <svg {...props}><path d="M4 13h7V4H4v9z"/><path d="M13 20h7V11h-7v9z"/><path d="M13 4h7v5h-7z"/><path d="M4 20h7v-5H4z"/></svg>
      );
    case "wallet":
      return (
        <svg {...props}><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5z"/><path d="M21 12h-7a2 2 0 0 0 0 4h7"/></svg>
      );
    case "trade":
      return (
        <svg {...props}><path d="M3 3v18h18"/><path d="M7 14l3-3 3 2 5-6"/></svg>
      );
    case "invest":
      return (
        <svg {...props}><path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7z"/></svg>
      );
    case "deposit":
      return (
        <svg {...props}><path d="M12 3v12"/><path d="M7 8l5-5 5 5"/><path d="M4 21h16"/></svg>
      );
    case "withdraw":
      return (
        <svg {...props}><path d="M12 21V9"/><path d="M7 16l5 5 5-5"/><path d="M4 3h16"/></svg>
      );
    case "tx":
      return (
        <svg {...props}><path d="M20 7H4"/><path d="M20 17H4"/><path d="M8 7v10"/><path d="M16 7v10"/></svg>
      );
    case "affiliate":
      return (
        <svg {...props}><path d="M16 11a4 4 0 1 0-8 0"/><path d="M3 20a7 7 0 0 1 18 0"/></svg>
      );
    case "gift":
      return (
        <svg {...props}><path d="M20 12v9H4v-9"/><path d="M2 7h20v5H2z"/><path d="M12 7v14"/><path d="M12 7c-1.5 0-4-1-4-3a2 2 0 0 1 4 0"/><path d="M12 7c1.5 0 4-1 4-3a2 2 0 0 0-4 0"/></svg>
      );
    case "alert":
      return (
        <svg {...props}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      );
    case "settings":
      return (
        <svg {...props}><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/><path d="M19.4 15a7.8 7.8 0 0 0 .1-2l2-1.2-2-3.5-2.3.6a7.7 7.7 0 0 0-1.7-1L15 3h-6l-.5 4a7.7 7.7 0 0 0-1.7 1l-2.3-.6-2 3.5 2 1.2a7.8 7.8 0 0 0 .1 2L2.5 16.2l2 3.5 2.3-.6a7.7 7.7 0 0 0 1.7 1L9 21h6l.5-4a7.7 7.7 0 0 0 1.7-1l2.3.6 2-3.5-2.1-1.3z"/></svg>
      );
    default:
      return <svg {...props}><path d="M12 12h.01"/></svg>;
  }
}
