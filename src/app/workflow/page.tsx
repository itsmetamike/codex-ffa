"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import { StepIndicator } from "@/components/StepIndicator";
import { PageHeader } from "@/components/PageHeader";
import { ArrowRight } from "lucide-react";
import { summarizeGuardrailsAction } from "./actions";
import type { GuardrailItem } from "@/lib/schemas";

export default function WorkflowPage() {
  const router = useRouter();
  const { session, createSession } = useSession();
  const [brands, setBrands] = useState<string[]>([]);
  const [brand, setBrand] = useState("");
  const [brief, setBrief] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [guardrails, setGuardrails] = useState<GuardrailItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Create session if none exists, load parsed brief from session
  useEffect(() => {
    if (!session) {
      createSession();
    } else if (session.parsedBrief) {
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
  }, [session]);

  // Fetch available brands and get most recent upload
  useEffect(() => {
    const fetchBrandsAndRecent = async () => {
      try {
        // First, get all brands
        const brandsResponse = await fetch("/api/brands");
        const brandsData = await brandsResponse.json();
        
        if (brandsData.success && brandsData.brands && Array.isArray(brandsData.brands) && brandsData.brands.length > 0) {
          setBrands(brandsData.brands);
          
          // Get the most recently uploaded file's brand
          let mostRecentBrand = brandsData.brands[0];
          let mostRecentTime = 0;
          
          // Check each brand for most recent file
          for (const brandName of brandsData.brands) {
            try {
              const filesResponse = await fetch(`/api/vectorstore/list?brand=${encodeURIComponent(brandName)}`);
              const filesData = await filesResponse.json();
              
              if (filesData.files && filesData.files.length > 0) {
                // Get the most recent file for this brand
                const mostRecentFile = filesData.files[0]; // Already sorted by createdAt DESC
                if (mostRecentFile.createdAt > mostRecentTime) {
                  mostRecentTime = mostRecentFile.createdAt;
                  mostRecentBrand = brandName;
                }
              }
            } catch (err) {
              console.error(`Error fetching files for brand ${brandName}:`, err);
            }
          }
          
          setBrand(mostRecentBrand);
        }
      } catch (err) {
        console.error("Error fetching brands:", err);
      } finally {
        setLoadingBrands(false);
      }
    };

    fetchBrandsAndRecent();
  }, []);

  const handleSummarize = async () => {
    if (!brand.trim() || !brief.trim()) {
      setError("Both Brand and Brief are required");
      return;
    }

    setIsLoading(true);
    setError(null);
    setGuardrails([]);

    try {
      const result = await summarizeGuardrailsAction({
        brand: brand.trim(),
        brief: brief.trim()
      });

      if (result.success) {
        setGuardrails(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    router.push("/results");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-16">
      <StepIndicator currentStep={3} />
      
      <PageHeader
        stepNumber={3}
        title="Workflow Orchestration"
        description="Select a brand and paste your brief. The orchestrator will summarize guardrails from the vector store, then (in future milestones) compile context, simulate trends, generate ideas, score them, and gather panel feedback."
      />

      {/* Guardrails Summary Section */}
      <section className="space-y-4 rounded-xl border border-slate-700/70 bg-slate-900/40 p-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-100">
            Guardrails Summary (file_search)
          </h2>
          <p className="text-sm text-slate-400">
            Summarize brand safety, legal, and platform constraints from your vector store.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="brand" className="mb-1.5 block text-sm font-medium text-slate-300">
              Brand
            </label>
            {loadingBrands ? (
              <div className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-500">
                Loading brands...
              </div>
            ) : brands.length === 0 ? (
              <div className="space-y-2">
                <div className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-500">
                  No brands available
                </div>
                <p className="text-xs text-slate-500">
                  Please upload documents at{" "}
                  <a href="/ingest" className="text-gold hover:text-gold/80 underline">
                    /ingest
                  </a>{" "}
                  first
                </p>
              </div>
            ) : (
              <>
                <select
                  id="brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                >
                  {brands.map((brandName) => (
                    <option key={brandName} value={brandName}>
                      {brandName}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Select the brand with uploaded documents from /ingest
                </p>
              </>
            )}
          </div>

          <div>
            <label htmlFor="brief" className="mb-1.5 block text-sm font-medium text-slate-300">
              Brief
            </label>
            <textarea
              id="brief"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Enter your campaign brief..."
              rows={4}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>

          <button
            onClick={handleSummarize}
            disabled={isLoading}
            className="w-full rounded-lg bg-gold px-4 py-2.5 font-medium text-black transition-colors hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Summarizing..." : "Summarize Guardrails"}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {guardrails.length > 0 && (
          <div className="space-y-4 rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <h3 className="text-sm font-semibold text-slate-200">
              Brand Safety & Legal Constraints
            </h3>
            {Object.entries(
              guardrails.reduce((acc, item) => {
                if (!acc[item.source]) {
                  acc[item.source] = [];
                }
                acc[item.source].push(item.bullet);
                return acc;
              }, {} as Record<string, string[]>)
            ).map(([source, bullets]) => (
              <div key={source} className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400">
                  <span className="font-mono">{source}</span>
                </h4>
                <ul className="space-y-1.5 pl-4">
                  {bullets.map((bullet, index) => (
                    <li key={index} className="flex gap-2 text-sm">
                      <span className="text-slate-500">•</span>
                      <p className="flex-1 text-slate-300">{bullet}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Placeholder for future workflow steps */}
      <section className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-6 text-sm text-slate-300">
        <p>
          Additional workflow steps (context compilation, trend simulation, idea generation,
          scoring, and panel feedback) will arrive in subsequent milestones.
        </p>
      </section>

      {/* Continue Button */}
      {guardrails.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleContinue}
            className="flex items-center gap-2 rounded-lg bg-gold px-6 py-3 font-medium text-black transition-colors hover:bg-gold/90"
          >
            Continue to Results <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </main>
  );
}
