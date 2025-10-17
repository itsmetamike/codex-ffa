"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps?: number;
}

const stepRoutes = [
  "/ingest",
  "/brief",
  "/workflow",
  "/results"
];

const stepNames = [
  "Document Ingestion",
  "Brief Parsing",
  "Workflow Orchestration",
  "Results Dashboard"
];

export function StepIndicator({ currentStep, totalSteps = 4 }: StepIndicatorProps) {
  const router = useRouter();
  
  const canGoPrevious = currentStep > 1;
  const canGoNext = currentStep < totalSteps;
  
  const handlePrevious = () => {
    if (canGoPrevious) {
      router.push(stepRoutes[currentStep - 2] as any);
    }
  };
  
  const handleNext = () => {
    if (canGoNext) {
      router.push(stepRoutes[currentStep] as any);
    }
  };
  
  return (
    <div className="mb-8 border-b border-zinc-800/50 pb-6">
      <div className="flex items-center justify-between">
        {/* Logo/Home Link */}
        <Link 
          href="/" 
          className="flex items-center gap-2 text-white transition-colors hover:text-[#EDCF98]"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EDCF98]/10">
            <Sparkles className="h-5 w-5 text-[#EDCF98]" />
          </div>
          <span className="text-sm font-semibold tracking-wide">MAGENTIC</span>
        </Link>

        {/* Center: Progress Navigation */}
        <div className="flex items-center gap-6">
          {/* Previous Button */}
          <button
            onClick={handlePrevious}
            disabled={!canGoPrevious}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
              canGoPrevious
                ? "border-zinc-700 bg-black/50 text-zinc-300 hover:border-[#EDCF98] hover:bg-zinc-900 hover:text-[#EDCF98]"
                : "border-zinc-800 bg-black/30 text-zinc-700 cursor-not-allowed"
            }`}
            aria-label="Previous step"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          {/* Progress Dots with Step Name */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
          const isCompleted = currentStep > step;
          const isCurrent = currentStep === step;
          
          return (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full transition-all ${
                  isCurrent
                    ? "bg-[#EDCF98] ring-4 ring-[#EDCF98]/20"
                    : isCompleted
                    ? "bg-[#EDCF98]/50"
                    : "bg-zinc-700"
                }`}
              />
              {step < totalSteps && (
                <div
                  className={`h-[2px] w-8 ${
                    isCompleted ? "bg-[#EDCF98]/50" : "bg-zinc-700"
                  }`}
                />
              )}
            </div>
          );
        })}
            </div>
            
            {/* Step Name */}
            <span className="text-xs font-medium text-zinc-400">
              {stepNames[currentStep - 1]}
            </span>
          </div>
          
          {/* Next Button */}
          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
              canGoNext
                ? "border-zinc-700 bg-black/50 text-zinc-300 hover:border-[#EDCF98] hover:bg-zinc-900 hover:text-[#EDCF98]"
                : "border-zinc-800 bg-black/30 text-zinc-700 cursor-not-allowed"
            }`}
            aria-label="Next step"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Right side: Empty for balance */}
        <div className="w-32"></div>
      </div>
    </div>
  );
}
