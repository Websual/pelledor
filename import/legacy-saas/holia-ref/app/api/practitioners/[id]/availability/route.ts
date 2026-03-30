import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncGoogleBusySlotsToExternalEvents } from "@/lib/google-calendar";
import { subMinutes } from "date-fns";


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get("date");
    const serviceId = searchParams.get("serviceId");

    if (!date) {
      return NextResponse.json(
        { error: "Date is required" },
        { status: 400 }
      );
    }

    // Get practitioner with working hours and Google Calendar settings
    // Note: last_google_sync est automatiquement inclus car c'est un champ du modèle practitioners
    const practitioner = await prisma.practitioners.findFirst({
      where: { id },
      include: {
        services: serviceId ? { where: { id: serviceId } } : true,
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

    // Get service if specified
    let service = null;
    if (serviceId) {
      service = practitioner.services.find((s) => s.id === serviceId);
      if (!service) {
        return NextResponse.json(
          { error: "Service not found" },
          { status: 404 }
        );
      }
    } else if (practitioner.services.length > 0) {
      // Use first service as default
      service = practitioner.services[0];
    }

    // Parse date - créer les dates de début/fin de jour en heure locale
    // pour la requête Google Calendar (qui attend UTC, mais JavaScript Date gère la conversion)
    const selectedDate = new Date(date);
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get existing appointments for this day
    const existingAppointments = await prisma.appointments.findMany({
      where: {
        practitioner_id: id,
        starts_at: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ["CONFIRMED"],
        },
      },
      include: {
        services: true,
      },
    });

    // Blocages Holia (RDV confirmés)
    type BlockRange = { start: Date; end: Date };
    const blockedRanges: BlockRange[] = existingAppointments.map((apt) => {
      const start = new Date(apt.starts_at);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + apt.services.duration_min);
      return { start, end };
    });

    // Blocages Google Calendar si le praticien a lié son compte et option activée
    const blockSlots = practitioner.google_calendar_block_slots !== false;
    if (practitioner.user_id && blockSlots) {
      try {
        console.log(`[Availability] [Sync Google] Vérification compte Google pour practitioner ${id}, user_id: ${practitioner.user_id}`);
        const googleAccount = await prisma.accounts.findFirst({
          where: { 
            user_id: practitioner.user_id, 
            provider: "google-calendar"
          },
          select: { id: true },
        });
        
        if (googleAccount) {
          // Vérifier si last_google_sync est plus vieux que 10 minutes (ou null)
          const now = new Date();
          const tenMinutesAgo = subMinutes(now, 10);
          // Accéder à last_google_sync (inclus automatiquement dans le modèle practitioners)
          const lastSync = practitioner.last_google_sync as Date | null | undefined;
          const needsSync = !lastSync || new Date(lastSync) < tenMinutesAgo;

          if (needsSync) {
            console.log(`[Availability] [Sync Google] Synchronisation nécessaire (last_google_sync: ${lastSync || 'null'})`);
            // Lancer la synchronisation en arrière-plan (ne pas attendre)
            syncGoogleBusySlotsToExternalEvents(
              id,
              practitioner.user_id,
              startOfDay,
              endOfDay
            ).catch((error) => {
              console.error(`[Availability] [Sync Google] Erreur lors de la synchronisation en arrière-plan:`, error);
            });
          } else {
            console.log(`[Availability] [Sync Google] Synchronisation récente (last_google_sync: ${lastSync}), utilisation des données en cache`);
          }

          // Utiliser les données déjà présentes dans external_events
          const externalEvents = await prisma.external_events.findMany({
            where: {
              practitioner_id: id,
              provider: "google-calendar",
              starts_at: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
          });

          console.log(`[Availability] [Sync Google] ${externalEvents.length} événements externes trouvés en cache`);
          
          // Convertir les external_events en BlockRange
          const googleBlockedRanges = externalEvents.map((event) => ({
            start: new Date(event.starts_at),
            end: new Date(event.ends_at),
          }));

          blockedRanges.push(...googleBlockedRanges);
          console.log(`[Availability] [Sync Google] ${googleBlockedRanges.length} créneaux Google ajoutés aux blocages depuis le cache`);
        } else {
          console.log(`[Availability] [Sync Google] Aucun compte Google lié pour practitioner ${id}`);
        }
      } catch (e) {
        console.error("[Availability] [Sync Google] Erreur - Google Calendar sync failed:", e);
        // Continuer sans blocages Google
      }
    } else {
      console.log(`[Availability] [Sync Google] Blocage Google désactivé ou pas de user_id pour practitioner ${id}`);
    }

    // Get day of week (1 = Monday, 2 = Tuesday, ..., 7 = Sunday)
    // JavaScript getDay() returns 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const jsDayOfWeek = selectedDate.getDay();
    const dayOfWeek = jsDayOfWeek === 0 ? 7 : jsDayOfWeek; // Convert to 1-7 format
    
    // Find all working hours for this day (can have multiple time ranges)
    const workingHoursForDay = practitioner.working_hours
      .filter((wh) => wh.day_of_week === dayOfWeek && wh.is_active)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

    // If no working hours defined for this day, return empty slots
    if (workingHoursForDay.length === 0) {
      return NextResponse.json({
        date,
        practitionerId: id,
        serviceId: service?.id || null,
        durationMin: service?.duration_min || 60,
        availableSlots: [],
      });
    }

    // Generate available time slots within all working hours ranges
    const availableSlots: string[] = [];
    const durationMin = service?.duration_min || 60; // Default 60 minutes

    // Process each time range
    for (const workingHoursRange of workingHoursForDay) {
      // Parse working hours
      const [startHour, startMinute] = workingHoursRange.start_time
        .split(":")
        .map(Number);
      const [endHour, endMinute] = workingHoursRange.end_time
        .split(":")
        .map(Number);

      // Start from working hours start time
      let currentHour = startHour;
      let currentMinute = startMinute;

      while (
        currentHour < endHour ||
        (currentHour === endHour && currentMinute < endMinute)
      ) {
        // Créer les dates de créneau en heure locale (les heures de travail sont en heure locale)
        // JavaScript Date gère automatiquement les conversions UTC/local lors des comparaisons
        const slotStart = new Date(selectedDate);
        slotStart.setHours(currentHour, currentMinute, 0, 0);

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + durationMin);

        // Check if slot end is within working hours
        const slotEndHour = slotEnd.getHours();
        const slotEndMinute = slotEnd.getMinutes();
        const isWithinWorkingHours =
          slotEndHour < endHour ||
          (slotEndHour === endHour && slotEndMinute <= endMinute);

        // Check if slot is in the past
        if (slotStart < new Date()) {
          // Move to next slot
          currentMinute += 30;
          if (currentMinute >= 60) {
            currentMinute = 0;
            currentHour++;
          }
          continue;
        }

        // Check if slot is within working hours
        if (!isWithinWorkingHours) {
          break; // Stop if we've exceeded working hours for this range
        }

        // Check if slot overlaps with Holia RDV + Google Calendar busy slots
        const isAvailable = !blockedRanges.some((range) => {
          return (
            (slotStart >= range.start && slotStart < range.end) ||
            (slotEnd > range.start && slotEnd <= range.end) ||
            (slotStart <= range.start && slotEnd >= range.end)
          );
        });

        if (isAvailable) {
          const timeString = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`;
          // Avoid duplicates
          if (!availableSlots.includes(timeString)) {
            availableSlots.push(timeString);
          }
        }

        // Move to next slot (30 minutes interval)
        currentMinute += 30;
        if (currentMinute >= 60) {
          currentMinute = 0;
          currentHour++;
        }
      }
    }

    // Sort slots chronologically
    availableSlots.sort();

    return NextResponse.json({
      date,
      practitionerId: id,
      serviceId: service?.id || null,
      durationMin,
      availableSlots,
    });
  } catch (error) {
    console.error("Error fetching availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}

