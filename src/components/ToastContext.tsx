import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { X } from "lucide-react";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastInput {
  message: string;
  action?: ToastAction;
  /** ms; default 3000 (or 5000 when an action is attached). */
  duration?: number;
}

interface Toast extends ToastInput {
  id: number;
}

interface ToastContextValue {
  show: (t: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback((t: ToastInput) => {
    const id = nextId.current++;
    const duration = t.duration ?? (t.action ? 5000 : 3000);
    setToasts((prev) => [...prev, { ...t, id }]);
    window.setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-slideUp pointer-events-auto flex items-center gap-3 rounded-lg border border-border-subtle bg-surface px-4 py-2.5 shadow-lg shadow-black/20 max-w-md"
          >
            <span className="text-sm text-text-primary">{t.message}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action!.onClick();
                  dismiss(t.id);
                }}
                className="text-sm font-medium text-accent hover:text-accent-hover"
              >
                {t.action.label}
              </button>
            )}
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="ml-1 rounded p-0.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};

