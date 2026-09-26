import React from "react";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs font-medium" : "px-2.5 py-1 text-xs font-semibold";

  switch (status) {
    case "Draft":
      return (
        <span className={`inline-flex items-center rounded-full bg-zinc-100 text-zinc-600 border border-zinc-300 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mr-1.5"></span>
          Draft
        </span>
      );
    case "Waiting":
      return (
        <span className={`inline-flex items-center rounded-full bg-zinc-100 text-zinc-900 border border-zinc-400 font-semibold ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-800 mr-1.5 animate-pulse"></span>
          Waiting
        </span>
      );
    case "Ready":
      return (
        <span className={`inline-flex items-center rounded-full bg-zinc-200 text-black font-extrabold border border-zinc-400 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-black mr-1.5"></span>
          Ready
        </span>
      );
    case "Done":
      return (
        <span className={`inline-flex items-center rounded-full bg-black text-white font-black border border-black shadow-sm ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5"></span>
          Done
        </span>
      );
    case "Canceled":
      return (
        <span className={`inline-flex items-center rounded-full bg-zinc-100 text-zinc-400 border border-zinc-200 line-through ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mr-1.5"></span>
          Canceled
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center rounded-full bg-zinc-100 text-zinc-700 border border-zinc-300 ${sizeClasses}`}>
          {status}
        </span>
      );
  }
}
