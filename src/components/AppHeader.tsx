"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

interface Step {
  number: number;
  label: string;
  href: string;
}

const steps: Step[] = [
  { number: 1, label: "Ingest", href: "/ingest" },
  { number: 2, label: "Brief", href: "/brief" },
  { number: 3, label: "Workflow", href: "/workflow" },
  { number: 4, label: "Results", href: "/results" },
];

interface AppHeaderProps {
  currentStep?: number;
  showProgress?: boolean;
}

export function AppHeader({ currentStep, showProgress = false }: AppHeaderProps) {
  return (
    <header className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6 py-4">
        {/* Logo/Brand */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-100 hover:text-white transition-colors">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <Sparkles className="h-5 w-5 text-blue-400" />
            </div>
            <span className="text-sm font-semibold tracking-wide">CODEX FFA</span>
          </Link>
        </div>

        {/* Progress Stepper */}
        {showProgress && currentStep && (
          <nav aria-label="Progress" className="mt-6">
            <ol className="flex items-center justify-center gap-2">
              {steps.map((step, stepIdx) => {
                const isCompleted = currentStep > step.number;
                const isCurrent = currentStep === step.number;
                const isUpcoming = currentStep < step.number;

                return (
                  <li key={step.number} className="flex items-center">
                    {/* Step Circle */}
                    <Link
                      href={step.href as any}
                      className={`group relative flex flex-col items-center ${
                        isUpcoming ? "cursor-not-allowed" : "cursor-pointer"
                      }`}
                      onClick={(e) => {
                        if (isUpcoming) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${
                          isCurrent
                            ? "border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                            : isCompleted
                            ? "border-blue-500 bg-blue-500/20 text-blue-400"
                            : "border-slate-700 bg-slate-800/50 text-slate-500"
                        } ${!isUpcoming ? "group-hover:scale-110 group-hover:border-blue-400" : ""}`}
                      >
                        <span className="text-sm font-semibold">{step.number}</span>
                      </div>
                      <span
                        className={`mt-2 text-xs font-medium ${
                          isCurrent
                            ? "text-blue-400"
                            : isCompleted
                            ? "text-slate-300"
                            : "text-slate-500"
                        }`}
                      >
                        {step.label}
                      </span>
                    </Link>

                    {/* Connector Line */}
                    {stepIdx < steps.length - 1 && (
                      <div
                        className={`mx-4 h-[2px] w-16 ${
                          isCompleted ? "bg-blue-500" : "bg-slate-700"
                        }`}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
      </div>
    </header>
  );
}
