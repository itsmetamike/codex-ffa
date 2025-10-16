export default function IngestPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-16">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Step 1</p>
        <h1 className="text-3xl font-semibold text-slate-100">Document Ingestion</h1>
        <p className="text-slate-300">
          Upload your brand, performance, and safety documents to seed the vector
          store. Metadata such as doc type, brand, tags, and effective dates ensure
          precise retrieval downstream.
        </p>
      </header>
      <section className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-6 text-sm text-slate-300">
        <p>Ingestion tooling and file upload flow will land here in a future PR.</p>
        <p className="mt-2 text-slate-400">
          For now, configure your OpenAI vector store manually and connect the
          resulting identifier to a session.
        </p>
      </section>
    </main>
  );
}
