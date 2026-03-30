import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGoogleCalendarClient } from "@/lib/google-calendar";
import { google } from "googleapis";
import { startOfMonth, endOfMonth, subMonths, addMonths, getDay } from "date-fns";

/**
 * API pour synchroniser manuellement les événements Google Calendar
 * Récupère les événements du calendrier Google et les stocke dans external_events
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Récupérer le praticien de l'utilisateur connecté avec ses horaires de travail
    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
      include: {
        working_hours: {
          where: { is_active: true },
        },
      },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    // Vérifier si le compte Google est lié
    const googleAccount = await prisma.accounts.findFirst({
      where: {
        user_id: practitioner.user_id!,
        provider: "google-calendar",
      },
      select: { id: true },
    });

    if (!googleAccount) {
      return NextResponse.json(
        { error: "Google Calendar account not linked. Please connect your account in settings." },
        { status: 400 }
      );
    }

    // Vérifier si l'option de blocage est activée
    if (practitioner.google_calendar_block_slots === false) {
      return NextResponse.json(
        { error: "Google Calendar blocking is disabled. Enable it in settings." },
        { status: 400 }
      );
    }

    // Récupérer les événements Google Calendar pour le mois en cours et le mois suivant
    const now = new Date();
    const startDate = startOfMonth(now);
    const endDate = endOfMonth(addMonths(now, 1));

    console.log(`[Google Sync] Synchronisation des événements Google pour practitioner ${practitioner.id} du ${startDate.toISOString()} au ${endDate.toISOString()}`);

    const { calendar } = await getGoogleCalendarClient(practitioner.user_id!);

    // Récupérer tous les événements de la période
    const eventsResponse = await calendar.events.list({
      calendarId: "primary",
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 2500, // Limite Google Calendar API
    });

    const googleEvents = eventsResponse.data.items || [];
    console.log(`[Google Sync] ${googleEvents.length} événements récupérés depuis Google Calendar`);

    // 1. Récupérer tous les google_event_id des appointments Holia pour dédoublonnage
    const holiaAppointments = await prisma.appointments.findMany({
      where: {
        practitioner_id: practitioner.id,
        google_event_id: { not: null },
      },
      select: {
        google_event_id: true,
      },
    });
    const holiaGoogleEventIds = new Set(
      holiaAppointments
        .map((apt) => apt.google_event_id)
        .filter((id): id is string => id !== null)
    );
    console.log(`[Google Sync] ${holiaGoogleEventIds.size} rendez-vous Holia avec google_event_id trouvés`);

    // 2. Fonction pour vérifier si un événement est dans les horaires de travail
    const isWithinWorkingHours = (eventStart: Date, eventEnd: Date): boolean => {
      if (!practitioner.working_hours || practitioner.working_hours.length === 0) {
        // Si pas d'horaires définis, on accepte tout
        return true;
      }

      const eventDayOfWeek = getDay(eventStart) === 0 ? 7 : getDay(eventStart); // Convertir dimanche de 0 à 7
      const eventStartTime = `${String(eventStart.getHours()).padStart(2, "0")}:${String(eventStart.getMinutes()).padStart(2, "0")}`;
      const eventEndTime = `${String(eventEnd.getHours()).padStart(2, "0")}:${String(eventEnd.getMinutes()).padStart(2, "0")}`;

      // Vérifier si l'événement chevauche au moins une plage horaire active
      return practitioner.working_hours.some((wh) => {
        if (wh.day_of_week !== eventDayOfWeek) return false;
        // L'événement doit commencer ET se terminer dans une plage horaire
        return eventStartTime >= wh.start_time && eventEndTime <= wh.end_time;
      });
    };

    // 3. Filtrer les événements :
    // - Ignorer ceux créés par Holia (commencent par "✨ Holia :")
    // - Ignorer ceux qui correspondent à un google_event_id d'un RDV Holia
    // - Ignorer ceux qui sont complètement en dehors des horaires de travail
    const externalEvents = googleEvents.filter((event) => {
      // Ignorer les événements Holia
      if (event.summary?.startsWith("✨ Holia :")) {
        return false;
      }

      // Ignorer si l'ID correspond à un google_event_id d'un RDV Holia
      if (event.id && holiaGoogleEventIds.has(event.id)) {
        console.log(`[Google Sync] Ignoré (doublon Holia): ${event.summary} (ID: ${event.id})`);
        return false;
      }

      // Calculer les dates de début et fin
      const eventStart = event.start?.dateTime
        ? new Date(event.start.dateTime)
        : event.start?.date
        ? new Date(event.start.date)
        : null;
      const eventEnd = event.end?.dateTime
        ? new Date(event.end.dateTime)
        : event.end?.date
        ? new Date(event.end.date)
        : null;

      if (!eventStart || !eventEnd) {
        return false; // Ignorer les événements sans dates valides
      }

      // Filtrer selon les horaires de travail
      if (!isWithinWorkingHours(eventStart, eventEnd)) {
        console.log(`[Google Sync] Ignoré (hors horaires): ${event.summary} (${eventStart.toISOString()} - ${eventEnd.toISOString()})`);
        return false;
      }

      return true;
    });

    console.log(`[Google Sync] ${externalEvents.length} événements externes à synchroniser (après tous les filtres)`);

    // 4. Nettoyage complet : Supprimer TOUS les anciens événements externes pour ce praticien
    // (pas seulement ceux de la période, pour avoir une vue propre et à jour)
    const deletedCount = await prisma.external_events.deleteMany({
      where: {
        practitioner_id: practitioner.id,
        provider: "google-calendar",
      },
    });
    console.log(`[Google Sync] ${deletedCount.count} anciens événements externes supprimés`);

    // Insérer les nouveaux événements
    const eventsToInsert = externalEvents.map((event) => {
      const start = event.start?.dateTime
        ? new Date(event.start.dateTime)
        : event.start?.date
        ? new Date(event.start.date)
        : new Date();
      const end = event.end?.dateTime
        ? new Date(event.end.dateTime)
        : event.end?.date
        ? new Date(event.end.date)
        : new Date(start.getTime() + 60 * 60 * 1000); // Par défaut 1h

      return {
        id: `${practitioner.id}_${event.id}`,
        practitioner_id: practitioner.id,
        external_id: event.id!,
        provider: "google-calendar",
        title: event.summary || "Sans titre",
        description: event.description || null,
        starts_at: start,
        ends_at: end,
        location: event.location || null,
        synced_at: new Date(),
        updated_at: new Date(),
      };
    });

    if (eventsToInsert.length > 0) {
      await prisma.external_events.createMany({
        data: eventsToInsert,
        skipDuplicates: true,
      });
      console.log(`[Google Sync] ${eventsToInsert.length} événements externes enregistrés en DB`);
    }

    return NextResponse.json({
      success: true,
      synced: externalEvents.length,
      message: "Agenda synchronisé avec Google Calendar",
    });
  } catch (error: any) {
    console.error("[Google Sync] Erreur lors de la synchronisation:", error);
    return NextResponse.json(
      {
        error: "Failed to sync Google Calendar",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
