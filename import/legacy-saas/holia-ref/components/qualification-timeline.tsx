"use client";

import { GraduationCap, Shield } from "lucide-react";

// Accepte snake_case (Prisma) ou camelCase (API profile)
interface Qualification {
  id: string;
  title: string;
  institution: string;
  discipline?: string | null;
  obtained_year?: number | null;
  obtainedYear?: number | null;
  duration?: string | null;
  description?: string | null;
  skills?: string[] | null;
  certificate_url?: string | null;
  certificateUrl?: string | null;
  is_verified?: boolean | null;
  isVerified?: boolean | null;
}

function normalizeQualification(q: Qualification) {
  return {
    id: q.id,
    title: q.title,
    institution: q.institution,
    discipline: q.discipline ?? null,
    obtainedYear: q.obtained_year ?? q.obtainedYear ?? null,
    duration: q.duration ?? null,
    description: q.description ?? null,
    skills: Array.isArray(q.skills) ? q.skills : [],
    hasCertificate: !!(q.certificate_url || q.certificateUrl),
    isVerified: !!(q.is_verified ?? q.isVerified),
  };
}

interface QualificationTimelineProps {
  qualifications: Qualification[];
}

export function QualificationTimeline({ qualifications }: QualificationTimelineProps) {
  const normalized = qualifications.map(normalizeQualification);

  if (normalized.length === 0) return null;

  return (
    <div className="relative pl-4">
      {/* Ligne verticale en pointillé */}
      <div
        className="absolute left-[30px] top-6 bottom-6 w-px border-l-2 border-dotted border-gray-200"
        aria-hidden
      />

      <div className="space-y-10">
        {normalized.map((qual) => {
          const showVerifiedBadge = qual.hasCertificate || qual.isVerified;

          return (
            <div key={qual.id} className="relative flex items-start gap-6">
              {/* Point / icône de la timeline */}
              <div className="flex-shrink-0 relative z-10 mt-1">
                <div className="w-8 h-8 bg-white rounded-full border-2 border-sauge flex items-center justify-center shadow-sm">
                  <GraduationCap className="h-4 w-4 text-sauge" />
                </div>
              </div>

              {/* Carte individuelle */}
              <div className="flex-1 min-w-0 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                {/* Titre du diplôme (hiérarchie principale) */}
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <h3 className="text-lg font-bold text-anthracite">{qual.title}</h3>
                  {showVerifiedBadge && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sauge/10 text-sauge rounded-full text-xs font-medium shrink-0">
                      <Shield className="h-3 w-3" />
                      Diplôme vérifié
                    </span>
                  )}
                </div>

                {/* Établissement (gris clair, avec icône) */}
                <div className="flex items-center gap-2 text-anthracite/60 mb-4">
                  <GraduationCap className="h-4 w-4 text-anthracite/50 flex-shrink-0" />
                  <span className="text-sm font-medium">{qual.institution}</span>
                </div>

                {/* Discipline et Année */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-anthracite/70 mb-3">
                  {qual.discipline && <span>{qual.discipline}</span>}
                  {qual.obtainedYear && (
                    <>
                      {qual.discipline && <span>•</span>}
                      <span>Année d&apos;obtention : {qual.obtainedYear}</span>
                    </>
                  )}
                </div>

                {/* Durée de la formation */}
                {qual.duration && (
                  <p className="text-sm text-anthracite/70 mb-3">
                    Durée : {qual.duration}
                  </p>
                )}

                {/* Description complète */}
                {qual.description && (
                  <p className="text-sm text-anthracite/80 leading-relaxed mb-4">
                    {qual.description}
                  </p>
                )}

                {/* Compétences acquises (badges bg-slate-50, plus subtils) */}
                {qual.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {qual.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-3 py-1 bg-slate-50 text-anthracite/80 rounded-full text-xs font-medium border border-slate-100"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
