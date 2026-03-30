"use client";

import { X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useEffect } from "react";

export type ToastType = "success" | "error" | "loading" | "info";

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (type !== "loading") {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [type, duration, onClose]);

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-white" />,
    error: <AlertCircle className="h-5 w-5 text-white" />,
    loading: <Loader2 className="h-5 w-5 text-white animate-spin" />,
    info: <AlertCircle className="h-5 w-5 text-white" />,
  };

  const colors = {
    success: "bg-sauge",
    error: "bg-red-500",
    loading: "bg-sauge",
    info: "bg-blue-500",
  };

  return (
    <div
      className={`${colors[type]} text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 min-w-[300px] max-w-md animate-in slide-in-from-top-5`}
    >
      {icons[type]}
      <p className="flex-1 text-sm font-medium">{message}</p>
      {type !== "loading" && (
        <button
          onClick={onClose}
          className="hover:bg-white/20 rounded-full p-1 transition-colors"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type: ToastType }>;
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-24 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
}

