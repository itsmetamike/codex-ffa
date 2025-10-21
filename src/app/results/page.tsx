"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import { StepIndicator } from "@/components/StepIndicator";
import { PageHeader } from "@/components/PageHeader";
import { Home, Send, Sparkles, CheckCircle2 } from "lucide-react";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
          action: 'extract_topics'
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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
      <StepIndicator currentStep={5} />
      
      <PageHeader
        stepNumber={5}
        title="Pre-Research Consultation"
        description="Discuss your campaign strategy with our research consultant to finalize your single research topic for the deep research phase."
      />

      {/* Referenced Files */}
      {generations.length > 0 && (
        <GenerationBlocksContainer generations={generations} currentStep={5} />
      )}

      {/* Research Context Display */}
      {researchTopics.length > 0 && researchTopics[0] && deepResearchPrompt && (
        <section className="rounded-xl border border-gold/50 bg-gold/10 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-gold" />
            <h2 className="text-xl font-semibold text-gold">Research Context Generated</h2>
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
          <button
            onClick={() => {/* TODO: Trigger deep research API */}}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700"
          >
            <Sparkles className="h-4 w-4" />
            Start Deep Research
          </button>
        </section>
      )}

      {/* Chat Interface */}
      {researchTopics.length === 0 && (contextPack || session?.parsedBrief || explorationCategories.length > 0) && (
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
            {messages.length > 0 && (
              <div className="mb-3">
                <button
                  onClick={handleExtractTopics}
                  disabled={isExtractingTopics || isLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  {isExtractingTopics ? 'Generating Research Context...' : 'Generate Research Context'}
                </button>
                <p className="text-xs text-slate-500 mt-2 text-center">
                  When you're ready, click above to generate the research context for deep research.
                </p>
              </div>
            )}
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

      {/* Missing Prerequisites Warning */}
      {researchTopics.length === 0 && !contextPack && !session?.parsedBrief && explorationCategories.length === 0 && (
        <section className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-6">
          <h2 className="text-lg font-semibold text-amber-400 mb-2">Prerequisites Required</h2>
          <p className="text-sm text-slate-300">
            The consultation chat requires at least one of the following:
          </p>
          <ul className="list-disc list-inside text-sm text-slate-400 mt-3 space-y-1">
            <li>Strategy Brief (Step 2)</li>
            <li>Context Pack (Step 3)</li>
            <li>Exploration Categories (Step 4)</li>
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
