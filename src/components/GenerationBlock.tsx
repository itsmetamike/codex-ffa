"use client";

import { useRouter } from "next/navigation";
import { Sparkles, ChevronDown, Edit2 } from "lucide-react";
import { useState } from "react";

type GenerationType = "context" | "brief" | "exploration-selection" | "research-context";

interface GenerationBlockProps {
  type: GenerationType;
  title: string;
  preview: string;
  fullContent: string;
  timestamp: Date;
  onClick?: () => void;
}

const typeConfig: Record<GenerationType, { color: string; bgColor: string; borderColor: string; route: string }> = {
  context: {
    color: "text-gold",
    bgColor: "bg-gold/10",
    borderColor: "border-gold/30",
    route: "/context"
  },
  brief: {
    color: "text-gold",
    bgColor: "bg-gold/10",
    borderColor: "border-gold/30",
    route: "/brief"
  },
  "exploration-selection": {
    color: "text-gold",
    bgColor: "bg-gold/10",
    borderColor: "border-gold/30",
    route: "/workflow"
  },
  "research-context": {
    color: "text-gold",
    bgColor: "bg-gold/10",
    borderColor: "border-gold/30",
    route: "/results"
  }
};

export function GenerationBlock({ type, title, preview, fullContent, timestamp, onClick }: GenerationBlockProps) {
  const router = useRouter();
  const config = typeConfig[type];
  const [isExpanded, setIsExpanded] = useState(false);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else {
      router.push(config.route as any);
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const formatContent = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return content;
    }
  };

  return (
    <div
      className={`w-full rounded-lg border ${config.borderColor} ${config.bgColor} transition-all`}
    >
      <button
        onClick={toggleExpand}
        className="w-full text-left p-4 hover:bg-gold/5 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <ChevronDown 
              className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className={`text-sm font-semibold ${config.color}`}>
                {title}
              </h3>
              <span className="text-xs text-slate-500 whitespace-nowrap">
                {new Date(timestamp).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="border-t border-gold/20 pt-3">
            <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono bg-slate-900/50 p-3 rounded max-h-96 overflow-y-auto">
              {formatContent(fullContent)}
            </pre>
          </div>
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gold bg-gold/10 hover:bg-gold/20 rounded-lg transition-colors"
          >
            <Edit2 className="h-3 w-3" />
            Edit
          </button>
        </div>
      )}
    </div>
  );
}

interface GenerationBlocksContainerProps {
  generations: Array<{
    id: string;
    type: GenerationType;
    content: string;
    brand?: string;
    createdAt: Date;
  }>;
  currentStep?: number;
}

export function GenerationBlocksContainer({ generations, currentStep }: GenerationBlocksContainerProps) {
  // Filter to only show generations from previous steps
  const visibleGenerations = currentStep 
    ? generations.filter(g => {
        const stepMap: Record<string, number> = {
          context: 1,
          brief: 2,
          "exploration-selection": 3,
          "research-context": 4
        };
        return stepMap[g.type] && stepMap[g.type] < currentStep;
      })
    : generations;

  console.log('GenerationBlocksContainer:', { 
    totalGenerations: generations.length, 
    visibleGenerations: visibleGenerations.length,
    currentStep,
    generations 
  });

  if (visibleGenerations.length === 0) {
    return null;
  }

  const getTitle = (type: GenerationType, brand?: string): string => {
    if (type === "context" && brand) {
      return `${brand} Context Pack`;
    }
    const titles: Record<GenerationType, string> = {
      context: "Context Pack",
      brief: "Strategy Brief",
      "exploration-selection": "Exploration Categories",
      "research-context": "Research Context"
    };
    return titles[type];
  };

  const getPreview = (type: GenerationType, content: string): string => {
    try {
      const parsed = JSON.parse(content);
      
      switch (type) {
        case "context":
          return parsed.brand_voice?.substring(0, 100) || "Context pack generated";
        case "brief":
          return parsed.objective?.substring(0, 100) || "Brief parsed successfully";
        case "exploration-selection":
          if (parsed.categories && Array.isArray(parsed.categories)) {
            const totalSubs = parsed.categories.reduce((acc: number, cat: any) => 
              acc + (cat.subcategories?.length || 0), 0
            );
            return `${totalSubs} categories selected`;
          }
          return "Categories selected";
        case "research-context":
          return parsed.summary?.strategicFocus?.substring(0, 100) || "Research context generated";
        default:
          return "Generated content";
      }
    } catch {
      return "Generated content";
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-gold/30 bg-gold/5 p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-gold" />
        <h3 className="text-sm font-semibold text-gold">Referenced Files</h3>
      </div>
      <p className="text-xs text-slate-400">
        These will be used as context for generations in this step.
      </p>
      <div className="space-y-2">
        {visibleGenerations.map((gen) => (
          <GenerationBlock
            key={gen.id}
            type={gen.type as GenerationType}
            title={getTitle(gen.type as GenerationType, gen.brand)}
            preview={getPreview(gen.type as GenerationType, gen.content)}
            fullContent={gen.content}
            timestamp={gen.createdAt}
          />
        ))}
      </div>
    </section>
  );
}
