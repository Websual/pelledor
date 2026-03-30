import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendAcquisitionInvitationEmail } from "@/lib/emails";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const ids = Array.isArray(body.ids) ? body.ids : [];

    if (ids.length === 0) {
      return NextResponse.json(
        { error: "Aucun ID fourni" },
        { status: 400 }
      );
    }

    const practitioners = await prisma.practitioners.findMany({
      where: {
        id: { in: ids },
        user_id: null,
        is_claimed: false,
        contact_email: { not: null },
        acquisition_invitation_sent_at: null,
      },
    });

    let sent = 0;
    const errors: string[] = [];

    for (const p of practitioners) {
      const email = p.contact_email?.trim();
      if (!email) continue;

      try {
        const name =
          [p.first_name, p.last_name].filter(Boolean).join(" ") ||
          p.title?.replace(/^Dr\.?\s*/i, "").trim() ||
          "";
        const locationCity = p.location_city || "votre région";
        const practitionerSlug = p.slug || p.id;
        await sendAcquisitionInvitationEmail({
          practitionerEmail: email,
          practitionerName: name,
          practitionerId: p.id,
          locationCity,
          practitionerSlug,
        });
        await prisma.practitioners.update({
          where: { id: p.id },
          data: { acquisition_invitation_sent_at: new Date() },
        });
        sent++;
      } catch (err) {
        errors.push(`${p.title}: ${err instanceof Error ? err.message : "Erreur"}`);
      }
    }

    return NextResponse.json({
      ok: true,
      sent,
      total: practitioners.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[Admin Acquisition Bulk Invite] Error:", error);
    return NextResponse.json(
      { error: "Échec de l'envoi groupé" },
      { status: 500 }
    );
  }
}
