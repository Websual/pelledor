import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const serviceUpdateSchema = z.object({
  name: z.string().min(1, "Nom requis").optional(),
  durationMin: z.number().min(15, "Durée minimale: 15 minutes").optional(),
  priceCents: z.number().min(0, "Prix requis").optional(),
  description: z.string().optional().nullable(),
  locationType: z.enum(["PRESENTIAL_ONLY", "VIDEO_ONLY", "HYBRID"]).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const service = await prisma.services.findFirst({
      where: { id },
      include: {
        practitioners: {
          select: {
            id: true,
            title: true,
            location_city: true,
            subscription_status: true,
            allow_deferred_payment: true,
            stripe_account_id: true,
            stripe_onboarding_complete: true,
          },
        },
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    // Transform snake_case to camelCase for frontend
    const transformedService = {
      ...service,
      durationMin: service.duration_min,
      priceCents: service.price_cents,
      locationType: service.location_type,
      practitioner: {
        id: service.practitioners.id,
        title: service.practitioners.title,
        locationCity: service.practitioners.location_city,
        subscriptionStatus: service.practitioners.subscription_status,
        allowDeferredPayment: service.practitioners.allow_deferred_payment,
        stripeAccountId: service.practitioners.stripe_account_id,
        stripeOnboardingComplete: service.practitioners.stripe_onboarding_complete,
      },
    };

    // Remove old snake_case fields
    delete (transformedService as any).duration_min;
    delete (transformedService as any).price_cents;
    delete (transformedService as any).location_type;
    delete (transformedService as any).practitioners;

    return NextResponse.json(transformedService);
  } catch (error) {
    console.error("Error fetching service:", error);
    return NextResponse.json(
      { error: "Failed to fetch service" },
      { status: 500 }
    );
  }
}

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
    const body = await request.json();
    const validatedData = serviceUpdateSchema.parse(body);

    // Vérifier que le service existe et appartient au praticien de l'utilisateur
    const service = await prisma.services.findFirst({
      where: {
        id,
        practitioners: {
          user_id: session.user.id,
        },
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.durationMin !== undefined) updateData.duration_min = validatedData.durationMin;
    if (validatedData.priceCents !== undefined) updateData.price_cents = validatedData.priceCents;
    if (validatedData.description !== undefined) updateData.description = validatedData.description || null;
    if (validatedData.locationType !== undefined) updateData.location_type = validatedData.locationType;

    const updatedService = await prisma.services.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedService);
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

    // Vérifier que le service existe et appartient au praticien de l'utilisateur
    const service = await prisma.services.findFirst({
      where: {
        id,
        practitioners: {
          user_id: session.user.id,
        },
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

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

