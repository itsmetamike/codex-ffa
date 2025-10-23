"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import { StepIndicator } from "@/components/StepIndicator";
import { PageHeader } from "@/components/PageHeader";
import { Home, Sparkles, CheckCircle2, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { GenerationBlocksContainer } from "@/components/GenerationBlock";
import ReactMarkdown from "react-markdown";

type DeepResearchJob = {
  jobId: string;
  status: 'pending' | 'queued' | 'in_progress' | 'completed' | 'failed';
  result?: {
    outputText: string;
    output: any[];
  };
  error?: string;
  toolCalls?: any[];
  completedAt?: string;
};

export default function DeepResearchPage() {
  const router = useRouter();
  const { session, createSession, clearSession } = useSession();
  const [generations, setGenerations] = useState<any[]>([]);
  const [deepResearchPrompt, setDeepResearchPrompt] = useState<string | null>(null);
  const [deepResearchJob, setDeepResearchJob] = useState<DeepResearchJob | null>(null);
  const [isStartingResearch, setIsStartingResearch] = useState(false);
  const [isStartingLiteResearch, setIsStartingLiteResearch] = useState(false);
  const [researchMode, setResearchMode] = useState<'lite' | 'full'>('lite');
  const [useWebSearch, setUseWebSearch] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!session) {
      createSession();
    } else {
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
        
        // Extract research context
        const contextGen = data.generations.find((g: any) => g.type === 'research-context');
        if (contextGen && contextGen.content) {
          const content = typeof contextGen.content === 'string'
            ? JSON.parse(contextGen.content)
            : contextGen.content;
          if (content.deepResearchPrompt) {
            setDeepResearchPrompt(content.deepResearchPrompt);
          }
        }
      }
    } catch (err) {
      console.error("Error loading generations:", err);
    }
  };

  const handleStartNew = () => {
    clearSession();
    router.push("/");
  };

  const handleBack = () => {
    router.push("/results");
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Poll for research status
  useEffect(() => {
    if (deepResearchJob && (deepResearchJob.status === 'pending' || deepResearchJob.status === 'queued' || deepResearchJob.status === 'in_progress')) {
      pollingIntervalRef.current = setInterval(async () => {
        await checkResearchStatus(deepResearchJob.jobId);
      }, 5000);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [deepResearchJob?.jobId, deepResearchJob?.status]);

  const handleStartLiteResearch = async () => {
    if (!session?.id || isStartingLiteResearch) return;

    setIsStartingLiteResearch(true);
    try {
      const response = await fetch('/api/deep-research/lite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: session.id,
          useWebSearch
        })
      });

      const data = await response.json();

      if (data.success) {
        setDeepResearchJob({
          jobId: data.jobId,
          status: data.status || 'queued'
        });
        
        setTimeout(() => {
          console.log('[Lite Research] Starting status polling for job:', data.jobId);
        }, 1000);
      } else {
        console.error('Failed to start lite research:', data.error);
        alert(`Failed to start research: ${data.error}`);
      }
    } catch (error) {
      console.error('Error starting lite research:', error);
      alert('An error occurred while starting the research.');
    } finally {
      setIsStartingLiteResearch(false);
    }
  };

  const handleStartDeepResearch = async () => {
    if (!session?.id || isStartingResearch) return;

    setIsStartingResearch(true);
    try {
      const response = await fetch('/api/deep-research/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id })
      });

      const data = await response.json();

      if (data.success) {
        setDeepResearchJob({
          jobId: data.jobId,
          status: data.status || 'queued'
        });
        
        setTimeout(() => {
          console.log('[Deep Research] Starting status polling for job:', data.jobId);
        }, 1000);
      } else {
        console.error('Failed to start deep research:', data.error);
        alert(`Failed to start research: ${data.error}`);
      }
    } catch (error) {
      console.error('Error starting deep research:', error);
      alert('An error occurred while starting the research.');
    } finally {
      setIsStartingResearch(false);
    }
  };

  const checkResearchStatus = async (jobId: string) => {
    try {
      const response = await fetch(`/api/deep-research/status?jobId=${jobId}`);
      const data = await response.json();

      if (data.success) {
        setDeepResearchJob({
          jobId,
          status: data.status,
          result: data.result,
          error: data.error,
          toolCalls: data.toolCalls,
          completedAt: data.completedAt
        });

        if (data.status === 'completed' || data.status === 'failed') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      } else {
        console.log('[Deep Research] Status check returned error, will retry:', data.error);
      }
    } catch (error) {
      console.error('Error checking research status:', error);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-16">
      <StepIndicator currentStep={6} />
      
      <PageHeader
        stepNumber={6}
        title="Deep Research"
        description="Generate comprehensive strategic research using AI-powered analysis with web search and data validation."
      />

      {/* Referenced Files */}
      {generations.length > 0 && (
        <GenerationBlocksContainer generations={generations} currentStep={6} />
      )}

      {/* Research Context Display */}
      {deepResearchPrompt && !deepResearchJob && (
        <section className="rounded-xl border border-gold/50 bg-gold/10 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-gold" />
            <h2 className="text-xl font-semibold text-gold">Research Context Ready</h2>
          </div>
          <p className="text-sm text-slate-300">
            Your comprehensive research prompt has been compiled and is ready for deep research analysis:
          </p>
          <div className="rounded-lg border border-gold/30 bg-slate-900/50 p-4 max-h-96 overflow-y-auto">
            <h3 className="text-sm font-semibold text-slate-100 mb-3">Deep Research Prompt</h3>
            <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
              {deepResearchPrompt}
            </pre>
          </div>
          
          {/* Research Mode Toggle */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="radio"
                  id="lite-mode"
                  name="research-mode"
                  checked={researchMode === 'lite'}
                  onChange={() => setResearchMode('lite')}
                  className="w-4 h-4 text-blue-600"
                />
                <label htmlFor="lite-mode" className="text-sm font-medium text-slate-100">
                  Lite Research (Recommended)
                </label>
              </div>
              <p className="text-xs text-slate-400 ml-6">
                Fast, cost-effective. Single strategy with frameworks. Uses o4-mini-deep-research.
              </p>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="radio"
                  id="full-mode"
                  name="research-mode"
                  checked={researchMode === 'full'}
                  onChange={() => setResearchMode('full')}
                  className="w-4 h-4 text-purple-600"
                />
                <label htmlFor="full-mode" className="text-sm font-medium text-slate-100">
                  Full Deep Research
                </label>
              </div>
              <p className="text-xs text-slate-400 ml-6">
                Comprehensive, expensive ($10-100+). 3 strategies, extensive research. Uses o3-deep-research.
              </p>
            </div>
          </div>

          {/* Web Search Toggle (only for Lite mode) */}
          {researchMode === 'lite' && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700">
              <input
                type="checkbox"
                id="web-search"
                checked={useWebSearch}
                onChange={(e) => setUseWebSearch(e.target.checked)}
                className="w-4 h-4 text-blue-600"
              />
              <div className="flex-1">
                <label htmlFor="web-search" className="text-sm font-medium text-slate-100 cursor-pointer">
                  Enable Web Search
                </label>
                <p className="text-xs text-slate-400 mt-0.5">
                  {useWebSearch 
                    ? "Cost: ~$0.50-2.00 | Searches web for current data (1-3 min)"
                    : "Cost: ~$0.01 | Uses only provided context (5-15 sec)"}
                </p>
              </div>
            </div>
          )}

          {/* Start Research Button */}
          <button
            onClick={researchMode === 'lite' ? handleStartLiteResearch : handleStartDeepResearch}
            disabled={(researchMode === 'lite' ? isStartingLiteResearch : isStartingResearch)}
            className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-purple-600 hover:bg-purple-700"
          >
            {(researchMode === 'lite' ? isStartingLiteResearch : isStartingResearch) ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting Research...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {researchMode === 'lite' ? 'Start Lite Research' : 'Start Full Deep Research'}
              </>
            )}
          </button>
        </section>
      )}

      {/* Deep Research Status */}
      {deepResearchJob && (
        <section className="rounded-xl border border-purple-500/50 bg-purple-500/10 p-6 space-y-4">
          <div className="flex items-center gap-2">
            {deepResearchJob.status === 'pending' || deepResearchJob.status === 'queued' || deepResearchJob.status === 'in_progress' ? (
              <>
                <Loader2 className="h-5 w-5 text-purple-400 animate-spin" />
                <h2 className="text-xl font-semibold text-purple-400">
                  {deepResearchJob.status === 'pending' || deepResearchJob.status === 'queued' ? 'Research Queued' : 'Research In Progress'}
                </h2>
              </>
            ) : deepResearchJob.status === 'completed' ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                <h2 className="text-xl font-semibold text-green-400">Research Complete</h2>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-red-400" />
                <h2 className="text-xl font-semibold text-red-400">Research Failed</h2>
              </>
            )}
          </div>

          {(deepResearchJob.status === 'pending' || deepResearchJob.status === 'queued' || deepResearchJob.status === 'in_progress') && (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                {researchMode === 'lite' 
                  ? `The o4-mini-deep-research model is ${useWebSearch ? 'searching the web and ' : ''}analyzing your context to create a focused strategy. This typically takes ${useWebSearch ? '1-3 minutes' : '10-30 seconds'}.`
                  : 'The o3-deep-research model is analyzing hundreds of sources to create your comprehensive strategy report. This typically takes 10-30 minutes depending on complexity.'}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 animate-pulse" style={{ width: '60%' }}></div>
                </div>
                <span className="text-xs text-slate-400">Researching...</span>
              </div>
              <p className="text-xs text-slate-500">
                You can leave this page and return later. The research will continue in the background.
              </p>
            </div>
          )}

          {deepResearchJob.status === 'failed' && deepResearchJob.error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-sm text-red-300">{deepResearchJob.error}</p>
            </div>
          )}

          {deepResearchJob.status === 'completed' && deepResearchJob.result && (
            <div className="space-y-4">
              {/* Tool Calls Summary */}
              {deepResearchJob.toolCalls && deepResearchJob.toolCalls.length > 0 && (
                <div className="rounded-lg border border-purple-500/30 bg-slate-900/50 p-4">
                  <h3 className="text-sm font-semibold text-slate-100 mb-3">Research Activity</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {deepResearchJob.toolCalls.map((call: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-400">
                        <span className="text-purple-400">•</span>
                        <span>
                          {call.type === 'web_search_call' && call.action?.type === 'search' && (
                            <>Searched: "{call.action.query}"</>
                          )}
                          {call.type === 'web_search_call' && call.action?.type === 'open_page' && (
                            <>Opened page: {call.action.url}</>
                          )}
                          {call.type === 'code_interpreter_call' && (
                            <>Ran analysis code</>
                          )}
                          {call.type === 'file_search_call' && (
                            <>Searched internal documents</>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Research Result */}
              <div className="rounded-lg border border-purple-500/30 bg-slate-900/50 p-6">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Strategic Research Report</h3>
                {(() => {
                  const cleanText = (text: string | undefined): string => {
                    if (!text) return '';
                    return text
                      .replace(/\([^\)]*https?:\/\/[^\)]*\)/g, '')
                      .replace(/\([^\)]*\[[^\]]*\]\([^\)]*\)[^\)]*\)/g, '')
                      .replace(/\)\)/g, ')')
                      .replace(/\s+/g, ' ')
                      .trim();
                  };

                  // Helper to extract strategy from various JSON structures
                  const extractStrategy = (obj: any): any => {
                    // Direct strategy object
                    if (obj.title && obj.one_line_positioning) return obj;
                    
                    // Nested under "strategy" key
                    if (obj.strategy) return extractStrategy(obj.strategy);
                    
                    // Nested under "strategies" array
                    if (obj.strategies && Array.isArray(obj.strategies) && obj.strategies.length > 0) {
                      return obj.strategies[0];
                    }
                    
                    // Check if it's wrapped in "meta" + "strategy"
                    if (obj.meta && obj.strategy) return extractStrategy(obj.strategy);
                    
                    return null;
                  };

                  try {
                    // First, try to clean the output text (remove markdown code blocks if present)
                    let cleanedText = deepResearchJob.result.outputText.trim();
                    
                    // Remove markdown code block markers
                    cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');
                    
                    const jsonResult = JSON.parse(cleanedText);
                    const strategy = extractStrategy(jsonResult);
                    
                    if (strategy && strategy.title) {
                      return (
                        <div className="space-y-6">
                          {/* Strategy Header */}
                          <div className="border-b border-slate-700 pb-4">
                            <h4 className="text-2xl font-bold text-slate-100 mb-2">{strategy.title}</h4>
                            <p className="text-lg text-slate-300 italic">{strategy.one_line_positioning}</p>
                          </div>

                          {/* Core Mechanic */}
                          <div>
                            <h5 className="text-sm font-semibold text-slate-200 mb-2">Core Mechanic</h5>
                            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                              {cleanText(strategy.core_mechanic)}
                            </p>
                          </div>

                          {/* Channel Mix */}
                          <div>
                            <h5 className="text-sm font-semibold text-slate-200 mb-2">Channel Mix</h5>
                            <div className="flex flex-wrap gap-2">
                              {strategy.channel_mix?.map((channel: string, idx: number) => (
                                <span key={idx} className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs">
                                  {channel}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* TOWS Analysis */}
                          {strategy.tows && (
                            <div className="border-t border-slate-700 pt-4">
                              <h5 className="text-sm font-semibold text-slate-200 mb-3">TOWS Analysis</h5>
                              <div className="space-y-3 text-sm">
                                {strategy.tows.so_move && (
                                  <div className="bg-slate-800/30 p-3 rounded">
                                    <span className="font-medium text-purple-400 block mb-1">SO Move (Strengths × Opportunities):</span>
                                    <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                                      {cleanText(strategy.tows.so_move)}
                                    </p>
                                  </div>
                                )}
                                {strategy.tows.st_move && (
                                  <div className="bg-slate-800/30 p-3 rounded">
                                    <span className="font-medium text-purple-400 block mb-1">ST Move (Strengths × Threats):</span>
                                    <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                                      {cleanText(strategy.tows.st_move)}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* McKinsey 7S */}
                          {strategy.mckinsey_7s && (
                            <div className="bg-slate-800/30 p-3 rounded">
                              <h5 className="text-sm font-semibold text-slate-200 mb-2">McKinsey 7S Alignment</h5>
                              <div className="text-sm space-y-1">
                                <p className="whitespace-pre-wrap"><span className="text-purple-400">Shared Values:</span> <span className="text-slate-300">{cleanText(strategy.mckinsey_7s.shared_values)}</span></p>
                                {strategy.mckinsey_7s.misalignment_flag && strategy.mckinsey_7s.misalignment_flag !== "None" && (
                                  <p><span className="text-yellow-400">Misalignment:</span> <span className="text-slate-300">{cleanText(strategy.mckinsey_7s.misalignment_flag)}</span></p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Three Horizons */}
                          {strategy.three_horizons && (
                            <div className="bg-slate-800/30 p-3 rounded">
                              <h5 className="text-sm font-semibold text-slate-200 mb-2">Three Horizons Classification</h5>
                              <div className="flex items-start gap-3">
                                <span className="px-3 py-1 rounded bg-slate-700 text-slate-200 font-mono text-sm">{strategy.three_horizons.horizon}</span>
                                <p className="text-sm text-slate-300 flex-1 leading-relaxed whitespace-pre-wrap">
                                  {cleanText(strategy.three_horizons.rationale)}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* KPIs */}
                          {strategy.kpis && strategy.kpis.length > 0 && (
                            <div className="border-t border-slate-700 pt-4">
                              <h5 className="text-sm font-semibold text-slate-200 mb-2">Key Performance Indicators</h5>
                              <ul className="space-y-2 text-sm">
                                {strategy.kpis.map((kpi: string, idx: number) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span className="text-purple-400 mt-1">•</span>
                                    <span className="text-slate-300 flex-1 leading-relaxed">
                                      {cleanText(kpi)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Sources */}
                          {strategy.sources && strategy.sources.length > 0 && (
                            <div className="border-t border-slate-700 pt-4">
                              <h5 className="text-sm font-semibold text-slate-200 mb-2">Sources ({strategy.sources.length})</h5>
                              <ul className="space-y-1 text-sm">
                                {strategy.sources.map((source: any, idx: number) => (
                                  <li key={idx}>
                                    <a 
                                      href={source.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-1"
                                    >
                                      {source.title}
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    }
                  } catch (e) {
                    console.error('Failed to parse JSON:', e);
                    console.log('Raw output:', deepResearchJob.result.outputText.substring(0, 500));
                    // Fall back to markdown rendering
                  }

                  // Fallback: Try to render as markdown or display raw JSON nicely
                  const outputText = deepResearchJob.result.outputText;
                  
                  // If it looks like JSON but failed to parse, show it formatted
                  if (outputText.trim().startsWith('{') || outputText.trim().startsWith('[')) {
                    try {
                      const parsed = JSON.parse(outputText);
                      return (
                        <div className="space-y-4">
                          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                            <p className="text-sm text-amber-300 mb-2">
                              ⚠️ The research output is in JSON format but couldn't be parsed into a structured view. Showing formatted JSON:
                            </p>
                          </div>
                          <pre className="text-xs text-slate-300 whitespace-pre-wrap bg-slate-800/50 p-4 rounded-lg overflow-x-auto">
                            {JSON.stringify(parsed, null, 2)}
                          </pre>
                        </div>
                      );
                    } catch {
                      // Not valid JSON, continue to markdown
                    }
                  }

                  return (
                    <div className="prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown
                        components={{
                          a: (props) => (
                            <a
                              {...props}
                              className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-1"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {props.children}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ),
                        }}
                      >
                        {outputText}
                      </ReactMarkdown>
                    </div>
                  );
                })()}
              </div>

              {deepResearchJob.completedAt && (
                <p className="text-xs text-slate-500 text-center">
                  Completed at {new Date(deepResearchJob.completedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* No Research Context Warning */}
      {!deepResearchPrompt && (
        <section className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-6">
          <h2 className="text-lg font-semibold text-amber-400 mb-2">Research Context Required</h2>
          <p className="text-sm text-slate-300">
            You need to complete the Pre-Research Consultation (Step 5) and generate a research context before starting deep research.
          </p>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors"
          >
            Go to Step 5
          </button>
        </section>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900 px-6 py-3 font-medium text-slate-100 transition-colors hover:bg-slate-700"
        >
          ← Back to Consultation
        </button>
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
