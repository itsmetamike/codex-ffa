"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import { StepIndicator } from "@/components/StepIndicator";
import { PageHeader } from "@/components/PageHeader";
import { Home } from "lucide-react";

export default function ResultsPage() {
  const router = useRouter();
  const { session, createSession, clearSession } = useSession();

  useEffect(() => {
    if (!session) {
      createSession();
    }
  }, []);

  const handleStartNew = () => {
    clearSession();
    router.push("/");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-16">
      <StepIndicator currentStep={4} />
      
      <PageHeader
        stepNumber={4}
        title="Results Dashboard"
        description="Review shortlisted ideas, guardrail compliance, validation scores, supporting evidence, and the C-suite panel responses alongside an evolution log that chronicles every decision."
      />

      {/* Session Summary */}
      {session?.parsedBrief && (
        <section className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-slate-100">Session Summary</h2>
          
          <div className="grid gap-4">
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">Campaign Objective</h3>
              <p className="text-slate-100">{session.parsedBrief.objective || "Not specified"}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">Target Audience</h3>
              <p className="text-slate-100">{session.parsedBrief.audience || "Not specified"}</p>
            </div>

            {session.parsedBrief.timing && (
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-2">Timing</h3>
                <p className="text-slate-100">{session.parsedBrief.timing}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">KPIs</h3>
              {session.parsedBrief.kpis.length > 0 ? (
                <ul className="list-inside list-disc space-y-1 text-slate-100">
                  {session.parsedBrief.kpis.map((kpi: string, idx: number) => (
                    <li key={idx}>{kpi}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400">None specified</p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">Constraints</h3>
              {session.parsedBrief.constraints.length > 0 ? (
                <ul className="list-inside list-disc space-y-1 text-slate-100">
                  {session.parsedBrief.constraints.map((constraint: string, idx: number) => (
                    <li key={idx}>{constraint}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400">None specified</p>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-6 text-sm text-slate-300">
        <p>
          The analytical dashboards, tables, and evidence viewers will be
          implemented in future iterations. This page locks in the routing contract
          for the MVP.
        </p>
      </section>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={handleStartNew}
          className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900 px-6 py-3 font-medium text-slate-100 transition-colors hover:bg-slate-700"
        >
          <Home className="h-4 w-4" />
          Start New Session
        </button>
      </div>
    </main>
  );
}
