import Card from "../../components/Card";

export default function AlertsPage() {
  return (
    <main className="space-y-4 pb-10">
      <Card>
        <h1 className="text-sm font-semibold text-slate-100">
          Market and risk alerts
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Configure price alerts, percentage moves, and risk notifications.
          Later this page will hook into your CoinMarketCap feed and broker
          integrations to send real-time alerts.
        </p>
      </Card>
    </main>
  );
}
