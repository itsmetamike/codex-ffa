"use client";

import Link from "next/link";

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

interface ProgressStepperProps {
  currentStep: number;
}

export function ProgressStepper({ currentStep }: ProgressStepperProps) {
  return (
    <nav aria-label="Progress" className="-mx-6 -mt-16 mb-8 bg-slate-950/50 px-6 py-8 backdrop-blur-sm border-b border-slate-800/50">
      <ol className="mx-auto flex max-w-4xl items-center justify-between">
        {steps.map((step, stepIdx) => {
          const isCompleted = currentStep > step.number;
          const isCurrent = currentStep === step.number;
          const isUpcoming = currentStep < step.number;

          return (
            <li key={step.number} className="relative flex flex-1 items-center justify-center">
              {/* Connector Line - Before */}
              {stepIdx > 0 && (
                <div
                  className={`absolute right-1/2 top-[18px] h-[2px] w-full ${
                    isCompleted || isCurrent ? "bg-blue-500" : "bg-slate-700"
                  }`}
                  style={{ zIndex: 0 }}
                />
              )}

              {/* Step Circle */}
              <Link
                href={step.href as any}
                className={`group relative z-10 flex flex-col items-center ${
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
                      ? "border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/50"
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

              {/* Connector Line - After */}
              {stepIdx < steps.length - 1 && (
                <div
                  className={`absolute left-1/2 top-[18px] h-[2px] w-full ${
                    isCompleted ? "bg-blue-500" : "bg-slate-700"
                  }`}
                  style={{ zIndex: 0 }}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
