import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";



// DELETE - Supprimer un horaire de travail
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    // Vérifier que l'horaire appartient au praticien
    const workingHours = await prisma.working_hours.findFirst({
      where: { id },
    });

    if (!workingHours || workingHours.practitioner_id !== practitioner.id) {
      return NextResponse.json(
        { error: "Working hours not found" },
        { status: 404 }
      );
    }

    await prisma.working_hours.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting working hours:", error);
    return NextResponse.json(
      { error: "Failed to delete working hours" },
      { status: 500 }
    );
  }
}

