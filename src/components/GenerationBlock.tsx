"use client";

import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

type GenerationType = "context" | "brief";

interface GenerationBlockProps {
  type: GenerationType;
  title: string;
  preview: string;
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
  }
};

export function GenerationBlock({ type, title, preview, timestamp, onClick }: GenerationBlockProps) {
  const router = useRouter();
  const config = typeConfig[type];

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(config.route as any);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left rounded-lg border ${config.borderColor} ${config.bgColor} p-4 transition-all hover:scale-[1.02] hover:shadow-lg`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${config.color}`}>
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className={`text-sm font-semibold ${config.color}`}>
              {title}
            </h3>
            <span className="text-xs text-slate-500 whitespace-nowrap">
              {new Date(timestamp).toLocaleDateString()}
            </span>
          </div>
          <p className="text-xs text-slate-400 line-clamp-2">
            {preview}
          </p>
        </div>
      </div>
    </button>
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
        const stepMap: Record<GenerationType, number> = {
          context: 2,
          brief: 3
        };
        return stepMap[g.type as GenerationType] < currentStep;
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
      brief: "Strategy Brief"
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
            timestamp={gen.createdAt}
          />
        ))}
      </div>
    </section>
  );
}
