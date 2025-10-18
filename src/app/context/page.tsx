"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import { StepIndicator } from "@/components/StepIndicator";
import { PageHeader } from "@/components/PageHeader";
import { ArrowRight, ChevronDown, ChevronRight } from "lucide-react";
import { buildContextPackAction } from "./actions";
import type { ContextPack } from "@/lib/schemas";
import { GenerationBlocksContainer } from "@/components/GenerationBlock";

export default function ContextPage() {
  const router = useRouter();
  const { session, createSession, updateSession } = useSession();
  const [brands, setBrands] = useState<string[]>([]);
  const [brand, setBrand] = useState("");
  const [loadingBrands, setLoadingBrands] = useState(true);
  
  // Context Pack state
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [contextPack, setContextPack] = useState<ContextPack | null>(null);
  const [contextSources, setContextSources] = useState<string[]>([]);
  const [contextError, setContextError] = useState<string | null>(null);
  const [expandedPanels, setExpandedPanels] = useState<Record<string, boolean>>({
    brand: true,
    audience: false,
    performance: false,
    creative: false,
    strategy: false,
    guardrails: false
  });
  const [editMode, setEditMode] = useState(false);
  const [editedPack, setEditedPack] = useState<ContextPack | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [generations, setGenerations] = useState<any[]>([]);

  // Create session if none exists and load existing context pack
  useEffect(() => {
    if (!session) {
      createSession();
    } else {
      // Load existing context pack for this session
      loadExistingContextPack();
      loadGenerations();
    }
  }, [session?.id]);

  const loadExistingContextPack = async () => {
    if (!session?.id) return;

    try {
      const response = await fetch(`/api/context/get?sessionId=${session.id}`);
      const data = await response.json();

      if (data.success && data.contextPack) {
        // Fetch guardrails separately
        const guardrailsResponse = await fetch(`/api/guardrails/get?sessionId=${session.id}`);
        const guardrailsData = await guardrailsResponse.json();
        const guardrails = guardrailsData.success ? guardrailsData.guardrails : [];

        // Parse JSON strings back to arrays
        const pack = {
          brand_voice: data.contextPack.brandVoice,
          visual_identity: data.contextPack.visualIdentity,
          audience_summary: data.contextPack.audienceSummary,
          key_insights: JSON.parse(data.contextPack.keyInsights || '[]'),
          creative_lessons: JSON.parse(data.contextPack.creativeLessons || '[]'),
          strategy_highlights: JSON.parse(data.contextPack.strategyHighlights || '[]'),
          budget_notes: data.contextPack.budgetNotes,
          risks_or_cautions: JSON.parse(data.contextPack.risksOrCautions || '[]'),
          guardrails: guardrails
        };
        
        const sources = JSON.parse(data.contextPack.sources || '[]');
        
        setContextPack(pack);
        setEditedPack(pack);
        setContextSources(sources);
      }
    } catch (err) {
      console.error("Error loading existing context pack:", err);
    }
  };

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

  const handleBuildContextPack = async () => {
    if (!brand.trim()) {
      setContextError("Brand is required");
      return;
    }

    if (!session?.id) {
      setContextError("Session not found. Please refresh the page.");
      return;
    }

    setIsLoadingContext(true);
    setContextError(null);
    setContextPack(null);
    setContextSources([]);

    try {
      // Get vector store ID for the brand
      const vectorStoreResponse = await fetch(`/api/vectorstore/list?brand=${encodeURIComponent(brand)}`);
      const vectorStoreData = await vectorStoreResponse.json();

      if (!vectorStoreData.storeId) {
        setContextError(`No vector store found for brand "${brand}". Please upload documents first at /ingest.`);
        setIsLoadingContext(false);
        return;
      }

      const result = await buildContextPackAction({
        vectorStoreId: vectorStoreData.storeId,
        sessionId: session.id
      });

      if (result.success) {
        setContextPack(result.data);
        setEditedPack(result.data);
        setContextSources(result.sources);
        
        // Save as generation block with brand
        await saveGeneration(result.data, brand.trim());
      } else {
        setContextError(result.error);
      }
    } catch (err) {
      setContextError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoadingContext(false);
    }
  };

  const togglePanel = (panel: string) => {
    setExpandedPanels(prev => ({ ...prev, [panel]: !prev[panel] }));
  };

  const handleSave = async () => {
    if (!editedPack || !session?.id) return;

    setIsSaving(true);
    try {
      // Call API to update the context pack in database
      const response = await fetch('/api/context/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          contextPack: editedPack
        })
      });

      if (response.ok) {
        setContextPack(editedPack);
        setEditMode(false);
      } else {
        const data = await response.json();
        setContextError(data.error || 'Failed to save changes');
      }
    } catch (err) {
      setContextError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedPack(contextPack);
    setEditMode(false);
  };

  const updateField = (field: keyof ContextPack, value: string | string[]) => {
    if (!editedPack) return;
    setEditedPack({ ...editedPack, [field]: value });
  };

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

  const saveGeneration = async (contextPack: ContextPack, brandName: string) => {
    if (!session?.id) return;

    try {
      await fetch('/api/generations/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          brand: brandName,
          type: 'context',
          content: contextPack,
          step: 2
        })
      });
      
      // Reload generations to show the new one
      await loadGenerations();
    } catch (err) {
      console.error("Error saving generation:", err);
    }
  };

  const handleContinue = () => {
    router.push("/brief");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-16">
      <StepIndicator currentStep={2} />
      
      <PageHeader
        stepNumber={2}
        title="Context Builder"
        description="Retrieve and synthesize all relevant internal brand intelligence into a unified Context Pack — structured summaries from your vector store filtered by the expanded taxonomy."
      />

      {/* Previous Generations */}
      {generations.length > 0 && (
        <GenerationBlocksContainer generations={generations} currentStep={2} />
      )}

      {/* Context Builder Section */}
      <section className="space-y-4 rounded-xl border border-slate-700/70 bg-slate-900/40 p-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-100">
            Build Context Pack
          </h2>
          <p className="text-sm text-slate-400">
            Select a brand to synthesize historical context from your uploaded documents. This will establish the foundation for brief parsing and campaign ideation.
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

          <button
            onClick={handleBuildContextPack}
            disabled={isLoadingContext || !brand}
            className="w-full rounded-lg bg-gold px-4 py-2.5 font-medium text-black transition-colors hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoadingContext ? "Building Context Pack..." : "Build Context Pack"}
          </button>
        </div>

        {contextError && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-400">
            {contextError}
          </div>
        )}

        {contextPack && editedPack && (
          <div className="rounded-lg border border-gold/30 bg-gold/10 overflow-hidden">
            {/* Edit/Save Controls */}
            <div className="flex items-center justify-between p-4">
              <span className="text-sm font-semibold text-gold">
                {editMode ? "Editing Context Pack" : "Context Pack Generated"}
              </span>
              <div className="flex gap-2">
                {editMode ? (
                  <>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditMode(true)}
                    className="rounded-lg border border-gold bg-transparent px-4 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold/10"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3 px-4 pb-4">
              {/* Brand & Identity Panel */}
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 overflow-hidden">
              <button
                onClick={() => togglePanel('brand')}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-800/50 transition-colors"
              >
                <h3 className="text-sm font-semibold text-slate-200">Brand & Identity</h3>
                {expandedPanels.brand ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
              </button>
              {expandedPanels.brand && (
                <div className="space-y-3 p-4 pt-0">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 mb-1">Brand Voice</h4>
                    {editMode ? (
                      <textarea
                        value={editedPack.brand_voice}
                        onChange={(e) => updateField('brand_voice', e.target.value)}
                        className="w-full min-h-[100px] rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                      />
                    ) : (
                      <p className="text-sm text-slate-300">{contextPack.brand_voice}</p>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 mb-1">Visual Identity</h4>
                    {editMode ? (
                      <textarea
                        value={editedPack.visual_identity}
                        onChange={(e) => updateField('visual_identity', e.target.value)}
                        className="w-full min-h-[100px] rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                      />
                    ) : (
                      <p className="text-sm text-slate-300">{contextPack.visual_identity}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Audience Panel */}
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 overflow-hidden">
              <button
                onClick={() => togglePanel('audience')}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-800/50 transition-colors"
              >
                <h3 className="text-sm font-semibold text-slate-200">Audience & Personas</h3>
                {expandedPanels.audience ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
              </button>
              {expandedPanels.audience && (
                <div className="p-4 pt-0">
                  {editMode ? (
                    <textarea
                      value={editedPack.audience_summary}
                      onChange={(e) => updateField('audience_summary', e.target.value)}
                      className="w-full min-h-[100px] rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                    />
                  ) : (
                    <p className="text-sm text-slate-300">{contextPack.audience_summary}</p>
                  )}
                </div>
              )}
            </div>

            {/* Performance Panel */}
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 overflow-hidden">
              <button
                onClick={() => togglePanel('performance')}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-800/50 transition-colors"
              >
                <h3 className="text-sm font-semibold text-slate-200">Performance & Analytics</h3>
                {expandedPanels.performance ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
              </button>
              {expandedPanels.performance && (
                <div className="p-4 pt-0">
                  <h4 className="text-xs font-semibold text-slate-400 mb-2">Key Insights</h4>
                  {editMode ? (
                    <textarea
                      value={editedPack.key_insights.join('\n')}
                      onChange={(e) => updateField('key_insights', e.target.value.split('\n').filter(i => i.trim()))}
                      placeholder="One insight per line"
                      className="w-full min-h-[100px] rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                    />
                  ) : (
                    <ul className="space-y-1.5 pl-4">
                      {contextPack.key_insights.map((insight, index) => (
                        <li key={index} className="flex gap-2 text-sm">
                          <span className="text-slate-500">•</span>
                          <p className="flex-1 text-slate-300">{insight}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Creative Panel */}
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 overflow-hidden">
              <button
                onClick={() => togglePanel('creative')}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-800/50 transition-colors"
              >
                <h3 className="text-sm font-semibold text-slate-200">Creative & Content</h3>
                {expandedPanels.creative ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
              </button>
              {expandedPanels.creative && (
                <div className="p-4 pt-0">
                  <h4 className="text-xs font-semibold text-slate-400 mb-2">Creative Lessons</h4>
                  {editMode ? (
                    <textarea
                      value={editedPack.creative_lessons.join('\n')}
                      onChange={(e) => updateField('creative_lessons', e.target.value.split('\n').filter(l => l.trim()))}
                      placeholder="One lesson per line"
                      className="w-full min-h-[100px] rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                    />
                  ) : (
                    <ul className="space-y-1.5 pl-4">
                      {contextPack.creative_lessons.map((lesson, index) => (
                        <li key={index} className="flex gap-2 text-sm">
                          <span className="text-slate-500">•</span>
                          <p className="flex-1 text-slate-300">{lesson}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Strategy Panel */}
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 overflow-hidden">
              <button
                onClick={() => togglePanel('strategy')}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-800/50 transition-colors"
              >
                <h3 className="text-sm font-semibold text-slate-200">Strategy & Planning</h3>
                {expandedPanels.strategy ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
              </button>
              {expandedPanels.strategy && (
                <div className="space-y-3 p-4 pt-0">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 mb-2">Strategy Highlights</h4>
                    {editMode ? (
                      <textarea
                        value={editedPack.strategy_highlights.join('\n')}
                        onChange={(e) => updateField('strategy_highlights', e.target.value.split('\n').filter(h => h.trim()))}
                        placeholder="One highlight per line"
                        className="w-full min-h-[100px] rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                      />
                    ) : (
                      <ul className="space-y-1.5 pl-4">
                        {contextPack.strategy_highlights.map((highlight, index) => (
                          <li key={index} className="flex gap-2 text-sm">
                            <span className="text-slate-500">•</span>
                            <p className="flex-1 text-slate-300">{highlight}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 mb-1">Budget Notes</h4>
                    {editMode ? (
                      <textarea
                        value={editedPack.budget_notes || ''}
                        onChange={(e) => updateField('budget_notes', e.target.value.trim() || '')}
                        placeholder="Optional budget notes"
                        className="w-full min-h-[60px] rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                      />
                    ) : contextPack.budget_notes ? (
                      <p className="text-sm text-slate-300">{contextPack.budget_notes}</p>
                    ) : (
                      <p className="text-sm text-slate-500 italic">No budget notes</p>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 mb-2">Risks & Cautions</h4>
                    {editMode ? (
                      <textarea
                        value={editedPack.risks_or_cautions.join('\n')}
                        onChange={(e) => updateField('risks_or_cautions', e.target.value.split('\n').filter(r => r.trim()))}
                        placeholder="One risk per line"
                        className="w-full min-h-[100px] rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                      />
                    ) : (
                      <ul className="space-y-1.5 pl-4">
                        {contextPack.risks_or_cautions.map((risk, index) => (
                          <li key={index} className="flex gap-2 text-sm">
                            <span className="text-slate-500">•</span>
                            <p className="flex-1 text-slate-300">{risk}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Guardrails Panel */}
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 overflow-hidden">
              <button
                onClick={() => togglePanel('guardrails')}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-800/50 transition-colors"
              >
                <h3 className="text-sm font-semibold text-slate-200">Brand Safety & Legal Guardrails</h3>
                {expandedPanels.guardrails ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
              </button>
              {expandedPanels.guardrails && (
                <div className="p-4 pt-0">
                  {contextPack.guardrails && contextPack.guardrails.length > 0 ? (
                    <ul className="space-y-1.5 pl-4">
                      {contextPack.guardrails.map((item, index) => (
                        <li key={index} className="flex gap-2 text-sm">
                          <span className="text-slate-500">•</span>
                          <p className="flex-1 text-slate-300">{item.bullet}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No guardrails extracted. Ensure you have uploaded brand safety and compliance documents.</p>
                  )}
                </div>
              )}
            </div>

            {/* Sources */}
            {contextSources.length > 0 && (
              <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                <h4 className="text-xs font-semibold text-slate-400 mb-2">Source Files</h4>
                <div className="flex flex-wrap gap-2">
                  {contextSources.map((source, index) => (
                    <span
                      key={index}
                      className="rounded-full bg-slate-800 px-3 py-1 text-xs font-mono text-slate-300"
                    >
                      {source}
                    </span>
                  ))}
                </div>
              </div>
            )}
            </div>
          </div>
        )}
      </section>

      {/* Continue Button */}
      {contextPack && (
        <div className="flex justify-end">
          <button
            onClick={handleContinue}
            className="flex items-center gap-2 rounded-lg bg-gold px-6 py-3 font-medium text-black transition-colors hover:bg-gold/90"
          >
            Continue to Brief Parsing <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </main>
  );
}
