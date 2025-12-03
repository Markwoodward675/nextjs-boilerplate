// inside component, after state/Avatar logic, keep existing code up to return...

const totalReturns = wallets.reduce(
  (sum, w) => sum + (w.investmentReturnsBalance || 0),
  0
);

return (
  <main className="space-y-4 pb-10">
    <Card>
      <h1 className="text-sm font-semibold text-slate-100">
        Wallets & balances
      </h1>
      <p className="mt-1 text-xs text-slate-400">
        Maintain separate main, trading, and affiliate wallets. Investment
        returns are tracked as a separate balance controlled by admin.
      </p>
    </Card>

    {loading && (
      <p className="text-xs text-slate-400">Loading wallets…</p>
    )}
    {error && (
      <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
        {error}
      </p>
    )}

    <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {wallets.length === 0 ? (
        <Card>
          <p className="text-xs text-slate-400">
            No wallets found yet. Once your first wallet is created and funded,
            it will appear here.
          </p>
        </Card>
      ) : (
        wallets.map((w) => (
          <WalletCard key={w.$id} wallet={w} avatarUrl={avatarUrl} />
        ))
      )}
    </section>

    <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Card>
        <h2 className="text-sm font-semibold text-slate-100">
          Investment returns
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Admin-controlled balance representing realized returns from
          investments. This can be moved into main or trading wallets as
          needed.
        </p>
        <p className="mt-3 text-sm font-semibold text-emerald-300">
          {totalReturns.toFixed(2)}{" "}
          {wallets[0]?.currency || "USD"}
        </p>
      </Card>
      <Card>
        <h2 className="text-sm font-semibold text-slate-100">
          Allocation discipline
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Keep risk capital, affiliate earnings, and investment returns
          compartmentalized so each stream has a specific role.
        </p>
      </Card>
    </section>
  </main>
);
