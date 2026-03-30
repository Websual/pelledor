import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Nombre de praticiens visibles (actifs ou vérifiés) pour affichage public (menu Découvrir, etc.). */
export async function GET() {
  try {
    const count = await prisma.practitioners.count({
      where: {
        OR: [{ is_active: true }, { is_verified: true }],
      },
    });
    return NextResponse.json({ practitionerCount: count });
  } catch (e) {
    console.error("Stats practitioner count:", e);
    return NextResponse.json({ practitionerCount: 0 });
  }
}
