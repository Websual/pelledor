import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";



// POST: Suspendre un praticien
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Vérifier que le praticien existe
    const practitioner = await prisma.practitioners.findFirst({
      where: { id },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    // Suspendre le praticien (retirer aussi de la recherche publique)
    const updatedPractitioner = await prisma.practitioners.update({
      where: { id },
      data: {
        is_active: false,
        is_verified: false,
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            created_at: true,
          },
        },
        professions: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        services: {
          select: {
            id: true,
            name: true,
            duration_min: true,
            price_cents: true,
          },
        },
        _count: {
          select: {
            appointments: true,
            reviews: true,
          },
        },
      },
    });

    // TODO V2: Envoyer un email de notification au praticien
    // await sendPractitionerSuspensionEmail(updatedPractitioner.users.email);

    return NextResponse.json(updatedPractitioner);
  } catch (error) {
    console.error("Error suspending practitioner:", error);
    return NextResponse.json(
      { error: "Failed to suspend practitioner" },
      { status: 500 }
    );
  }
}

