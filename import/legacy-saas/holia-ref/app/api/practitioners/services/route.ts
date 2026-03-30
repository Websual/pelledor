import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";


const serviceSchema = z.object({
  name: z.string().min(1, "Le nom du service est requis"),
  description: z.string().optional(),
  durationMin: z.number().int().min(15, "La durée minimum est de 15 minutes"),
  priceCents: z.number().int().min(0, "Le prix doit être positif"),
});

// GET: Récupérer tous les services du praticien
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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

    // Récupérer les services du praticien
    const services = await prisma.services.findMany({
      where: { practitioner_id: practitioner.id },
      orderBy: {
        created_at: "desc",
      },
    });

    return NextResponse.json(services);
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}

// POST: Créer un nouveau service
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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

    const body = await request.json();
    const validatedData = serviceSchema.parse(body);

    // Créer le service
    const service = await prisma.services.create({
      data: {
        id: createId(),
        practitioner_id: practitioner.id,
        name: validatedData.name,
        description: validatedData.description || null,
        duration_min: validatedData.durationMin,
        price_cents: validatedData.priceCents,
      } as any,
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error("Error creating service:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create service" },
      { status: 500 }
    );
  }
}

