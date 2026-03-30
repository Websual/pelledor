import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";



// GET: Vérifier si un praticien est dans les favoris
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ practitionerId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { practitionerId } = await params;

    const favorite = await prisma.favorites.findFirst({
      where: {
        user_id: session.user.id,
        practitioner_id: practitionerId,
      },
    });

    return NextResponse.json({ isFavorite: !!favorite });
  } catch (error) {
    console.error("Error checking favorite:", error);
    return NextResponse.json(
      { error: "Failed to check favorite" },
      { status: 500 }
    );
  }
}

