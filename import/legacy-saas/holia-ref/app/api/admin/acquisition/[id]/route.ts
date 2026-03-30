import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: practitionerId } = await params;
    const body = await request.json();
    const contactEmail = typeof body.contact_email === "string" ? body.contact_email.trim() : null;

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

    await prisma.practitioners.update({
      where: { id: practitionerId },
      data: { contact_email: contactEmail || null },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Admin Acquisition PATCH] Error:", error);
    return NextResponse.json(
      { error: "Échec de la mise à jour" },
      { status: 500 }
    );
  }
}
