import React from "react";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const sizeClasses =
    size === "sm"
      ? "px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap shrink-0"
      : "px-3 py-1 text-xs font-semibold whitespace-nowrap shrink-0";

  const s = (status || "").toUpperCase().trim();

  if (s === "OUT OF STOCK" || s === "OUT_OF_STOCK") {
    return (
      <span className={`inline-flex items-center rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mr-1.5 animate-pulse"></span>
        Out of Stock
      </span>
    );
  }

  if (s === "LOW STOCK" || s === "LOW_STOCK") {
    return (
      <span className={`inline-flex items-center rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mr-1.5"></span>
        Low Stock
      </span>
    );
  }

  if (s === "HEALTHY" || s === "IN_STOCK" || s === "IN STOCK") {
    return (
      <span className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5"></span>
        Healthy
      </span>
    );
  }

  if (s === "DRAFT") {
    return (
      <span className={`inline-flex items-center rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mr-1.5"></span>
        Draft
      </span>
    );
  }

  if (s === "WAITING") {
    return (
      <span className={`inline-flex items-center rounded-full bg-amber-50 text-amber-800 border border-amber-200 ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mr-1.5 animate-pulse"></span>
        Waiting
      </span>
    );
  }

  if (s === "READY") {
    return (
      <span className={`inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-1.5"></span>
        Ready
      </span>
    );
  }

  if (s === "DONE") {
    return (
      <span className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5"></span>
        Done
      </span>
    );
  }

  if (s === "CANCELED" || s === "CANCELLED") {
    return (
      <span className={`inline-flex items-center rounded-full bg-zinc-100 text-zinc-500 border border-zinc-200 line-through ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mr-1.5"></span>
        Canceled
      </span>
    );
  }

  if (s === "ACTIVE") {
    return (
      <span className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5"></span>
        Active
      </span>
    );
  }

  if (s === "INACTIVE" || s === "SUSPENDED" || s === "DISABLED") {
    return (
      <span className={`inline-flex items-center rounded-full bg-zinc-100 text-zinc-500 border border-zinc-200 ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mr-1.5"></span>
        {s === "SUSPENDED" ? "Suspended" : "Inactive"}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 ${sizeClasses}`}>
      {status}
    </span>
  );
}
