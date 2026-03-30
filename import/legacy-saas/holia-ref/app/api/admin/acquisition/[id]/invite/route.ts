import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendAcquisitionInvitationEmail } from "@/lib/emails";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: practitionerId } = await params;

    const practitioner = await prisma.practitioners.findFirst({
      where: {
        id: practitionerId,
        user_id: null,
        is_claimed: false,
      },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Praticien introuvable ou déjà réclamé" },
        { status: 404 }
      );
    }

    const email = practitioner.contact_email?.trim();
    if (!email) {
      return NextResponse.json(
        { error: "Aucun email scrapé pour ce praticien" },
        { status: 400 }
      );
    }

    const practitionerName =
      [practitioner.first_name, practitioner.last_name].filter(Boolean).join(" ") ||
      practitioner.title?.replace(/^Dr\.?\s*/i, "").trim() ||
      "";
    const locationCity = practitioner.location_city || "votre région";
    const practitionerSlug = practitioner.slug || practitioner.id;

    await sendAcquisitionInvitationEmail({
      practitionerEmail: email,
      practitionerName,
      practitionerId: practitioner.id,
      locationCity,
      practitionerSlug,
    });

    await prisma.practitioners.update({
      where: { id: practitionerId },
      data: { acquisition_invitation_sent_at: new Date() },
    });

    return NextResponse.json({
      ok: true,
      message: "Invitation envoyée avec succès",
    });
  } catch (error) {
    console.error("[Admin Acquisition Invite] Error:", error);
    return NextResponse.json(
      { error: "Échec de l'envoi de l'invitation" },
      { status: 500 }
    );
  }
}
