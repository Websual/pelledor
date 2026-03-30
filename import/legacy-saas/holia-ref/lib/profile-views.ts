import { prisma } from "@/lib/prisma";
import { createId } from "@paralleldrive/cuid2";
import type { Session } from "next-auth";

type HeadersLike = { get(name: string): string | null };

/**
 * Enregistre une vue de profil en base.
 * Sécurisé : n'enregistre pas si c'est le praticien lui-même.
 * Debounce : une seule vue par jour et par visiteur (user_id ou ip).
 */
export async function recordProfileView(
  practitionerId: string,
  practitionerUserId: string | null,
  session: Session | null,
  headers: HeadersLike
): Promise<void> {
  try {
    // 1. Ne pas enregistrer si le praticien consulte son propre profil
    if (
      session?.user?.id &&
      practitionerUserId &&
      session.user.id === practitionerUserId
    ) {
      return;
    }

    // 2. Récupérer l'IP pour les visiteurs non connectés
    const ipAddress = getClientIp(headers);

    // 3. Debounce : une seule vue par jour par visiteur (user_id ou ip)
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    // Vérifier si on a déjà une vue aujourd'hui de ce visiteur
    if (session?.user?.id) {
      const existing = await prisma.profile_views.findFirst({
        where: {
          practitioner_id: practitionerId,
          user_id: session.user.id,
          viewed_at: { gte: startOfToday },
        },
      });
      if (existing) return;
    } else if (ipAddress) {
      const existing = await prisma.profile_views.findFirst({
        where: {
          practitioner_id: practitionerId,
          ip_address: ipAddress,
          viewed_at: { gte: startOfToday },
        },
      });
      if (existing) return;
    } else {
      // Pas de session ni d'IP exploitable (rare)
      return;
    }

    // 4. Enregistrer la vue
    const userAgent = headers.get("user-agent") ?? undefined;
    await prisma.profile_views.create({
      data: {
        id: createId(),
        practitioner_id: practitionerId,
        user_id: session?.user?.id ?? null,
        ip_address: ipAddress,
        user_agent: userAgent?.substring(0, 500) ?? null,
      },
    });
  } catch (err) {
    console.error("[profile-views] Erreur enregistrement vue:", err);
  }
}

function getClientIp(headers: HeadersLike): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;
  return null;
}
