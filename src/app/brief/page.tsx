"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import { StepIndicator } from "@/components/StepIndicator";
import { PageHeader } from "@/components/PageHeader";
import { ArrowRight, Sparkles } from "lucide-react";
import type { ParsedBrief } from "@/lib/schemas";

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

  // Create session if none exists, load existing brief if available
  useEffect(() => {
    if (!session) {
      createSession();
    } else if (session.brief) {
      setBriefText(session.brief);
      if (session.parsedBrief) {
        setResult(session.parsedBrief);
        setShowResult(true);
        setAnalysisComplete(true);
      }
    }
  }, []);

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
      // Step 1: Parse the brief
      const parseResponse = await fetch("/api/parse-brief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: briefText }),
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

      // Step 2: Analyze for missing information
      const analyzeResponse = await fetch("/api/analyze-brief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          text: briefText,
          parsedBrief: parseData.data,
          conversationHistory: []
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
      
      // Mark analysis as complete
      setAnalysisComplete(true);
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
          question: currentQuestion.question
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

  const handleFieldEdit = async (field: keyof ParsedBrief, value: string | string[]) => {
    if (!result) return;
    const updatedResult = { ...result, [field]: value };
    setResult(updatedResult);
    
    // Update session with edited brief
    if (session) {
      await updateSession({
        parsedBrief: updatedResult,
      });
    }
  };

  const handleContinue = () => {
    router.push("/workflow");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-16">
      <StepIndicator currentStep={2} />
      
      <PageHeader
        stepNumber={2}
        title="Brief Parsing"
        description="Paste a marketer brief and the intent parser agent will normalize it into structured JSON with objectives, audience, timing, KPIs, and constraints."
      />

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

      {showResult && result && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-100">Parsed Result</h2>
            <button
              onClick={() => setShowEditMode(!showEditMode)}
              className="text-sm text-gold hover:text-gold"
            >
              {showEditMode ? "View Mode" : "Edit Mode"}
            </button>
          </div>
          
          <div className="space-y-4 rounded-xl border border-gold/30 bg-gold/5 p-6">
            <div>
              <h3 className="mb-1 text-sm font-medium text-slate-400">Objective</h3>
              {showEditMode ? (
                <input
                  type="text"
                  value={result.objective}
                  onChange={(e) => handleFieldEdit("objective", e.target.value)}
                  className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-1.5 text-slate-100"
                />
              ) : (
                <p className="text-slate-100">{result.objective}</p>
              )}
            </div>

            <div>
              <h3 className="mb-1 text-sm font-medium text-slate-400">Audience</h3>
              {showEditMode ? (
                <input
                  type="text"
                  value={result.audience}
                  onChange={(e) => handleFieldEdit("audience", e.target.value)}
                  className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-1.5 text-slate-100"
                />
              ) : (
                <p className="text-slate-100">{result.audience}</p>
              )}
            </div>

            <div>
              <h3 className="mb-1 text-sm font-medium text-slate-400">Timing</h3>
              {showEditMode ? (
                <input
                  type="text"
                  value={result.timing || ""}
                  onChange={(e) => handleFieldEdit("timing", e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-1.5 text-slate-100"
                />
              ) : (
                <p className="text-slate-100">{result.timing || "Not specified"}</p>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-400">KPIs</h3>
              {showEditMode ? (
                <textarea
                  value={result.kpis.join("\n")}
                  onChange={(e) => handleFieldEdit("kpis", e.target.value.split("\n").filter(k => k.trim()))}
                  placeholder="One KPI per line"
                  className="min-h-[80px] w-full rounded border border-slate-600 bg-slate-900 px-3 py-1.5 text-slate-100"
                />
              ) : result.kpis.length > 0 ? (
                <ul className="list-inside list-disc space-y-1 text-slate-100">
                  {result.kpis.map((kpi, index) => (
                    <li key={index}>{kpi}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400">None specified</p>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-400">Constraints</h3>
              {showEditMode ? (
                <textarea
                  value={result.constraints.join("\n")}
                  onChange={(e) => handleFieldEdit("constraints", e.target.value.split("\n").filter(c => c.trim()))}
                  placeholder="One constraint per line"
                  className="min-h-[80px] w-full rounded border border-slate-600 bg-slate-900 px-3 py-1.5 text-slate-100"
                />
              ) : result.constraints.length > 0 ? (
                <ul className="list-inside list-disc space-y-1 text-slate-100">
                  {result.constraints.map((constraint, index) => (
                    <li key={index}>{constraint}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400">None specified</p>
              )}
            </div>
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

          <details className="rounded-xl border border-slate-700/70 bg-slate-900/40">
            <summary className="cursor-pointer p-4 text-sm font-medium text-slate-300 hover:text-slate-100">
              View Raw JSON
            </summary>
            <pre className="overflow-x-auto border-t border-slate-700/70 p-4 text-xs text-slate-300">
              {JSON.stringify({
                parsedBrief: result,
                conversationLog: conversation.length > 0 ? conversation : undefined
              }, null, 2)}
            </pre>
          </details>

          {/* Continue Button */}
          <div className="flex justify-end">
            <button
              onClick={handleContinue}
              className="flex items-center gap-2 rounded-lg bg-gold px-6 py-3 font-medium text-black transition-colors hover:bg-gold/90"
            >
              Continue to Workflow <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
