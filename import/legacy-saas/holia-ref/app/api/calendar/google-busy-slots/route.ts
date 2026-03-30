import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBusySlots } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    if (!startParam || !endParam) {
      return NextResponse.json(
        { error: "start and end parameters are required" },
        { status: 400 }
      );
    }

    const start = new Date(startParam);
    const end = new Date(endParam);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    // Vérifier que le praticien a activé la synchronisation Google Calendar
    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
      select: {
        id: true,
        google_calendar_block_slots: true,
      },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    // Vérifier si la synchronisation est activée
    if (practitioner.google_calendar_block_slots === false) {
      console.log(`[API] [Sync Google] Blocage Google Calendar désactivé pour praticien ${practitioner.id}`);
      return NextResponse.json({ busySlots: [] });
    }

    console.log(`[API] [Sync Google] Récupération busy slots pour praticien ${practitioner.id}, période: ${start.toISOString()} - ${end.toISOString()}`);

    try {
      const busySlots = await getBusySlots(session.user.id, start, end);
      console.log(`[API] [Sync Google] Succès - ${busySlots.length} créneaux occupés récupérés`);
      
      return NextResponse.json({
        busySlots: busySlots.map((slot) => ({
          start: slot.start.toISOString(),
          end: slot.end.toISOString(),
        })),
      });
    } catch (error: any) {
      console.error(`[API] [Sync Google] Erreur - Échec récupération busy slots:`, error?.message || error);
      
      // Si c'est une erreur de compte non lié, retourner un tableau vide plutôt qu'une erreur
      if (error?.message?.includes("Aucun compte Google lié")) {
        console.log(`[API] [Sync Google] Pas de compte Google lié, retour vide`);
        return NextResponse.json({ busySlots: [] });
      }
      
      // Pour les autres erreurs, retourner une erreur
      return NextResponse.json(
        { error: "Failed to fetch Google Calendar busy slots", details: error?.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[API] [Sync Google] Erreur inattendue:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}
