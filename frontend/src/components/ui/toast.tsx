"use client";

/**
 * HealthVault AI — Lightweight Toast System
 * Dependency-free context provider with auto-dismiss and manual close.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastItem extends Required<Omit<ToastOptions, "durationMs">> {
  id: string;
  durationMs: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<
  ToastVariant,
  { container: string; icon: React.ElementType; iconClass: string }
> = {
  success: {
    container:
      "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/80 dark:text-emerald-100",
    icon: CheckCircle2,
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  error: {
    container:
      "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/80 dark:text-red-100",
    icon: AlertTriangle,
    iconClass: "text-red-600 dark:text-red-400",
  },
  info: {
    container:
      "border-vault-border bg-card text-foreground dark:border-border",
    icon: Info,
    iconClass: "text-vault-teal dark:text-teal-400",
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant = "info", durationMs = 4500 }: ToastOptions) => {
      counter.current += 1;
      const id = `toast-${counter.current}`;
      setToasts((prev) => [
        ...prev.slice(-3), // keep at most 4 visible toasts
        { id, title, description: description ?? "", variant, durationMs },
      ]);
      if (durationMs > 0) {
        window.setTimeout(() => dismiss(id), durationMs);
      }
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Viewport */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2"
      >
        {toasts.map((item) => {
          const styles = variantStyles[item.variant];
          const Icon = styles.icon;
          return (
            <div
              key={item.id}
              role="status"
              className={cn(
                "pointer-events-auto flex items-start gap-2.5 rounded-xl border p-3 shadow-lg animate-in slide-in-from-bottom-2 fade-in duration-200",
                styles.container
              )}
            >
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", styles.iconClass)} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold leading-snug">{item.title}</p>
                {item.description && (
                  <p className="mt-0.5 text-[11px] leading-snug opacity-80">
                    {item.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => dismiss(item.id)}
                className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}
