import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

const navLinks = [
  { href: "/ingest", label: "Ingest Documents" },
  { href: "/brief", label: "Parse Brief" },
  { href: "/workflow", label: "Run Workflow" },
  { href: "/results", label: "View Results" }
];

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 px-6 py-16 text-center">
      <section className="max-w-3xl space-y-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100/10 text-slate-100">
          <Sparkles className="h-6 w-6" />
        </div>
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
          Codex FFA • Pilot
        </p>
        <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
          From marketer brief to validated content strategy in minutes.
        </h1>
        <p className="text-lg text-slate-300 md:text-xl">
          Upload your brand intelligence, parse the marketer brief, and orchestrate
          a guardrailed, multi-agent workflow that synthesizes trends, ideas, and
          executive feedback.
        </p>
      </section>

      <nav className="flex flex-wrap items-center justify-center gap-4">
        {navLinks.map((link) => (
          <Button asChild key={link.href} variant="secondary">
            <Link href={link.href}>{link.label}</Link>
          </Button>
        ))}
      </nav>
    </main>
  );
}
