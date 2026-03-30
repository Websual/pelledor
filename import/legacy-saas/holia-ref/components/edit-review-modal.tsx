"use client";

import { useState, useEffect } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Label } from "@/components/ui";
import { Star, X } from "lucide-react";

interface EditReviewModalProps {
  open: boolean;
  onClose: () => void;
  initialRating: number;
  initialComment: string | null;
  onSubmit: (data: { rating: number; comment: string }) => Promise<void>;
  isSubmitting?: boolean;
}

export function EditReviewModal({
  open,
  onClose,
  initialRating,
  initialComment,
  onSubmit,
  isSubmitting = false,
}: EditReviewModalProps) {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment || "");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setRating(initialRating);
      setComment(initialComment || "");
      setError("");
    }
  }, [open, initialRating, initialComment]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (rating === 0) {
      setError("Veuillez sélectionner une note");
      return;
    }
    try {
      await onSubmit({ rating, comment: comment.trim() || "" });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Modifier l&apos;avis</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label>Note *</Label>
              <div className="flex items-center gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 transition-colors ${
                        value <= rating ? "fill-[#9bb49b] text-[#9bb49b]" : "text-anthracite/20 fill-anthracite/20"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="edit-comment">Commentaire (optionnel)</Label>
              <textarea
                id="edit-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isSubmitting}
                rows={4}
                className="mt-2 flex min-h-[100px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus:ring-2 focus:ring-[#9bb49b]/30 disabled:opacity-50"
                placeholder="Partagez votre expérience..."
              />
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <p className="text-xs text-anthracite/60">
              Si votre avis modifié nécessite une vérification, il repassera en statut &quot;À valider&quot; avant publication.
            </p>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#9bb49b] hover:bg-[#8aa48a] text-white"
              >
                {isSubmitting ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
