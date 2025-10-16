export default function ResultsPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-16">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Step 4</p>
        <h1 className="text-3xl font-semibold text-slate-100">Results Dashboard</h1>
        <p className="text-slate-300">
          Review shortlisted ideas, guardrail compliance, validation scores,
          supporting evidence, and the C-suite panel responses alongside an
          evolution log that chronicles every decision.
        </p>
      </header>
      <section className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-6 text-sm text-slate-300">
        <p>
          The analytical dashboards, tables, and evidence viewers will be
          implemented in future iterations. This page locks in the routing contract
          for the MVP.
        </p>
      </section>
    </main>
  );
}
