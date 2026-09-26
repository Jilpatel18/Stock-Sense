"use client";

import React from "react";
import { Check, Clock, AlertTriangle, XCircle } from "lucide-react";

interface StatusTimelineProps {
  status: string; // 'Draft' | 'Waiting' | 'Ready' | 'Done' | 'Canceled'
}

export default function StatusTimeline({ status }: StatusTimelineProps) {
  const isCanceled = status === "Canceled";

  const steps = [
    { key: "Draft", label: "DRAFT" },
    { key: "Waiting", label: "WAITING" },
    { key: "Ready", label: "READY" },
    { key: "Done", label: "DONE" },
  ];

  const getStepIndex = (st: string) => {
    switch (st) {
      case "Draft":
        return 0;
      case "Waiting":
        return 1;
      case "Ready":
        return 2;
      case "Done":
        return 3;
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(status);

  if (isCanceled) {
    return (
      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-100 border border-zinc-300 text-zinc-950 text-xs font-bold">
        <XCircle className="w-4 h-4 text-black shrink-0" />
        <span>Document Status: CANCELED</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 w-full">
      <div className="text-[10px] uppercase font-mono font-bold text-zinc-600 tracking-wider">
        Lifecycle State
      </div>
      <div className="flex items-center justify-between w-full relative">
        {/* Background connector line */}
        <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-0.5 bg-zinc-200 z-0" />

        {steps.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center gap-1 bg-white px-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-black transition-all ${
                  isCompleted
                    ? "bg-black text-white"
                    : isCurrent
                    ? "bg-zinc-950 text-white ring-4 ring-zinc-200"
                    : "bg-zinc-100 text-zinc-400 border border-zinc-300"
                }`}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
              </div>
              <span
                className={`text-[9px] font-mono font-bold tracking-tight ${
                  isCurrent ? "text-zinc-950 underline" : isCompleted ? "text-zinc-800" : "text-zinc-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
