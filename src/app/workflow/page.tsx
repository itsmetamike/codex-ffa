"use client";

import { useState, useEffect } from "react";
import { summarizeGuardrailsAction } from "./actions";
import type { GuardrailItem } from "@/lib/schemas";

export default function WorkflowPage() {
  const [brands, setBrands] = useState<string[]>([]);
  const [brand, setBrand] = useState("");
  const [brief, setBrief] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [guardrails, setGuardrails] = useState<GuardrailItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch available brands on mount
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await fetch("/api/brands");
        const data = await response.json();
        
        console.log("Brands API response:", data);
        console.log("Brands array:", data.brands);
        console.log("Brands type:", typeof data.brands);
        console.log("Is array:", Array.isArray(data.brands));
        
        if (data.success && data.brands && Array.isArray(data.brands) && data.brands.length > 0) {
          setBrands(data.brands);
          setBrand(data.brands[0]); // Set first brand as default
        }
      } catch (err) {
        console.error("Error fetching brands:", err);
      } finally {
        setLoadingBrands(false);
      }
    };

    fetchBrands();
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-16">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Step 3</p>
        <h1 className="text-3xl font-semibold text-slate-100">Workflow Orchestration</h1>
        <p className="text-slate-300">
          Monitor each agent as it runs—retrieving guardrails, compiling context,
          simulating trends, generating ideas, scoring outputs, and curating
          executive panel feedback.
        </p>
      </header>

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
              <div className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-slate-500">
                Loading brands...
              </div>
            ) : brands.length === 0 ? (
              <div className="space-y-2">
                <div className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-slate-500">
                  No brands available
                </div>
                <p className="text-xs text-slate-500">
                  Please upload documents at{" "}
                  <a href="/ingest" className="text-blue-400 hover:text-blue-300 underline">
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
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleSummarize}
            disabled={isLoading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
          <div className="space-y-4 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
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
    </main>
  );
}
