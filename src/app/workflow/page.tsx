"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import { StepIndicator } from "@/components/StepIndicator";
import { PageHeader } from "@/components/PageHeader";
import { ArrowRight, Sparkles, ChevronDown, ChevronRight } from "lucide-react";
import { GenerationBlocksContainer } from "@/components/GenerationBlock";

type Category = {
  name: string;
  subcategories: string[];
};

export default function WorkflowPage() {
  const router = useRouter();
  const { session, createSession } = useSession();
  const [brief, setBrief] = useState("");
  const [generations, setGenerations] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedSubcategories, setSelectedSubcategories] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState(false);
  const [editedSelectedCategories, setEditedSelectedCategories] = useState<Set<string>>(new Set());
  const [editedSelectedSubcategories, setEditedSelectedSubcategories] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Load persisted selections from session storage
  useEffect(() => {
    const savedCategories = sessionStorage.getItem('selectedCategories');
    const savedSubcategories = sessionStorage.getItem('selectedSubcategories');
    if (savedCategories) {
      setSelectedCategories(new Set(JSON.parse(savedCategories)));
    }
    if (savedSubcategories) {
      setSelectedSubcategories(new Set(JSON.parse(savedSubcategories)));
    }
  }, []);

  // Persist selections to session storage whenever they change
  useEffect(() => {
    sessionStorage.setItem('selectedCategories', JSON.stringify(Array.from(selectedCategories)));
  }, [selectedCategories]);

  useEffect(() => {
    sessionStorage.setItem('selectedSubcategories', JSON.stringify(Array.from(selectedSubcategories)));
  }, [selectedSubcategories]);

  // Create session if none exists, load parsed brief from session
  useEffect(() => {
    if (!session) {
      createSession();
    } else {
      if (session.parsedBrief) {
        // Format the parsed brief into a readable text format
        const formattedBrief = `Objective: ${session.parsedBrief.objective}

Audience: ${session.parsedBrief.audience}

${session.parsedBrief.timing ? `Timing: ${session.parsedBrief.timing}\n\n` : ''}${session.parsedBrief.budget ? `Budget: ${session.parsedBrief.budget}\n\n` : ''}KPIs:
${session.parsedBrief.kpis.map(kpi => `- ${kpi}`).join('\n')}

Constraints:
${session.parsedBrief.constraints.map(c => `- ${c}`).join('\n')}`;
        
        setBrief(formattedBrief);
      } else if (session.brief) {
        // Fallback to raw brief if parsed brief not available
        setBrief(session.brief);
      }
      
      loadGenerations();
      loadSavedCategories();
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

  const loadSavedCategories = async () => {
    if (!session?.id) return;

    try {
      const response = await fetch(`/api/generations/list?sessionId=${session.id}`);
      const data = await response.json();

      if (data.success && data.generations) {
        // Find the most recent exploration generation (all categories)
        const explorationGen = data.generations.find((g: any) => g.type === 'exploration');
        if (explorationGen && explorationGen.content) {
          const content = typeof explorationGen.content === 'string' 
            ? JSON.parse(explorationGen.content) 
            : explorationGen.content;
          if (content.categories) {
            setCategories(content.categories);
          }
        }

        // Find the most recent selection (user's chosen subcategories)
        const selectionGen = data.generations.find((g: any) => g.type === 'exploration-selection');
        if (selectionGen && selectionGen.content) {
          const content = typeof selectionGen.content === 'string' 
            ? JSON.parse(selectionGen.content) 
            : selectionGen.content;
          if (content.categories) {
            // Restore selected subcategories
            const selectedSubs = new Set<string>();
            const selectedCats = new Set<string>();
            
            content.categories.forEach((cat: any) => {
              cat.subcategories.forEach((sub: string) => {
                selectedSubs.add(sub);
              });
              // If all subcategories are selected, mark category as selected
              const allCatSubs = categories.find(c => c.name === cat.name)?.subcategories || [];
              if (allCatSubs.length > 0 && cat.subcategories.length === allCatSubs.length) {
                selectedCats.add(cat.name);
              }
            });
            
            setSelectedSubcategories(selectedSubs);
            setSelectedCategories(selectedCats);
            setEditedSelectedSubcategories(selectedSubs);
            setEditedSelectedCategories(selectedCats);
          }
        }
      }
    } catch (err) {
      console.error("Error loading saved categories:", err);
    }
  };

  const handleExplore = async () => {
    if (!session?.id) {
      setError("Session not found. Please refresh the page.");
      return;
    }

    setIsLoadingCategories(true);
    setError(null);
    setCategories([]);

    try {
      const response = await fetch("/api/explore-categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId: session.id }),
      });

      const data = await response.json();

      if (data.success && data.categories) {
        setCategories(data.categories);
        // Start with all categories collapsed
        setExpandedCategories(new Set());
        // Automatically enter edit mode when categories are first generated
        setEditMode(true);
        // Reload generations to show the new one
        await loadGenerations();
      } else {
        setError(data.error || "Failed to generate exploration categories");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  };

  const toggleCategorySelection = (categoryName: string, subcategories: string[]) => {
    const targetSet = editMode ? setEditedSelectedCategories : setSelectedCategories;
    const targetSubSet = editMode ? setEditedSelectedSubcategories : setSelectedSubcategories;
    
    targetSet(prev => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
        // Also deselect all subcategories
        targetSubSet(prevSub => {
          const nextSub = new Set(prevSub);
          subcategories.forEach(sub => nextSub.delete(sub));
          return nextSub;
        });
      } else {
        next.add(categoryName);
        // Also select all subcategories
        targetSubSet(prevSub => {
          const nextSub = new Set(prevSub);
          subcategories.forEach(sub => nextSub.add(sub));
          return nextSub;
        });
      }
      return next;
    });
  };

  const toggleSubcategorySelection = (subcategory: string, categoryName: string, allSubcategories: string[]) => {
    const targetSet = editMode ? setEditedSelectedSubcategories : setSelectedSubcategories;
    const targetCatSet = editMode ? setEditedSelectedCategories : setSelectedCategories;
    
    targetSet(prev => {
      const next = new Set(prev);
      if (next.has(subcategory)) {
        next.delete(subcategory);
        // If no subcategories are selected, deselect the category
        const remainingSelected = allSubcategories.filter(sub => 
          sub !== subcategory && next.has(sub)
        );
        if (remainingSelected.length === 0) {
          targetCatSet(prevCat => {
            const nextCat = new Set(prevCat);
            nextCat.delete(categoryName);
            return nextCat;
          });
        }
      } else {
        next.add(subcategory);
        // If all subcategories are now selected, select the category
        const allSelected = allSubcategories.every(sub => 
          sub === subcategory || next.has(sub)
        );
        if (allSelected) {
          targetCatSet(prevCat => {
            const nextCat = new Set(prevCat);
            nextCat.add(categoryName);
            return nextCat;
          });
        }
      }
      return next;
    });
  };

  const handleSaveSelection = async () => {
    if (!session?.id) return;

    setIsSaving(true);
    try {
      const selectedData = {
        categories: categories.map(cat => ({
          name: cat.name,
          subcategories: cat.subcategories.filter(sub => editedSelectedSubcategories.has(sub))
        })).filter(cat => cat.subcategories.length > 0)
      };

      // Save as a generation with type 'exploration-selection'
      await fetch('/api/generations/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          brand: null,
          type: 'exploration-selection',
          content: selectedData,
          step: 4
        })
      });

      // Update the main state with edited values
      setSelectedCategories(editedSelectedCategories);
      setSelectedSubcategories(editedSelectedSubcategories);
      setEditMode(false);
      
      // Reload generations to show the updated one
      await loadGenerations();
    } catch (err) {
      console.error("Error saving selection:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedSelectedCategories(selectedCategories);
    setEditedSelectedSubcategories(selectedSubcategories);
    setEditMode(false);
  };

  const handleContinue = () => {
    router.push("/results");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-16">
      <StepIndicator currentStep={4} />
      
      <PageHeader
        stepNumber={4}
        title="Strategic Exploration"
        description="Identify potential areas of exploration before deep research. Select categories and subcategories that interest you, or skip to ideation."
      />

      {/* Previous Generations */}
      {generations.length > 0 && (
        <GenerationBlocksContainer generations={generations} currentStep={4} />
      )}

      {/* Exploration Section */}
      <section className="space-y-4 rounded-xl border border-slate-700/70 bg-slate-900/40 p-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-100">
            Explore Strategic Opportunities
          </h2>
          <p className="text-sm text-slate-400">
            Generate AI-powered exploration categories based on your strategy brief and context pack. This optional step helps identify potential research areas before ideation.
          </p>
        </div>

        <button
          onClick={handleExplore}
          disabled={isLoadingCategories}
          className="flex items-center justify-center gap-2 w-full rounded-lg bg-purple-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          {isLoadingCategories ? "Generating..." : "Ideate"}
        </button>

        {error && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}
      </section>

      {/* Categories Display */}
      {categories.length > 0 && (
        <section className="rounded-lg border border-gold/30 bg-gold/10 overflow-hidden">
          <div className="flex items-center justify-between p-4">
            <span className="text-sm font-semibold text-gold">
              {editMode ? "Editing Selection" : "Exploration Categories"}
            </span>
            <div className="flex items-center gap-3">
              <p className="text-sm text-gold">
                {(editMode ? editedSelectedSubcategories : selectedSubcategories).size} selected
              </p>
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
                    onClick={handleSaveSelection}
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
            {categories.map((category) => {
              const isExpanded = expandedCategories.has(category.name);
              const activeSelectedCats = editMode ? editedSelectedCategories : selectedCategories;
              const activeSelectedSubs = editMode ? editedSelectedSubcategories : selectedSubcategories;
              const isCategorySelected = activeSelectedCats.has(category.name);
              const selectedSubsInCategory = category.subcategories.filter(sub => 
                activeSelectedSubs.has(sub)
              ).length;

              // In non-edit mode, only show categories with selected subcategories
              if (!editMode && selectedSubsInCategory === 0) {
                return null;
              }

              return (
                <div
                  key={category.name}
                  className="rounded-lg border border-slate-700 bg-slate-900/50 overflow-hidden"
                >
                  {/* Category Header */}
                  <div className="flex items-center gap-3 p-4">
                    {editMode && (
                      <input
                        type="checkbox"
                        checked={isCategorySelected}
                        onChange={() => toggleCategorySelection(category.name, category.subcategories)}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-gold focus:ring-gold focus:ring-offset-0"
                      />
                    )}
                    <button
                      onClick={() => toggleCategory(category.name)}
                      className="flex flex-1 items-center justify-between text-left hover:bg-slate-800/50 transition-colors rounded px-2 py-1"
                    >
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-200">
                          {category.name}
                        </h3>
                        {editMode && selectedSubsInCategory > 0 && (
                          <span className="rounded-full bg-gold/20 px-2 py-0.5 text-xs font-medium text-gold">
                            {selectedSubsInCategory}/{category.subcategories.length}
                          </span>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                  </div>

                  {/* Subcategories */}
                  {isExpanded && (
                    <div className="border-t border-slate-700 bg-slate-900/30 p-4">
                      {editMode ? (
                        <div className="space-y-1.5">
                          {category.subcategories.map((subcategory) => (
                            <label
                              key={subcategory}
                              className="flex items-center gap-3 rounded-lg p-3 hover:bg-slate-800/50 transition-colors cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={activeSelectedSubs.has(subcategory)}
                                onChange={() => toggleSubcategorySelection(subcategory, category.name, category.subcategories)}
                                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-gold focus:ring-gold focus:ring-offset-0"
                              />
                              <span className="text-sm text-slate-300">
                                {subcategory}
                              </span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {category.subcategories
                            .filter(sub => activeSelectedSubs.has(sub))
                            .map((subcategory) => (
                              <div
                                key={subcategory}
                                className="flex items-center gap-2 rounded-lg p-3"
                              >
                                <span className="text-slate-500">•</span>
                                <span className="text-sm text-slate-300">
                                  {subcategory}
                                </span>
                              </div>
                            ))}
                          {category.subcategories.filter(sub => activeSelectedSubs.has(sub)).length === 0 && (
                            <p className="text-sm text-slate-500 italic p-3">No subcategories selected</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          className="flex items-center gap-2 rounded-lg bg-gold px-6 py-3 font-medium text-black transition-colors hover:bg-gold/90"
        >
          Continue to Ideation <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </main>
  );
}
