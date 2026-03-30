"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, Button } from "@/components/ui";
import { Star, Shield, MapPin, Calendar, MoreVertical, Pencil, Trash2, Flag } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useState, useRef, useEffect } from "react";
import { ReportReviewDialog } from "@/components/report-review-dialog";

const DATE_FORMAT = "d MMMM yyyy";

export interface ReviewCardProps {
  rating: number;
  comment: string | null;
  response: string | null;
  createdAt: string;
  /** Page praticien : nom du patient. Page compte : non utilisé (on affiche le praticien) */
  authorName?: string;
  /** Affiche le badge "Avis vérifié" */
  isVerified?: boolean;
  /** Pour la page compte patient : infos du praticien (photo, nom, slug, ville) */
  practitioner?: {
    name: string;
    photoUrl: string | null;
    slug: string | null;
    locationCity?: string;
  };
  /** Pour le bloc réponse : photo et nom du praticien */
  responder?: {
    name: string;
    photoUrl: string | null;
  };
  /** Infos du RDV (date, service) - page compte */
  appointmentInfo?: {
    startsAt: string;
    serviceName: string;
  };
  /** Menu d'actions (Modifier, Supprimer) - page compte */
  onEdit?: () => void;
  onDelete?: () => void;
  /** Signalement : reviewId requis, variant 'pro' = "Contester l'avis" */
  reviewId?: string;
  reportVariant?: "public" | "pro";
  /** Déjà signalé par cet utilisateur (override ou état après clic) */
  reportedByUser?: boolean;
}

export function ReviewCard({
  rating,
  comment,
  response,
  createdAt,
  authorName,
  isVerified,
  practitioner,
  responder,
  appointmentInfo,
  onEdit,
  onDelete,
  reviewId,
  reportVariant = "public",
  reportedByUser: reportedByUserProp,
}: ReviewCardProps) {
  const responderInfo = responder ?? practitioner;
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportedByUser, setReportedByUser] = useState(reportedByUserProp ?? false);
  const [isReporting, setIsReporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const showReport = Boolean(reviewId) && !onEdit; // Pas de bouton report sur la page compte patient (ses propres avis)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (reportedByUserProp !== undefined) setReportedByUser(reportedByUserProp);
  }, [reportedByUserProp]);

  useEffect(() => {
    if (!reviewId || !showReport) return;
    fetch(`/api/reviews/${reviewId}/report`)
      .then((r) => r.json())
      .then((data) => data.reported === true && setReportedByUser(true))
      .catch(() => {});
  }, [reviewId, showReport]);

  const handleReportSubmit = async (reason: string) => {
    if (!reviewId) return;
    setIsReporting(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagReason: reason }),
      });
      const data = await res.json();
      if (res.ok || data.alreadyReported) setReportedByUser(true);
      if (!res.ok && !data.alreadyReported) throw new Error(data.error || "Erreur");
    } finally {
      setIsReporting(false);
    }
  };

  const hasActions = onEdit || onDelete;

  return (
    <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
            {/* Étoiles en premier (cohérent avec page praticien) */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-5 w-5 ${
                    i < rating ? "fill-[#9bb49b] text-[#9bb49b]" : "text-anthracite/20 fill-anthracite/20"
                  }`}
                />
              ))}
            </div>
            {/* Photo du praticien (page compte) à côté du nom */}
            {practitioner && (
              <div className="flex items-center gap-2">
                {practitioner.photoUrl ? (
                  <Link href={practitioner.slug ? `/praticien/${practitioner.slug}` : "#"}>
                    <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                      <Image
                        src={practitioner.photoUrl}
                        alt={practitioner.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </Link>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#9bb49b]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-[#9bb49b]">
                      {practitioner.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  {practitioner.slug ? (
                    <Link
                      href={`/praticien/${practitioner.slug}`}
                      className="font-semibold text-anthracite hover:text-[#9bb49b] transition-colors"
                    >
                      {practitioner.name}
                    </Link>
                  ) : (
                    <span className="font-semibold text-anthracite">{practitioner.name}</span>
                  )}
                  {practitioner.locationCity && (
                    <div className="flex items-center gap-1 text-xs text-anthracite/60 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {practitioner.locationCity}
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Page praticien : nom du patient */}
            {!practitioner && authorName && (
              <span className="font-semibold text-anthracite">{authorName}</span>
            )}
            {isVerified && (
              <div className="flex items-center gap-1 px-2 py-1 bg-[#9bb49b]/10 rounded-2xl">
                <Shield className="h-3.5 w-3.5 text-[#9bb49b]" />
                <span className="text-xs font-medium text-[#9bb49b]">
                  Avis vérifié (Rendez-vous honoré)
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <time
              dateTime={new Date(createdAt).toISOString()}
              className="text-sm text-anthracite/60 whitespace-nowrap"
            >
              {format(new Date(createdAt), DATE_FORMAT, { locale: fr })}
            </time>
            {showReport && (
              <button
                type="button"
                onClick={() => setReportDialogOpen(true)}
                disabled={reportedByUser}
                className={`flex items-center gap-1 text-xs transition-colors ${
                  reportedByUser
                    ? "text-orange-400 cursor-default"
                    : "text-slate-300 hover:text-orange-400"
                }`}
                aria-label={reportedByUser ? "Signalé" : reportVariant === "pro" ? "Contester l'avis" : "Signaler"}
              >
                <Flag className="h-3.5 w-3.5" />
                {reportedByUser ? "Signalé" : reportVariant === "pro" ? "Contester" : "Signaler"}
              </button>
            )}
            {hasActions && (
              <div className="relative" ref={menuRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-anthracite/50 hover:text-anthracite hover:bg-anthracite/5"
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-label="Actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 py-1 bg-white rounded-xl shadow-lg border border-gray-100 z-10 min-w-[140px]">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onEdit();
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-anthracite hover:bg-[#9bb49b]/10 transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                        Modifier
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onDelete();
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        Supprimer
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {appointmentInfo && (
          <div className="flex items-center gap-2 text-sm text-anthracite/60 mb-3">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {format(new Date(appointmentInfo.startsAt), DATE_FORMAT, { locale: fr })}
            </span>
            <span className="mx-1">•</span>
            <span>{appointmentInfo.serviceName}</span>
          </div>
        )}

        {comment && (
          <p className="text-anthracite/70 leading-relaxed mb-4">{comment}</p>
        )}

        {response && responderInfo && (
          <div className="mt-4 p-4 bg-[#9bb49b]/5 rounded-3xl border-l-4 border-[#9bb49b]">
            <div className="flex items-center gap-2 mb-2">
              {responderInfo.photoUrl ? (
                <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={responderInfo.photoUrl}
                    alt={responderInfo.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-[#9bb49b]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-[#9bb49b]">
                    {responderInfo.name.charAt(0)}
                  </span>
                </div>
              )}
              <p className="text-xs font-semibold text-[#9bb49b]">
                Réponse de <span className="font-bold">{responderInfo.name}</span>
              </p>
            </div>
            <p className="text-sm text-anthracite/70 italic leading-relaxed">{response}</p>
          </div>
        )}

        {response && !responderInfo && (
          <div className="mt-4 p-4 bg-[#9bb49b]/5 rounded-3xl border-l-4 border-[#9bb49b]">
            <p className="text-xs font-semibold text-[#9bb49b] mb-2">Réponse du praticien</p>
            <p className="text-sm text-anthracite/70 italic leading-relaxed">{response}</p>
          </div>
        )}

        <ReportReviewDialog
          open={reportDialogOpen}
          onClose={() => setReportDialogOpen(false)}
          onSubmit={handleReportSubmit}
          isSubmitting={isReporting}
          actionLabel={reportVariant === "pro" ? "Contester l'avis" : "Signaler"}
        />
      </CardContent>
    </Card>
  );
}
