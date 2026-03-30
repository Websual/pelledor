import { google, calendar_v3 } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { add } from "date-fns";
import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

const REDIRECT_URI =
  process.env.NEXTAUTH_URL != null
    ? `${process.env.NEXTAUTH_URL.replace(/\/$/, "")}/api/auth/calendar/callback`
    : process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/auth/calendar/callback`
    : "http://localhost:3005/api/auth/calendar/callback";

export type GoogleCalendarClient = {
  calendar: calendar_v3.Calendar;
  oauth2Client: OAuth2Client;
};

/**
 * Récupère les tokens Google de l'utilisateur en DB et initialise l'instance
 * google.calendar (calendrier 'primary'). Persiste les nouveaux tokens après
 * refresh automatique.
 */
export async function getGoogleCalendarClient(
  userId: string
): Promise<GoogleCalendarClient> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "[google-calendar] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET manquants"
    );
  }

  const account = await prisma.accounts.findFirst({
    where: {
      user_id: userId,
      provider: "google-calendar",
    },
  });

  if (!account) {
    throw new Error(
      `[google-calendar] Aucun compte Google lié pour l'utilisateur ${userId}`
    );
  }

  if (!account.refresh_token) {
    throw new Error(
      `[google-calendar] refresh_token manquant pour le compte Google (user ${userId}). Reconnectez-vous avec consentement.`
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    REDIRECT_URI
  );

  const expiryDate = account.expires_at
    ? new Date(account.expires_at * 1000)
    : null;
  oauth2Client.setCredentials({
    access_token: account.access_token ?? undefined,
    refresh_token: account.refresh_token,
    expiry_date: expiryDate?.getTime() ?? undefined,
  });

  oauth2Client.on("tokens", async (tokens) => {
    try {
      console.log(`[google-calendar] [Refresh Token] Nouveaux tokens reçus pour user ${userId}`);
      const update: {
        access_token?: string;
        refresh_token?: string;
        expires_at?: number;
      } = {};
      if (tokens.access_token != null) {
        update.access_token = tokens.access_token;
        console.log(`[google-calendar] [Refresh Token] Access token mis à jour`);
      }
      if (tokens.refresh_token != null) {
        update.refresh_token = tokens.refresh_token;
        console.log(`[google-calendar] [Refresh Token] Refresh token mis à jour`);
      }
      if (tokens.expiry_date != null) {
        update.expires_at = Math.floor((tokens.expiry_date as number) / 1000);
        console.log(`[google-calendar] [Refresh Token] Expiry date mis à jour: ${new Date(tokens.expiry_date).toISOString()}`);
      }

      if (Object.keys(update).length === 0) {
        console.log(`[google-calendar] [Refresh Token] Aucune mise à jour nécessaire`);
        return;
      }

      await prisma.accounts.update({
        where: {
          provider_provider_account_id: {
            provider: "google-calendar",
            provider_account_id: account.provider_account_id,
          },
        },
        data: update,
      });
      console.log(`[google-calendar] [Refresh Token] Succès - Tokens persistés en DB`);
    } catch (e) {
      console.error(`[google-calendar] [Refresh Token] Erreur - Échec persistance tokens après refresh:`, e);
    }
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  return { calendar, oauth2Client };
}

export type BusySlot = { start: Date; end: Date };

/**
 * Récupère les créneaux occupés du calendrier Google (primary) pour bloquer
 * les disponibilités sur Holia.
 */
export async function getBusySlots(
  userId: string,
  start: Date,
  end: Date
): Promise<BusySlot[]> {
  const { calendar } = await getGoogleCalendarClient(userId);

  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      items: [{ id: "primary" }],
    },
  });

  const busy = res.data.calendars?.primary?.busy ?? [];
  return busy.map((b) => ({
    start: new Date(b.start!),
    end: new Date(b.end!),
  }));
}

/**
 * Synchronise les busy slots Google Calendar et les stocke dans external_events
 * pour optimiser les appels API. Cette fonction est appelée en arrière-plan.
 * Note: Cette fonction synchronise uniquement les busy slots (créneaux occupés),
 * pas les événements complets. Pour synchroniser les événements complets, utiliser
 * l'API /api/practitioners/google-sync.
 */
export async function syncGoogleBusySlotsToExternalEvents(
  practitionerId: string,
  userId: string,
  start: Date,
  end: Date
): Promise<void> {
  try {
    console.log(`[google-calendar] [syncBusySlots] Synchronisation des busy slots pour practitioner ${practitionerId} du ${start.toISOString()} au ${end.toISOString()}`);
    
    // Récupérer les busy slots depuis Google Calendar
    const busySlots = await getBusySlots(userId, start, end);
    console.log(`[google-calendar] [syncBusySlots] ${busySlots.length} créneaux occupés récupérés`);

    // Supprimer uniquement les busy slots de cette période (pas les événements complets)
    // On identifie les busy slots par leur external_id qui commence par "busy_"
    await prisma.external_events.deleteMany({
      where: {
        practitioner_id: practitionerId,
        provider: "google-calendar",
        external_id: { startsWith: "busy_" },
        starts_at: {
          gte: start,
          lte: end,
        },
      },
    });

    // Convertir les busy slots en external_events
    const eventsToInsert = busySlots.map((slot) => ({
      id: `${practitionerId}_busy_${slot.start.getTime()}_${slot.end.getTime()}`,
      practitioner_id: practitionerId,
      external_id: `busy_${slot.start.getTime()}_${slot.end.getTime()}`,
      provider: "google-calendar",
      title: "Indisponible (Google Calendar)",
      description: null,
      starts_at: slot.start,
      ends_at: slot.end,
      location: null,
      synced_at: new Date(),
      updated_at: new Date(),
    }));

    if (eventsToInsert.length > 0) {
      await prisma.external_events.createMany({
        data: eventsToInsert,
        skipDuplicates: true,
      });
      console.log(`[google-calendar] [syncBusySlots] ${eventsToInsert.length} événements externes (busy slots) créés`);
    }

    // Mettre à jour last_google_sync
    await prisma.practitioners.update({
      where: { id: practitionerId },
      data: {
        last_google_sync: new Date(),
      },
    });
    console.log(`[google-calendar] [syncBusySlots] last_google_sync mis à jour pour practitioner ${practitionerId}`);
  } catch (error: any) {
    console.error(`[google-calendar] [syncBusySlots] Erreur lors de la synchronisation pour practitioner ${practitionerId}:`, {
      message: error?.message || "Erreur inconnue",
      stack: error?.stack,
    });
    // Ne pas throw pour ne pas bloquer le processus
  }
}

/**
 * Crée un événement Google à partir d'un RDV Holia dans le calendrier
 * 'primary' du praticien. Retourne l'événement créé (dont `id` pour
 * deleteGoogleEvent / annulations).
 * Vérifie d'abord si l'événement existe déjà (google_event_id) pour éviter les doublons.
 * En cas d'erreur lors de l'appel Google, logue l'erreur mais ne bloque pas le processus.
 */
export async function createGoogleEvent(
  appointmentId: string
): Promise<calendar_v3.Schema$Event | null> {
  // 1. Check d'existence au tout début : si google_event_id existe, sortir immédiatement
  // Utiliser une transaction avec verrou pessimiste pour éviter les conditions de course
  return await prisma.$transaction(async (tx) => {
    // Vérifier et verrouiller l'appointment avec FOR UPDATE pour éviter les doublons
    const appointment = await tx.$queryRaw<Array<{
      id: string;
      google_event_id: string | null;
      user_id: string;
      practitioner_id: string;
      service_id: string;
      starts_at: Date;
      location_choice: string | null;
    }>>`
      SELECT 
        a.id, 
        a.google_event_id,
        a.user_id,
        a.practitioner_id,
        a.service_id,
        a.starts_at,
        a.location_choice
      FROM appointments a
      WHERE a.id = ${appointmentId}
      FOR UPDATE
    `;

    if (!appointment || appointment.length === 0) {
      console.error(`[google-calendar] [createGoogleEvent] Rendez-vous introuvable: ${appointmentId}`);
      return null;
    }

    const apt = appointment[0];

    // Verrou d'unicité : vérifier si google_event_id est déjà rempli
    if (apt.google_event_id) {
      console.log(`[google-calendar] [createGoogleEvent] Événement Google déjà créé pour appointment ${appointmentId} (google_event_id: ${apt.google_event_id}). Arrêt de la fonction.`);
      return null;
    }

    // Récupérer les données complètes nécessaires
    const [practitioner, service, user] = await Promise.all([
      tx.practitioners.findUnique({
        where: { id: apt.practitioner_id },
        select: { user_id: true },
      }),
      tx.services.findUnique({
        where: { id: apt.service_id },
        select: { name: true, duration_min: true },
      }),
      tx.users.findUnique({
        where: { id: apt.user_id },
        select: { name: true, email: true },
      }),
    ]);

    if (!practitioner || !service || !user) {
      console.error(`[google-calendar] [createGoogleEvent] Données manquantes pour appointment ${appointmentId}`);
      return null;
    }

    const practitionerUserId = practitioner.user_id;
    if (!practitionerUserId) {
      console.error(`[google-calendar] [createGoogleEvent] Practitioner user_id manquant pour appointment ${appointmentId}`);
      return null;
    }

    const start = new Date(apt.starts_at);
    const end = add(start, { minutes: service.duration_min });

    // Formatage du lieu selon location_choice
    let locationText = "";
    if (apt.location_choice === "PRESENTIAL") {
      locationText = "Au cabinet";
    } else if (apt.location_choice === "VIDEO") {
      locationText = "En visioconférence";
    } else {
      locationText = "À définir";
    }

    // Titre amélioré : '✨ Holia : {Service} - {PatientName}'
    const patientName = user.name || user.email || "Patient";
    const summary = `✨ Holia : ${service.name} - ${patientName}`;

    // Description améliorée
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://holia.me";
    const description = [
      "Rendez-vous réservé via Holia.",
      `Patient : ${patientName}`,
      `Lieu : ${locationText}`,
      `Lien de gestion : ${baseUrl}/pro/appointments/${appointmentId}`,
    ].join("\n");

    // 2. Gestion des erreurs : wrapper l'appel Google dans un try/catch
    // Si l'appel échoue, logger l'erreur mais ne pas bloquer le processus
    try {
      const { calendar } = await getGoogleCalendarClient(practitionerUserId);

      const res = await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary,
          description: description || undefined,
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() },
        },
      });

      const event = res.data;
      if (!event?.id) {
        console.error(`[google-calendar] [createGoogleEvent] Création événement Google sans id pour appointment ${appointmentId}`);
        return null;
      }

      // 3. Écriture immédiate et atomique : utiliser updateMany avec condition pour éviter les doublons
      // Même avec le verrou FOR UPDATE, on utilise updateMany avec condition comme sécurité supplémentaire
      const updateResult = await tx.appointments.updateMany({
        where: {
          id: appointmentId,
          google_event_id: null, // Ne mettre à jour que si google_event_id est encore null
        },
        data: {
          google_event_id: event.id,
          updated_at: new Date(),
        },
      });

      if (updateResult.count === 0) {
        // Un autre processus a déjà créé l'événement entre-temps (très rare avec FOR UPDATE mais possible)
        console.log(`[google-calendar] [createGoogleEvent] Événement Google déjà créé par un autre processus pour appointment ${appointmentId}. Suppression de l'événement dupliqué ${event.id}`);
        // Supprimer l'événement Google créé car il est en double
        try {
          await calendar.events.delete({
            calendarId: "primary",
            eventId: event.id,
          });
          console.log(`[google-calendar] [createGoogleEvent] Événement dupliqué ${event.id} supprimé de Google Calendar`);
        } catch (deleteError) {
          console.error(`[google-calendar] [createGoogleEvent] Erreur lors de la suppression de l'événement dupliqué ${event.id}:`, deleteError);
        }
        return null;
      }

      console.log(`[google-calendar] [createGoogleEvent] Succès - Événement créé (ID: ${event.id}) et enregistré immédiatement pour appointment ${appointmentId}`);

      return event;
    } catch (error: any) {
      // Gestion des erreurs : logger l'erreur mais ne pas bloquer le processus
      console.error(`[google-calendar] [createGoogleEvent] Erreur - Échec création événement Google pour appointment ${appointmentId}:`, {
        message: error?.message || "Erreur inconnue",
        code: error?.code,
        stack: error?.stack,
      });
      // Retourner null au lieu de throw pour ne pas bloquer le processus de confirmation
      return null;
    }
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable, // Isolation maximale pour éviter les conditions de course
    timeout: 10000, // Timeout de 10 secondes
  });
}

/**
 * Supprime un événement Google (annulations). Nécessite le `userId` du
 * propriétaire du calendrier (praticien) et l'`externalEventId` retourné
 * par createGoogleEvent.
 */
export async function deleteGoogleEvent(
  externalEventId: string,
  userId: string
): Promise<void> {
  const { calendar } = await getGoogleCalendarClient(userId);

  await calendar.events.delete({
    calendarId: "primary",
    eventId: externalEventId,
  });
}
