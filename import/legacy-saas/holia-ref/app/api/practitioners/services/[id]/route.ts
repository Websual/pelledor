import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const serviceSchema = z.object({
  name: z.string().min(1, "Le nom du service est requis").optional(),
  description: z.string().optional(),
  durationMin: z.number().int().min(15, "La durée minimum est de 15 minutes").optional(),
  priceCents: z.number().int().min(0, "Le prix doit être positif").optional(),
});

// GET: Récupérer un service spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Trouver le praticien associé à l'utilisateur
    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    // Récupérer le service
    const service = await prisma.services.findFirst({
      where: {
        id,
        practitioner_id: practitioner.id,
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(service);
  } catch (error) {
    console.error("Error fetching service:", error);
    return NextResponse.json(
      { error: "Failed to fetch service" },
      { status: 500 }
    );
  }
}

// PATCH: Mettre à jour un service
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Trouver le praticien associé à l'utilisateur
    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    // Vérifier que le service appartient au praticien
    const existingService = await prisma.services.findFirst({
      where: {
        id,
        practitioner_id: practitioner.id,
      },
    });

    if (!existingService) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = serviceSchema.parse(body);

    // Mettre à jour le service
    const service = await prisma.services.update({
      where: { id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.description !== undefined && {
          description: validatedData.description || null,
        }),
        ...(validatedData.durationMin && {
          duration_min: validatedData.durationMin,
        }),
        ...(validatedData.priceCents && {
          price_cents: validatedData.priceCents,
        }),
      },
    });

    return NextResponse.json(service);
  } catch (error) {
    console.error("Error updating service:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update service" },
      { status: 500 }
    );
  }
}

// DELETE: Supprimer un service
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Trouver le praticien associé à l'utilisateur
    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    // Vérifier que le service appartient au praticien
    const existingService = await prisma.services.findFirst({
      where: {
        id,
        practitioner_id: practitioner.id,
      },
    });

    if (!existingService) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    // Vérifier s'il y a des rendez-vous (tous statuts) pour ce service
    // Même avec onDelete: Cascade, on veut empêcher la suppression s'il y a des rendez-vous
    const allAppointments = await prisma.appointments.findMany({
      where: {
        service_id: id,
      },
      select: {
        id: true,
        starts_at: true,
        status: true,
      },
    });

    if (allAppointments.length > 0) {
      const upcomingAppointments = allAppointments.filter(
        (apt) => apt.status === "CONFIRMED" && new Date(apt.starts_at) >= new Date()
      );
      
      if (upcomingAppointments.length > 0) {
        return NextResponse.json(
          {
            error:
              `Impossible de supprimer ce service : ${upcomingAppointments.length} rendez-vous ${upcomingAppointments.length > 1 ? "sont" : "est"} encore à venir. Veuillez d'abord annuler ou compléter ces rendez-vous.`,
            upcomingAppointments: upcomingAppointments.map((apt) => ({
              id: apt.id,
              startsAt: apt.starts_at,
            })),
          },
          { status: 400 }
        );
      }
      
      // S'il y a des rendez-vous passés ou PENDING, on peut les supprimer en cascade
      // mais on prévient quand même l'utilisateur
      console.warn(
        `[Service Deletion] Service ${id} has ${allAppointments.length} appointments (including past/PENDING). They will be deleted in cascade.`
      );
    }

    // Supprimer le service
    await prisma.services.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Service deleted successfully" });
  } catch (error) {
    console.error("Error deleting service:", error);
    return NextResponse.json(
      { error: "Failed to delete service" },
      { status: 500 }
    );
  }
}

