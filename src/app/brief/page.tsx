"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import { StepIndicator } from "@/components/StepIndicator";
import { PageHeader } from "@/components/PageHeader";
import { ArrowRight, Sparkles, ChevronDown, ChevronRight } from "lucide-react";
import type { ParsedBrief } from "@/lib/schemas";
import { GenerationBlocksContainer } from "@/components/GenerationBlock";

type Question = {
  field: string;
  question: string;
};

type ConversationStep = {
  type: "question" | "answer";
  content: string;
  field?: string;
};

export default function BriefPage() {
  const router = useRouter();
  const { session, createSession, updateSession } = useSession();
  const [briefText, setBriefText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ParsedBrief | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Interactive flow state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [conversation, setConversation] = useState<ConversationStep[]>([]);
  const [userAnswer, setUserAnswer] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);
  const [isIdeating, setIsIdeating] = useState(false);
  const [isIdeatingBrief, setIsIdeatingBrief] = useState(false);
  const [showEditMode, setShowEditMode] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    objective: true,
    audience: false,
    timing: false,
    kpis: false,
    constraints: false
  });
  const [editedResult, setEditedResult] = useState<ParsedBrief | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [generations, setGenerations] = useState<any[]>([]);

  // Create session if none exists, load existing brief if available
  useEffect(() => {
    if (!session) {
      createSession();
    } else {
      if (session.brief) {
        setBriefText(session.brief);
        if (session.parsedBrief) {
          setResult(session.parsedBrief);
          setEditedResult(session.parsedBrief);
          setShowResult(true);
          setAnalysisComplete(true);
        }
      }
      loadGenerations();
    }
  }, [session?.id]);

  const handleParse = async () => {
    if (!briefText.trim()) {
      setError("Please enter a brief to parse");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setQuestions([]);
    setConversation([]);
    setCurrentQuestionIndex(0);
    setAnalysisComplete(false);
    setShowResult(false);

    try {
      // Step 1: Parse the brief (brand will be fetched from session's context pack)
      const parseResponse = await fetch("/api/parse-brief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          text: briefText,
          sessionId: session?.id
        }),
      });

      const parseData = await parseResponse.json();

      if (!parseData.success) {
        setError(parseData.error);
        setIsLoading(false);
        return;
      }

      setResult(parseData.data);

      // Save brief and parsed data to session
      if (session) {
        await updateSession({
          brief: briefText,
          parsedBrief: parseData.data,
        });
      }
      
      // Save as generation block
      await saveGeneration(parseData.data);

      // Step 2: Analyze for missing information
      const analyzeResponse = await fetch("/api/analyze-brief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          text: briefText,
          parsedBrief: parseData.data,
          conversationHistory: [],
          sessionId: session?.id
        }),
      });

      const analyzeData = await analyzeResponse.json();

      if (analyzeData.success && analyzeData.data.questions.length > 0) {
        setQuestions(analyzeData.data.questions);
        setConversation([{
          type: "question",
          content: analyzeData.data.questions[0].question,
          field: analyzeData.data.questions[0].field
        }]);
      } else {
        // No questions, show result immediately
        setShowResult(true);
      }
      
      setAnalysisComplete(true);
      setEditedResult(parseData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSubmit = async () => {
    if (!userAnswer.trim() || !result) return;

    setIsAnswering(true);
    const currentQuestion = questions[currentQuestionIndex];
    const answerText = userAnswer; // Store answer before clearing

    // Add user's answer to conversation
    setConversation(prev => [...prev, {
      type: "answer",
      content: answerText
    }]);

    // Clear the input immediately
    setUserAnswer("");

    try {
      // Merge the answer into the brief
      const mergeResponse = await fetch("/api/merge-brief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          existingBrief: result,
          field: currentQuestion.field,
          answer: answerText
        }),
      });

      const mergeData = await mergeResponse.json();

      if (mergeData.success) {
        setResult(mergeData.data);
        
        // Update session with merged brief
        if (session) {
          await updateSession({
            parsedBrief: mergeData.data,
          });
        }
      }

      // Move to next question or finish
      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex < questions.length) {
        setCurrentQuestionIndex(nextIndex);
        setConversation(prev => [...prev, {
          type: "question",
          content: questions[nextIndex].question,
          field: questions[nextIndex].field
        }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process answer");
    } finally {
      setIsAnswering(false);
      
      // Clear questions and show result when done
      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex >= questions.length) {
        // Use setTimeout to ensure state updates happen after isAnswering is false
        setTimeout(() => {
          setQuestions([]);
          setShowResult(true);
        }, 0);
      }
    }
  };

  const handleSkipQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < questions.length) {
      setCurrentQuestionIndex(nextIndex);
      setConversation(prev => [...prev, {
        type: "question",
        content: questions[nextIndex].question,
        field: questions[nextIndex].field
      }]);
    } else {
      setQuestions([]);
      setShowResult(true);
    }
  };

  const handleIdeate = async () => {
    if (!result || questions.length === 0) return;

    setIsIdeating(true);
    const currentQuestion = questions[currentQuestionIndex];

    try {
      const response = await fetch("/api/ideate-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          briefContext: {
            originalBrief: briefText,
            parsedBrief: result,
            conversationHistory: conversation
          },
          question: currentQuestion.question,
          sessionId: session?.id
        }),
      });

      const data = await response.json();

      if (data.success && data.answer) {
        setUserAnswer(data.answer);
      } else {
        setError(data.error || "Failed to generate answer");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate answer");
    } finally {
      setIsIdeating(false);
    }
  };

  const handleIdeateBrief = async () => {
    setIsIdeatingBrief(true);
    setError(null);

    try {
      const response = await fetch("/api/ideate-brief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: session?.id
        })
      });

      const data = await response.json();

      if (data.success && data.brief) {
        setBriefText(data.brief);
      } else {
        setError(data.error || "Failed to generate brief");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate brief");
    } finally {
      setIsIdeatingBrief(false);
    }
  };

  const handleFieldEdit = (field: keyof ParsedBrief, value: string | string[]) => {
    if (!editedResult) return;
    setEditedResult({ ...editedResult, [field]: value });
  };

  const handleSaveChanges = async () => {
    if (!editedResult) return;
    
    setIsSaving(true);
    try {
      setResult(editedResult);
      
      // Update session with edited brief
      if (session) {
        await updateSession({
          parsedBrief: editedResult,
        });
      }
      
      setShowEditMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedResult(result);
    setShowEditMode(false);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const loadGenerations = async () => {
    if (!session?.id) return;

    try {
      const response = await fetch(`/api/generations/list?sessionId=${session.id}`);
      const data = await response.json();

      console.log('Brief page - loadGenerations response:', data);

      if (data.success && data.generations) {
        setGenerations(data.generations);
        console.log('Brief page - generations set:', data.generations);
      }
    } catch (err) {
      console.error("Error loading generations:", err);
    }
  };

  const saveGeneration = async (parsedBrief: ParsedBrief) => {
    if (!session?.id) return;

    try {
      await fetch('/api/generations/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          type: 'brief',
          content: parsedBrief,
          step: 3
        })
      });
      
      // Reload generations to show the new one
      await loadGenerations();
    } catch (err) {
      console.error("Error saving generation:", err);
    }
  };

  const handleContinue = () => {
    router.push("/workflow");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-16">
      <StepIndicator currentStep={3} />
      
      <PageHeader
        stepNumber={3}
        title="Strategy Brief"
        description="Parse your marketing brief into structured JSON with objectives, audience, timing, KPIs, and constraints."
      />

      {/* Previous Generations */}
      {generations.length > 0 && (
        <GenerationBlocksContainer generations={generations} currentStep={3} />
      )}

      <section className="space-y-4">

        <div className="space-y-2">
          <label htmlFor="brief-input" className="block text-sm font-medium text-slate-300">
            Marketing Brief
          </label>
          <textarea
            id="brief-input"
            value={briefText}
            onChange={(e) => setBriefText(e.target.value)}
            placeholder="Paste your marketing brief here..."
            className="min-h-[200px] w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
            disabled={isLoading}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleIdeateBrief}
            disabled={isLoading || isIdeatingBrief}
            className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            title="Generate a sample marketing brief"
          >
            <Sparkles className="h-4 w-4" />
            {isIdeatingBrief ? "Generating..." : "Ideate"}
          </button>
          <button
            onClick={handleParse}
            disabled={isLoading || !briefText.trim()}
            className="rounded-lg bg-gold px-6 py-2.5 text-sm font-medium text-black transition-colors hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Parsing..." : "Parse Brief"}
          </button>
        </div>
      </section>

      {error && (
        <section className="rounded-xl border border-red-700/70 bg-red-900/20 p-6">
          <h2 className="mb-2 text-lg font-semibold text-red-400">Error</h2>
          <p className="text-sm text-red-300">{error}</p>
        </section>
      )}

      {/* Interactive Conversation for Missing Info */}
      {result && questions.length > 0 && (
        <section className="space-y-4 rounded-xl border border-gold/30 bg-gold/5 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gold">
              Let's fill in some details
            </h2>
            <span className="text-sm text-gold">
              {currentQuestionIndex + 1} of {questions.length}
            </span>
          </div>

          {/* Conversation History */}
          <div className="space-y-3">
            {conversation.map((step, index) => (
              <div
                key={index}
                className={`rounded-lg p-3 ${
                  step.type === "question"
                    ? "bg-gold/10 text-gold"
                    : "ml-8 bg-slate-900 text-slate-100"
                }`}
              >
                <p className="text-sm">{step.content}</p>
              </div>
            ))}
          </div>

          {/* Answer Input */}
          <div className="space-y-2">
            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="min-h-[200px] w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
              disabled={isAnswering || isIdeating}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAnswerSubmit();
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleIdeate}
                disabled={isAnswering || isIdeating}
                className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                title="Generate an AI-powered answer based on your brief"
              >
                <Sparkles className="h-4 w-4" />
                {isIdeating ? "Generating..." : "Ideate"}
              </button>
              <button
                onClick={handleAnswerSubmit}
                disabled={isAnswering || !userAnswer.trim()}
                className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAnswering ? "Processing..." : "Submit"}
              </button>
              <button
                onClick={handleSkipQuestion}
                disabled={isAnswering}
                className="rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Skip
              </button>
            </div>
          </div>
        </section>
      )}

      {showResult && result && editedResult && (
        <section className="rounded-lg border border-gold/30 bg-gold/10 overflow-hidden">
          {/* Edit/Save/Cancel Controls */}
          <div className="flex items-center justify-between p-4">
            <span className="text-sm font-semibold text-gold">
              {showEditMode ? "Editing Parsed Brief" : "Parsed Brief"}
            </span>
            <div className="flex gap-2">
              {showEditMode ? (
                <>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowEditMode(true)}
                  className="rounded-lg border border-gold bg-transparent px-4 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold/10"
                >
                  Edit
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3 px-4 pb-4">
            {/* Objective Section */}
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 overflow-hidden">
            <button
              onClick={() => toggleSection('objective')}
              className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-800/50 transition-colors"
            >
              <h3 className="text-sm font-semibold text-slate-200">Objective</h3>
              {expandedSections.objective ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
            </button>
            {expandedSections.objective && (
              <div className="p-4 pt-0">
                {showEditMode ? (
                  <textarea
                    value={editedResult.objective}
                    onChange={(e) => handleFieldEdit("objective", e.target.value)}
                    className="w-full min-h-[80px] rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                ) : (
                  <p className="text-sm text-slate-300">{result.objective}</p>
                )}
              </div>
            )}
          </div>

          {/* Audience Section */}
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 overflow-hidden">
            <button
              onClick={() => toggleSection('audience')}
              className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-800/50 transition-colors"
            >
              <h3 className="text-sm font-semibold text-slate-200">Audience</h3>
              {expandedSections.audience ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
            </button>
            {expandedSections.audience && (
              <div className="p-4 pt-0">
                {showEditMode ? (
                  <textarea
                    value={editedResult.audience}
                    onChange={(e) => handleFieldEdit("audience", e.target.value)}
                    className="w-full min-h-[80px] rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                ) : (
                  <p className="text-sm text-slate-300">{result.audience}</p>
                )}
              </div>
            )}
          </div>

          {/* Timing Section */}
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 overflow-hidden">
            <button
              onClick={() => toggleSection('timing')}
              className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-800/50 transition-colors"
            >
              <h3 className="text-sm font-semibold text-slate-200">Timing</h3>
              {expandedSections.timing ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
            </button>
            {expandedSections.timing && (
              <div className="p-4 pt-0">
                {showEditMode ? (
                  <textarea
                    value={editedResult.timing || ""}
                    onChange={(e) => handleFieldEdit("timing", e.target.value)}
                    placeholder="Optional timing information"
                    className="w-full min-h-[60px] rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                ) : (
                  <p className="text-sm text-slate-300">{result.timing || "Not specified"}</p>
                )}
              </div>
            )}
          </div>

          {/* KPIs Section */}
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 overflow-hidden">
            <button
              onClick={() => toggleSection('kpis')}
              className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-800/50 transition-colors"
            >
              <h3 className="text-sm font-semibold text-slate-200">KPIs</h3>
              {expandedSections.kpis ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
            </button>
            {expandedSections.kpis && (
              <div className="p-4 pt-0">
                {showEditMode ? (
                  <textarea
                    value={editedResult.kpis.join('\n')}
                    onChange={(e) => handleFieldEdit('kpis', e.target.value.split('\n').filter(k => k.trim()))}
                    placeholder="One KPI per line"
                    className="w-full min-h-[100px] rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                ) : result.kpis.length > 0 ? (
                  <ul className="space-y-1.5 pl-4">
                    {result.kpis.map((kpi, index) => (
                      <li key={index} className="flex gap-2 text-sm">
                        <span className="text-slate-500">•</span>
                        <p className="flex-1 text-slate-300">{kpi}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500 italic">No KPIs specified</p>
                )}
              </div>
            )}
          </div>

          {/* Constraints Section */}
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 overflow-hidden">
            <button
              onClick={() => toggleSection('constraints')}
              className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-800/50 transition-colors"
            >
              <h3 className="text-sm font-semibold text-slate-200">Constraints</h3>
              {expandedSections.constraints ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
            </button>
            {expandedSections.constraints && (
              <div className="p-4 pt-0">
                {showEditMode ? (
                  <textarea
                    value={editedResult.constraints.join('\n')}
                    onChange={(e) => handleFieldEdit('constraints', e.target.value.split('\n').filter(c => c.trim()))}
                    placeholder="One constraint per line"
                    className="w-full min-h-[100px] rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                ) : result.constraints.length > 0 ? (
                  <ul className="space-y-1.5 pl-4">
                    {result.constraints.map((constraint, index) => (
                      <li key={index} className="flex gap-2 text-sm">
                        <span className="text-slate-500">•</span>
                        <p className="flex-1 text-slate-300">{constraint}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500 italic">No constraints specified</p>
                )}
              </div>
            )}
          </div>

            {/* Q&A Conversation Log */}
            {conversation.length > 0 && (
              <div className="space-y-3 rounded-xl border border-slate-700/70 bg-slate-900/40 p-6">
                <h3 className="text-sm font-semibold text-slate-300">Conversation Log</h3>
                <div className="space-y-3">
                  {conversation.map((step, index) => (
                    <div key={index} className="space-y-1">
                      {step.type === "question" ? (
                        <div>
                          <p className="text-xs font-medium text-slate-500">AI Question:</p>
                          <p className="text-sm text-slate-300">{step.content}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-medium text-slate-500">Your Answer:</p>
                          <p className="text-sm text-slate-400">{step.content}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Continue Button */}
            <div className="flex justify-end">
              <button
                onClick={handleContinue}
                className="flex items-center gap-2 rounded-lg bg-gold px-6 py-3 font-medium text-black transition-colors hover:bg-gold/90"
              >
                Continue to Workflow <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
