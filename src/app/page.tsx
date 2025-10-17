"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";

const navLinks = [
  { href: "/ingest", label: "Ingest Documents" },
  { href: "/brief", label: "Parse Brief" },
  { href: "/workflow", label: "Run Workflow" },
  { href: "/results", label: "View Results" }
];

export default function HomePage() {
  const router = useRouter();
  const { session, createSession, clearSession } = useSession();

  const handleStartNewSession = async () => {
    try {
      await createSession();
      router.push("/ingest");
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  const handleContinueSession = () => {
    router.push("/ingest");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 px-6 py-16 text-center">
      <section className="max-w-3xl space-y-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EDCF98]/10 text-white">
          <Sparkles className="h-6 w-6 text-[#EDCF98]" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white">
          Welcome to Magentic
        </h1>
        <p className="text-lg text-zinc-300">
          A multi-stage content strategy pipeline: ingest brand documents, parse marketing briefs,
          orchestrate AI workflows, and review scored ideas with panel feedback.
        </p>
        <p className="text-lg text-slate-300 md:text-xl">
          Upload your brand intelligence, parse the marketer brief, and orchestrate
          a guardrailed, multi-agent workflow that synthesizes trends, ideas, and
          executive feedback.
        </p>
      </section>

      {session && (
        <div className="rounded-lg border border-zinc-700/50 bg-black/30 px-4 py-3">
          <p className="text-sm text-zinc-400">
            Session active since {new Date(session.createdAt).toLocaleDateString()}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          onClick={handleStartNewSession}
          variant="default"
          className="gap-2 bg-[#EDCF98] text-black hover:bg-[#EDCF98]/90"
        >
          {session ? "Start New Session" : "Get Started"}
          <ArrowRight className="h-4 w-4" />
        </Button>
        
        {session && (
          <Button
            onClick={handleContinueSession}
            variant="outline"
            className="gap-2 border-[#EDCF98] text-[#EDCF98] hover:bg-[#EDCF98]/10"
          >
            Continue Session
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      <nav className="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
        {navLinks.map((link) => (
          <Button
            key={link.href}
            asChild
            variant="outline"
            className="h-auto flex-col gap-2 border-zinc-700 p-6 text-left hover:border-[#EDCF98] hover:bg-[#EDCF98]/5"
          >
            <Link href={link.href as any}>
              <span className="font-semibold text-white">{link.label}</span>
            </Link>
          </Button>
        ))}
      </nav>
    </main>
  );
}
