"use client";

import { useState, useEffect } from "react";
import { Flag } from "lucide-react";
import { ReportReviewDialog } from "@/components/report-review-dialog";

interface ReportReviewButtonProps {
  reviewId: string;
  /** "pro" = "Contester l'avis", "public" = "Signaler" */
  variant?: "public" | "pro";
  className?: string;
}

export function ReportReviewButton({
  reviewId,
  variant = "public",
  className = "",
}: ReportReviewButtonProps) {
  const [reported, setReported] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  useEffect(() => {
    fetch(`/api/reviews/${reviewId}/report`)
      .then((r) => r.json())
      .then((data) => data.reported === true && setReported(true))
      .catch(() => {});
  }, [reviewId]);

  const handleSubmit = async (reason: string) => {
    setIsReporting(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagReason: reason }),
      });
      const data = await res.json();
      if (res.ok || data.alreadyReported) setReported(true);
      if (!res.ok && !data.alreadyReported) throw new Error(data.error || "Erreur");
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        disabled={reported}
        className={`flex items-center gap-1 text-xs transition-colors ${className} ${
          reported ? "text-orange-400 cursor-default" : "text-slate-300 hover:text-orange-400"
        }`}
        aria-label={reported ? "Signalé" : variant === "pro" ? "Contester l'avis" : "Signaler"}
      >
        <Flag className="h-3.5 w-3.5" />
        {reported ? "Signalé" : variant === "pro" ? "Contester" : "Signaler"}
      </button>
      <ReportReviewDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        isSubmitting={isReporting}
        actionLabel={variant === "pro" ? "Contester l'avis" : "Signaler"}
      />
    </>
  );
}
