import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendAcquisitionInvitationEmail } from "@/lib/emails";

/**
 * Envoie un email de prévisualisation acquisition vers l'adresse demandée (avec placeholders)
 * GET /api/admin/acquisition/send-preview-email?to=contact@websual.fr
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const to = searchParams.get("to") || "contact@websual.fr";

    await sendAcquisitionInvitationEmail({
      practitionerEmail: to,
      practitionerName: "[Prénom Nom]",
      practitionerId: "preview-placeholder",
      locationCity: "Pau",
      practitionerSlug: "exemple-praticien",
    });

    return NextResponse.json({
      ok: true,
      message: `Email de prévisualisation envoyé à ${to}`,
    });
  } catch (error) {
    console.error("[Admin Acquisition Preview] Error:", error);
    return NextResponse.json(
      { error: "Échec de l'envoi (vérifier SMTP/Resend)" },
      { status: 500 }
    );
  }
}
