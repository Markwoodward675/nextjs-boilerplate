import AdminKeyGate from "./_components/AdminKeyGate";

export const metadata = {
  title: "Admin · Day Trader",
};

export default function AdminLayout({ children }) {
  return <AdminKeyGate>{children}</AdminKeyGate>;
}
