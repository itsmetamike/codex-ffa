"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import { StepIndicator } from "@/components/StepIndicator";
import { PageHeader } from "@/components/PageHeader";
import { ArrowRight } from "lucide-react";
import { GenerationBlocksContainer } from "@/components/GenerationBlock";

export default function WorkflowPage() {
  const router = useRouter();
  const { session, createSession } = useSession();
  const [brief, setBrief] = useState("");
  const [generations, setGenerations] = useState<any[]>([]);

  // Create session if none exists, load parsed brief from session
  useEffect(() => {
    if (!session) {
      createSession();
    } else {
      if (session.parsedBrief) {
        // Format the parsed brief into a readable text format
        const formattedBrief = `Objective: ${session.parsedBrief.objective}

Audience: ${session.parsedBrief.audience}

${session.parsedBrief.timing ? `Timing: ${session.parsedBrief.timing}\n\n` : ''}KPIs:
${session.parsedBrief.kpis.map(kpi => `- ${kpi}`).join('\n')}

Constraints:
${session.parsedBrief.constraints.map(c => `- ${c}`).join('\n')}`;
        
        setBrief(formattedBrief);
      } else if (session.brief) {
        // Fallback to raw brief if parsed brief not available
        setBrief(session.brief);
      }
      
      loadGenerations();
    }
  }, [session?.id]);


  const loadGenerations = async () => {
    if (!session?.id) return;

    try {
      const response = await fetch(`/api/generations/list?sessionId=${session.id}`);
      const data = await response.json();

      if (data.success && data.generations) {
        setGenerations(data.generations);
      }
    } catch (err) {
      console.error("Error loading generations:", err);
    }
  };

  const handleContinue = () => {
    router.push("/results");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-16">
      <StepIndicator currentStep={4} />
      
      <PageHeader
        stepNumber={4}
        title="Workflow Orchestration"
        description="Future workflow steps will include trend simulation, idea generation, scoring, and panel feedback. Guardrails are now extracted automatically in the Strategy Brief step."
      />

      {/* Previous Generations */}
      {generations.length > 0 && (
        <GenerationBlocksContainer generations={generations} currentStep={4} />
      )}

      {/* Workflow Information */}
      <section className="space-y-4 rounded-xl border border-slate-700/70 bg-slate-900/40 p-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-100">
            Workflow Status
          </h2>
          <p className="text-sm text-slate-400">
            Guardrails are now automatically extracted in the Strategy Brief step (Step 3). Future workflow steps will be added here for trend simulation, idea generation, scoring, and panel feedback.
          </p>
        </div>
      </section>

      {/* Continue Button */}
      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          className="flex items-center gap-2 rounded-lg bg-gold px-6 py-3 font-medium text-black transition-colors hover:bg-gold/90"
        >
          Continue to Results <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </main>
  );
}
