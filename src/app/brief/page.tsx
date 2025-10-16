export default function BriefPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-16">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Step 2</p>
        <h1 className="text-3xl font-semibold text-slate-100">Brief Parsing</h1>
        <p className="text-slate-300">
          Paste a marketer brief and the intent parser agent will normalize it into
          structured JSON with objectives, audience, timing, KPIs, and constraints.
        </p>
      </header>
      <section className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-6 text-sm text-slate-300">
        <p>
          The parsing UI and server actions will ship alongside workflow wiring in
          follow-up work. This page currently serves as an anchor for navigation and
          layout scaffolding.
        </p>
      </section>
    </main>
  );
}
