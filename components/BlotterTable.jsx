"use client";

const money = (n) =>
  `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function BlotterTable({ rows = [], title = "Blotter" }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="text-sm font-semibold text-slate-200">{title}</div>
        <div className="text-xs text-slate-500">{rows.length} records</div>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-8 text-sm text-slate-400">No records available.</div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500">
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-2 font-medium">Type</th>
                <th className="text-left px-4 py-2 font-medium">Description</th>
                <th className="text-right px-4 py-2 font-medium">Amount</th>
                <th className="text-right px-4 py-2 font-medium">Status</th>
                <th className="text-right px-4 py-2 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.$id} className="border-b border-slate-800/70 hover:bg-slate-800/20 transition">
                  <td className="px-4 py-2 text-slate-300">
                    {t.category || t.type || "general"}
                  </td>
                  <td className="px-4 py-2 text-slate-300">
                    {t.title || t.meta || t.description || "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-slate-100">
                    {money(t.amount)}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-300">
                    {t.status || "—"}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-slate-500">
                    {t.createdAt || t.$createdAt || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
