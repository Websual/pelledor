"use client";

import { useState } from "react";
import { Flag } from "lucide-react";

const REPORT_REASONS = [
  { value: "Spam", label: "Spam" },
  { value: "Injurieux", label: "Injurieux" },
  { value: "Hors-sujet", label: "Hors-sujet" },
] as const;

interface ReportReviewDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
  isSubmitting?: boolean;
  /** "Signaler" (public) ou "Contester l'avis" (pro) */
  actionLabel?: string;
}

export function ReportReviewDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
  actionLabel = "Signaler",
}: ReportReviewDialogProps) {
  const [selected, setSelected] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!selected) return;
    await onSubmit(selected);
    setSelected(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-4">
          <Flag className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-anthracite">
            Pourquoi {actionLabel === "Contester l'avis" ? "contestez-vous" : "signalez-vous"} cet avis ?
          </h3>
        </div>
        <div className="space-y-2 mb-5">
          {REPORT_REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setSelected(r.value)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors ${
                selected === r.value
                  ? "bg-[#9bb49b]/10 border border-[#9bb49b]/30 text-anthracite"
                  : "bg-slate-50 border border-transparent hover:bg-slate-100 text-anthracite/80"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              onClose();
            }}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-anthracite/70 hover:text-anthracite"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selected || isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-[#9bb49b] hover:bg-[#8aa48a] rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Envoi..." : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
