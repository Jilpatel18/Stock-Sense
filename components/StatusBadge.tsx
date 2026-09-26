import React from "react";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[11px] font-bold" : "px-2.5 py-1 text-xs font-bold";

  switch (status) {
    case "Out of Stock":
    case "OUT_OF_STOCK":
      return (
        <span className={`inline-flex items-center rounded-full bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mr-1.5 animate-pulse"></span>
          Out of Stock
        </span>
      );
    case "Low Stock":
    case "LOW_STOCK":
      return (
        <span className={`inline-flex items-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mr-1.5"></span>
          Low Stock
        </span>
      );
    case "Healthy":
    case "IN_STOCK":
      return (
        <span className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5"></span>
          Healthy
        </span>
      );
    case "Draft":
      return (
        <span className={`inline-flex items-center rounded-full bg-zinc-100 text-zinc-600 border border-zinc-300 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mr-1.5"></span>
          Draft
        </span>
      );
    case "Waiting":
      return (
        <span className={`inline-flex items-center rounded-full bg-zinc-100 text-zinc-900 border border-zinc-400 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-800 mr-1.5 animate-pulse"></span>
          Waiting
        </span>
      );
    case "Ready":
      return (
        <span className={`inline-flex items-center rounded-full bg-zinc-200 text-black border border-zinc-400 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-black mr-1.5"></span>
          Ready
        </span>
      );
    case "Done":
      return (
        <span className={`inline-flex items-center rounded-full bg-black text-white border border-black shadow-2xs ${sizeClasses}`}>
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
    case "ACTIVE":
      return (
        <span className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5"></span>
          Active
        </span>
      );
    case "INACTIVE":
    case "SUSPENDED":
    case "DISABLED":
      return (
        <span className={`inline-flex items-center rounded-full bg-zinc-100 text-zinc-500 border border-zinc-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mr-1.5"></span>
          {status === "SUSPENDED" ? "Suspended" : "Inactive"}
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
