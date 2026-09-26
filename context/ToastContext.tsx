"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export interface ToastMethods {
  success: (msg: string) => void;
  error: (msg: string) => void;
  warning: (msg: string) => void;
  info: (msg: string) => void;
  showToast: (message: string, type?: ToastType) => void;
  toast: ToastMethods;
}

interface ToastContextType {
  toast: ToastMethods;
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let globalShowToast: ((message: string, type?: ToastType) => void) | null = null;

const baseToast = {
  success: (msg: string) => {
    if (globalShowToast) globalShowToast(msg, "success");
    else console.log("[Toast Success]", msg);
  },
  error: (msg: string) => {
    if (globalShowToast) globalShowToast(msg, "error");
    else console.error("[Toast Error]", msg);
  },
  warning: (msg: string) => {
    if (globalShowToast) globalShowToast(msg, "warning");
    else console.warn("[Toast Warning]", msg);
  },
  info: (msg: string) => {
    if (globalShowToast) globalShowToast(msg, "info");
    else console.log("[Toast Info]", msg);
  },
  showToast: (message: string, type: ToastType = "info") => {
    if (globalShowToast) globalShowToast(message, type);
  },
};

export const toast: ToastMethods = {
  ...baseToast,
  toast: baseToast as any,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]); // Keep max 5

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  globalShowToast = showToast;

  const contextValue: ToastContextType = {
    toast,
    showToast,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Floating Toast Notification Stack */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          let bgClass = "bg-black text-white border-zinc-800";
          let icon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;

          if (t.type === "error") {
            bgClass = "bg-rose-950 text-white border-rose-800 shadow-rose-950/40";
            icon = <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
          } else if (t.type === "warning") {
            bgClass = "bg-zinc-900 text-amber-100 border-amber-800/80";
            icon = <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
          } else if (t.type === "info") {
            bgClass = "bg-black text-white border-zinc-800";
            icon = <Info className="w-4 h-4 text-zinc-300 shrink-0" />;
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-2xl border shadow-xl transition-all animate-in fade-in slide-in-from-bottom-3 duration-200 ${bgClass}`}
            >
              <div className="flex items-center gap-2.5 text-xs font-semibold leading-snug">
                {icon}
                <span>{t.message}</span>
              </div>

              <button
                onClick={() => removeToast(t.id)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return toast;
  }
  return context.toast;
}
