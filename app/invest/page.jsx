import Card from "../../components/Card";

export default function InvestPage() {
  return (
    <main className="space-y-4 pb-10">
      <Card>
        <h1 className="text-sm font-semibold text-slate-100">
          Investment plans
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Design and manage investment plans, portfolios, and allocations. Use
          this space to model long-term strategies, DCA plans, and basket
          tracking with your own rules and risk limits.
        </p>
      </Card>
    </main>
  );
}
