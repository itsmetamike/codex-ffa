"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import { StepIndicator } from "@/components/StepIndicator";
import { PageHeader } from "@/components/PageHeader";
import { Home, Send, Sparkles, CheckCircle2, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { GenerationBlocksContainer } from "@/components/GenerationBlock";
import ReactMarkdown from "react-markdown";

type ContextPack = {
  brand_voice: string;
  visual_identity: string;
  audience_summary: string;
  key_insights: string[];
  creative_lessons: string[];
  strategy_highlights: string[];
  budget_notes?: string;
  risks_or_cautions: string[];
  guardrails?: Array<{ bullet: string }>;
};

type ExplorationCategory = {
  name: string;
  subcategories: string[];
};

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ResearchTopic = {
  title: string;
  rationale: string;
};

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

export default function ResultsPage() {
  const router = useRouter();
  const { session, createSession, clearSession } = useSession();
  const [generations, setGenerations] = useState<any[]>([]);
  const [contextPack, setContextPack] = useState<ContextPack | null>(null);
  const [explorationCategories, setExplorationCategories] = useState<ExplorationCategory[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [researchTopics, setResearchTopics] = useState<ResearchTopic[]>([]);
  const [isExtractingTopics, setIsExtractingTopics] = useState(false);
  const [hasInitiatedChat, setHasInitiatedChat] = useState(false);
  const [explorationCategoriesTimestamp, setExplorationCategoriesTimestamp] = useState<string | null>(null);
  const [deepResearchPrompt, setDeepResearchPrompt] = useState<string | null>(null);
  const [deepResearchJob, setDeepResearchJob] = useState<DeepResearchJob | null>(null);
  const [isStartingResearch, setIsStartingResearch] = useState(false);
  const [liteResearchResult, setLiteResearchResult] = useState<any>(null);
  const [isStartingLiteResearch, setIsStartingLiteResearch] = useState(false);
  const [researchMode, setResearchMode] = useState<'lite' | 'full'>('lite');
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
        
        // Extract context pack
        const contextGen = data.generations.find((g: any) => g.type === 'context');
        if (contextGen && contextGen.content) {
          const content = typeof contextGen.content === 'string' 
            ? JSON.parse(contextGen.content) 
            : contextGen.content;
          setContextPack(content);
        }

        // Extract exploration categories
        const selectionGen = data.generations.find((g: any) => g.type === 'exploration-selection');
        let categoriesChanged = false;
        if (selectionGen && selectionGen.content) {
          const content = typeof selectionGen.content === 'string' 
            ? JSON.parse(selectionGen.content) 
            : selectionGen.content;
          if (content.categories) {
            // Check if exploration categories have changed
            const newTimestamp = selectionGen.createdAt || selectionGen.updatedAt;
            if (newTimestamp !== explorationCategoriesTimestamp) {
              // Reset chat if categories changed
              setMessages([]);
              setHasInitiatedChat(false);
              setResearchTopics([]);
              setExplorationCategoriesTimestamp(newTimestamp);
              categoriesChanged = true;
            }
            setExplorationCategories(content.categories);
          }
        }

        // Extract research context if it exists (but only if categories haven't just changed)
        if (!categoriesChanged) {
          const contextGen = data.generations.find((g: any) => g.type === 'research-context');
          if (contextGen && contextGen.content) {
            const content = typeof contextGen.content === 'string'
              ? JSON.parse(contextGen.content)
              : contextGen.content;
            if (content.deepResearchPrompt) {
              setDeepResearchPrompt(content.deepResearchPrompt);
              // Also set a flag to show the context was generated
              setResearchTopics([{
                title: 'Research Context Generated',
                rationale: ''
              }]);
            }
            // Restore consultation chat messages
            if (content.data?.consultationChat && Array.isArray(content.data.consultationChat)) {
              setMessages(content.data.consultationChat);
              setHasInitiatedChat(true);
            }
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      // Start polling
      pollingIntervalRef.current = setInterval(async () => {
        await checkResearchStatus(deepResearchJob.jobId);
      }, 5000); // Poll every 5 seconds

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [deepResearchJob?.jobId, deepResearchJob?.status]);

  useEffect(() => {
    // Initiate chat when context is available and chat hasn't started
    if (!hasInitiatedChat && researchTopics.length === 0 && messages.length === 0 && (contextPack || session?.parsedBrief || explorationCategories.length > 0)) {
      initiateConsultation();
    }
  }, [contextPack, session?.parsedBrief, explorationCategories, hasInitiatedChat, researchTopics, messages]);

  const initiateConsultation = async () => {
    if (!session?.id || hasInitiatedChat) return;

    setHasInitiatedChat(true);
    setIsLoading(true);

    try {
      const response = await fetch('/api/consultation-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          messages: [],
          action: 'initiate'
        })
      });

      const data = await response.json();

      if (data.success && data.message) {
        setMessages([{
          role: 'assistant',
          content: data.message
        }]);
      }
    } catch (error) {
      console.error('Error initiating consultation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !session?.id) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage.trim()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/consultation-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          messages: updatedMessages
        })
      });

      const data = await response.json();

      if (data.success && data.message) {
        setMessages([...updatedMessages, {
          role: 'assistant',
          content: data.message
        }]);
      } else {
        console.error('Failed to get response:', data.error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExtractTopics = async () => {
    if (!session?.id || messages.length === 0) return;

    setIsExtractingTopics(true);
    try {
      const response = await fetch('/api/consultation-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          messages,
          action: 'extract_topics',
          focusAreas: selectedFocusAreas
        })
      });

      const data = await response.json();

      if (data.success && data.deepResearchPrompt) {
        // Store the full prompt
        setDeepResearchPrompt(data.deepResearchPrompt);
        setResearchTopics([{
          title: 'Research Context Generated',
          rationale: ''
        }]);
        await loadGenerations(); // Reload to show the saved context
      } else {
        console.error('Failed to generate research context:', data.error);
      }
    } catch (error) {
      console.error('Error extracting topics:', error);
    } finally {
      setIsExtractingTopics(false);
    }
  };

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
        // Lite research now uses polling like Full Deep Research
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
        
        // Wait a moment before starting to poll to ensure DB commit
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

        // Stop polling if completed or failed
        if (data.status === 'completed' || data.status === 'failed') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      } else {
        // If job not found, it might be a timing issue - keep polling
        console.log('[Deep Research] Status check returned error, will retry:', data.error);
      }
    } catch (error) {
      console.error('Error checking research status:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const focusAreaOptions = [
    'Innovation',
    'Riding Trend Wave',
    'Tried and True',
    'Competitor Weakness',
    'Cost Efficiency',
    'Speed to Market',
    'Brand Authority',
    'Community Building',
    'Data-Driven'
  ];

  const toggleFocusArea = (area: string) => {
    setSelectedFocusAreas(prev => 
      prev.includes(area) 
        ? prev.filter(a => a !== area)
        : [...prev, area]
    );
  };

  const getContextualExampleQuestions = () => {
    const questions: string[] = [];

    // Question based on exploration categories
    if (explorationCategories.length > 0) {
      const firstCategory = explorationCategories[0];
      if (firstCategory.subcategories.length > 0) {
        const subcategory = firstCategory.subcategories[0];
        questions.push(`How should we research ${subcategory}?`);
      }
    }

    // Question based on brief objective
    if (session?.parsedBrief?.objective) {
      const objective = session.parsedBrief.objective.toLowerCase();
      if (objective.includes('launch') || objective.includes('introduce')) {
        questions.push("What insights do we need for a successful launch?");
      } else if (objective.includes('awareness') || objective.includes('brand')) {
        questions.push("How can we maximize brand awareness impact?");
      } else if (objective.includes('engagement') || objective.includes('community')) {
        questions.push("What drives engagement with our audience?");
      } else {
        questions.push("What research would best support our objective?");
      }
    }

    // Question based on audience - extract just the core demographic
    if (session?.parsedBrief?.audience) {
      const audience = session.parsedBrief.audience;
      // Extract just the first part before any detailed description
      const shortAudience = audience.split(/[,.(]/)[0].trim();
      // Limit to first 5 words max
      const audienceWords = shortAudience.split(' ').slice(0, 5).join(' ');
      questions.push(`What behavioral insights matter most for ${audienceWords}?`);
    }

    // Question based on context pack insights
    if (contextPack?.key_insights && contextPack.key_insights.length > 0) {
      questions.push("How can we build on our past performance?");
    }

    // Fallback questions if we don't have enough context
    if (questions.length < 3) {
      questions.push("What research gaps should we address?");
      questions.push("Can you help prioritize our research focus?");
      questions.push("What trends should we investigate?");
    }

    return questions.slice(0, 3);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-16">
      <StepIndicator currentStep={4} />
      
      <PageHeader
        stepNumber={4}
        title="Pre-Research Consultation"
        description="Discuss your campaign strategy with our research consultant to finalize your single research topic for the deep research phase."
      />

      {/* Referenced Files */}
      {generations.length > 0 && (
        <GenerationBlocksContainer generations={generations} currentStep={4} />
      )}


      {/* Removed Deep Research Status - Now on Step 6 */}
      {deepResearchJob && false && (
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
                  // Helper function to clean text from inline citations and formatting issues
                  const cleanText = (text: string | undefined): string => {
                    if (!text) return '';
                    return text
                      .replace(/\([^\)]*https?:\/\/[^\)]*\)/g, '') // Remove citations with URLs
                      .replace(/\([^\)]*\[[^\]]*\]\([^\)]*\)[^\)]*\)/g, '') // Remove markdown links in parens
                      .replace(/\)\)/g, ')') // Fix double closing parens
                      .replace(/\s+/g, ' ') // Normalize whitespace
                      .trim();
                  };

                  // Try to parse as JSON first (for Lite Research)
                  try {
                    const jsonResult = JSON.parse(deepResearchJob.result.outputText);
                    if (jsonResult.strategy) {
                      // Lite Research format
                      const strategy = jsonResult.strategy;
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
                            <p className="text-sm text-slate-300 leading-relaxed">
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
                          <div className="border-t border-slate-700 pt-4">
                            <h5 className="text-sm font-semibold text-slate-200 mb-3">TOWS Analysis</h5>
                            <div className="space-y-3 text-sm">
                              <div className="bg-slate-800/30 p-3 rounded">
                                <span className="font-medium text-purple-400 block mb-1">SO Move (Strengths × Opportunities):</span>
                                <p className="text-slate-300 leading-relaxed">
                                  {cleanText(strategy.tows?.so_move)}
                                </p>
                              </div>
                              <div className="bg-slate-800/30 p-3 rounded">
                                <span className="font-medium text-purple-400 block mb-1">ST Move (Strengths × Threats):</span>
                                <p className="text-slate-300 leading-relaxed">
                                  {cleanText(strategy.tows?.st_move)}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* McKinsey 7S */}
                          <div className="bg-slate-800/30 p-3 rounded">
                            <h5 className="text-sm font-semibold text-slate-200 mb-2">McKinsey 7S Alignment</h5>
                            <div className="text-sm space-y-1">
                              <p><span className="text-purple-400">Shared Values:</span> <span className="text-slate-300">{cleanText(strategy.mckinsey_7s?.shared_values)}</span></p>
                              {strategy.mckinsey_7s?.misalignment_flag && strategy.mckinsey_7s.misalignment_flag !== "None" && (
                                <p><span className="text-yellow-400">Misalignment:</span> <span className="text-slate-300">{cleanText(strategy.mckinsey_7s.misalignment_flag)}</span></p>
                              )}
                            </div>
                          </div>

                          {/* Three Horizons */}
                          <div className="bg-slate-800/30 p-3 rounded">
                            <h5 className="text-sm font-semibold text-slate-200 mb-2">Three Horizons Classification</h5>
                            <div className="flex items-start gap-3">
                              <span className="px-3 py-1 rounded bg-slate-700 text-slate-200 font-mono text-sm">{strategy.three_horizons?.horizon}</span>
                              <p className="text-sm text-slate-300 flex-1 leading-relaxed">
                                {cleanText(strategy.three_horizons?.rationale)}
                              </p>
                            </div>
                          </div>

                          {/* KPIs */}
                          <div className="border-t border-slate-700 pt-4">
                            <h5 className="text-sm font-semibold text-slate-200 mb-2">Key Performance Indicators</h5>
                            <ul className="space-y-2 text-sm">
                              {strategy.kpis?.map((kpi: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-purple-400 mt-1">•</span>
                                  <span className="text-slate-300 flex-1 leading-relaxed">
                                    {cleanText(kpi)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>

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

                          {/* Compliance & AI Policy */}
                          <div className="grid grid-cols-2 gap-4 border-t border-slate-700 pt-4">
                            {strategy.regional_compliance && strategy.regional_compliance.length > 0 && (
                              <div>
                                <h5 className="text-sm font-semibold text-slate-200 mb-2">Regional Compliance</h5>
                                <div className="space-y-2 text-xs">
                                  {strategy.regional_compliance.map((comp: any, idx: number) => (
                                    <div key={idx} className="bg-slate-800/50 p-2 rounded">
                                      <p><span className="text-purple-400">{comp.region}:</span> {cleanText(comp.law)}</p>
                                      <p className="text-slate-400 mt-1 leading-relaxed">Basis: {cleanText(comp.lawful_basis)}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {strategy.ai_use_policy && (
                              <div>
                                <h5 className="text-sm font-semibold text-slate-200 mb-2">AI Use Policy</h5>
                                <div className="text-xs space-y-1 bg-slate-800/50 p-2 rounded">
                                  <p><span className="text-purple-400">Area:</span> {cleanText(strategy.ai_use_policy.area)}</p>
                                  <p className="text-purple-400 mt-2">Disclosure:</p>
                                  <p className="text-slate-300 leading-relaxed">{cleanText(strategy.ai_use_policy.disclosure)}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                  } catch (e) {
                    // Not JSON or different format, render as markdown
                  }

                  // Default: render as markdown (Full Deep Research)
                  return (
                    <div className="prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown
                        components={{
                          a: ({ node, ...props }) => (
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
                        {deepResearchJob.result.outputText}
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

      {/* Section 1: Chat Interface */}
      {(contextPack || session?.parsedBrief || explorationCategories.length > 0) && (
        <section className="rounded-xl border border-slate-700/70 bg-slate-900/40 overflow-hidden">
          <div className="border-b border-slate-700/70 bg-slate-900/60 p-4">
            <h2 className="text-lg font-semibold text-slate-100">Consultation Chat</h2>
            <p className="text-sm text-slate-400 mt-1">
              Discuss your campaign with our research consultant. Ask questions, explore ideas, and clarify your research needs.
            </p>
          </div>

          {/* Chat Messages */}
          <div className="h-96 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Sparkles className="h-12 w-12 text-gold/50 mb-4" />
                <p className="text-slate-400 text-sm max-w-md">
                  Ask a question or share what you'd like to explore.
                </p>
                <div className="mt-6 space-y-2 text-left w-full max-w-lg">
                  <p className="text-xs text-slate-500 font-semibold">Suggested questions based on your campaign:</p>
                  {getContextualExampleQuestions().map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInputMessage(question)}
                      className="block w-full text-left text-sm text-slate-400 hover:text-gold transition-colors p-2 rounded hover:bg-slate-800/50"
                    >
                      • {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-gold text-black'
                      : 'bg-slate-800 text-slate-100'
                  }`}
                >
                  <p className="text-sm font-medium mb-2">
                    {message.role === 'user' ? 'You' : 'Research Consultant'}
                  </p>
                  <div className={`prose prose-sm max-w-none ${
                    message.role === 'user' 
                      ? 'prose-headings:text-black prose-p:text-black prose-strong:text-black prose-li:text-black' 
                      : 'prose-invert prose-headings:text-slate-100 prose-p:text-slate-100 prose-strong:text-slate-100 prose-li:text-slate-100'
                  }`}>
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-4 bg-slate-800">
                  <p className="text-sm font-medium mb-1 text-slate-100">Research Consultant</p>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="border-t border-slate-700/70 bg-slate-900/60 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 font-medium text-black transition-colors hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Section 2: Research Focus Areas */}
      {messages.length > 0 && (
        <section className="rounded-xl border border-slate-700/70 bg-slate-900/40 overflow-hidden">
          <div className="border-b border-slate-700/70 bg-slate-900/60 p-4">
            <h2 className="text-lg font-semibold text-slate-100">Research Focus Areas</h2>
            <p className="text-sm text-slate-400 mt-1">
              Select strategic angles to guide your research (optional)
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-2">
              {focusAreaOptions.map((area) => (
                <button
                  key={area}
                  onClick={() => toggleFocusArea(area)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    selectedFocusAreas.includes(area)
                      ? 'bg-purple-600 text-white border-2 border-purple-400 shadow-lg shadow-purple-500/20'
                      : 'bg-slate-800 text-slate-300 border border-slate-600 hover:bg-slate-700 hover:border-slate-500'
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
            {selectedFocusAreas.length > 0 && (
              <p className="text-xs text-purple-400 mt-3">
                {selectedFocusAreas.length} focus area{selectedFocusAreas.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        </section>
      )}

      {/* Section 3: Generate Research Context */}
      {messages.length > 0 && (
        <section className="rounded-xl border border-slate-700/70 bg-slate-900/40 overflow-hidden">
          <div className="border-b border-slate-700/70 bg-slate-900/60 p-4">
            <h2 className="text-lg font-semibold text-slate-100">Generate Research Context</h2>
            <p className="text-sm text-slate-400 mt-1">
              When you're ready, generate the comprehensive research context for deep research analysis
            </p>
          </div>
          <div className="p-6">
            <button
              onClick={handleExtractTopics}
              disabled={isExtractingTopics || isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-5 w-5" />
              {isExtractingTopics ? 'Generating Research Context...' : 'Generate Research Context'}
            </button>
          </div>
        </section>
      )}

      {/* Section 4: Research Context Generated - Navigate to Step 5 */}
      {researchTopics.length > 0 && researchTopics[0] && deepResearchPrompt && (
        <section className="rounded-xl border border-gold/50 bg-gold/10 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-gold" />
            <h2 className="text-xl font-semibold text-gold">Research Context Generated</h2>
          </div>
          <p className="text-sm text-slate-300">
            Your comprehensive research context is ready! Proceed to Step 5 to start deep research analysis.
          </p>
          <button
            onClick={() => router.push('/deep-research')}
            className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white transition-colors bg-purple-600 hover:bg-purple-700"
          >
            <Sparkles className="h-5 w-5" />
            Continue to Deep Research →
          </button>
        </section>
      )}

      {/* Missing Prerequisites Warning */}
      {researchTopics.length === 0 && !contextPack && !session?.parsedBrief && explorationCategories.length === 0 && (
        <section className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-6">
          <h2 className="text-lg font-semibold text-amber-400 mb-2">Prerequisites Required</h2>
          <p className="text-sm text-slate-300">
            The consultation chat requires at least one of the following:
          </p>
          <ul className="list-disc list-inside text-sm text-slate-400 mt-3 space-y-1">
            <li>Context Pack (Step 1)</li>
            <li>Strategy Brief (Step 2)</li>
            <li>Exploration Categories (Step 3)</li>
          </ul>
          <p className="text-sm text-slate-400 mt-4">
            Please complete previous steps to access the pre-research consultation.
          </p>
        </section>
      )}

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
