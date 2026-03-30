import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";


const serviceSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  durationMin: z.number().min(15, "Durée minimale: 15 minutes"),
  priceCents: z.number().min(0, "Prix requis"),
  description: z.string().optional().nullable(),
  locationType: z.enum(["PRESENTIAL_ONLY", "VIDEO_ONLY", "HYBRID"]).optional().default("PRESENTIAL_ONLY"),
  practitionerId: z.string().min(1, "ID praticien requis"),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const practitionerId = searchParams.get("practitionerId");

    const where: any = {};

    if (practitionerId) {
      where.practitionerId = practitionerId;
    }

    const services = await prisma.services.findMany({
      where: practitionerId ? { practitioner_id: practitionerId } : {},
      include: {
        practitioners: {
          select: {
            id: true,
            title: true,
            location_city: true,
          },
        },
      },
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = serviceSchema.parse(body);

    // Vérifier que le praticien existe et appartient à l'utilisateur
    const practitioner = await prisma.practitioners.findFirst({
      where: {
        id: validatedData.practitionerId,
        user_id: session.user.id,
      },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    const service = await prisma.services.create({
      data: {
        id: createId(),
        practitioner_id: validatedData.practitionerId,
        name: validatedData.name,
        duration_min: validatedData.durationMin,
        price_cents: validatedData.priceCents,
        description: validatedData.description || null,
        location_type: validatedData.locationType || "PRESENTIAL_ONLY",
        updated_at: new Date(),
      },
    });

    return NextResponse.json(service);
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

