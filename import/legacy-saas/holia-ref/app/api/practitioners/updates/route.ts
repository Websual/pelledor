import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(100),
  text: z.string().min(1, "Le texte est requis").max(1000),
  type: z.enum(["promotion", "nouveaute"]),
  promo_text: z.string().max(80).optional().nullable(),
  is_active: z.boolean().optional(),
  starts_at: z.string().optional().nullable(), // ISO ou datetime-local
  ends_at: z.string().optional().nullable(),   // ISO ou datetime-local
  service_id: z.string().optional().nullable(),
  discount_percentage: z.number().int().min(0).max(100).optional().nullable(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
      select: { id: true },
    });
    if (!practitioner) {
      return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
    }

    const updates = await prisma.practitioner_updates.findMany({
      where: { practitioner_id: practitioner.id },
      include: { marketing_posts: { take: 1 } },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({
      updates: updates.map(({ marketing_posts: mps, ...u }) => ({
        ...u,
        marketing_post: mps?.[0] ?? null,
      })),
    });
  } catch (error) {
    console.error("Error fetching practitioner updates:", error);
    return NextResponse.json(
      { error: "Failed to fetch updates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
      select: { id: true },
    });
    if (!practitioner) {
      return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
    }

    const body = await request.json();
    const validated = updateSchema.parse(body);

    const parseDate = (s: string | null | undefined): Date | null => {
      if (!s || !s.trim()) return null;
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };

    const startsAt = parseDate(validated.starts_at) ?? new Date();
    const endsAt = parseDate(validated.ends_at);

    const update = await prisma.practitioner_updates.create({
      data: {
        practitioner_id: practitioner.id,
        title: validated.title,
        text: validated.text,
        type: validated.type,
        promo_text: validated.promo_text ?? null,
        is_active: validated.is_active ?? true,
        starts_at: startsAt,
        ends_at: endsAt,
      },
    });

    // Si promotion avec service et remise, créer le marketing_post (pour Stripe)
    if (
      validated.type === "promotion" &&
      (validated.service_id || validated.discount_percentage != null)
    ) {
      const endDate = endsAt ?? new Date(startsAt.getTime() + 365 * 24 * 60 * 60 * 1000); // +1 an si pas de fin
      await prisma.marketing_posts.create({
        data: {
          practitioner_id: practitioner.id,
          practitioner_update_id: update.id,
          service_id: validated.service_id ?? null,
          discount_percentage: validated.discount_percentage ?? null,
          start_date: startsAt,
          end_date: endDate,
        },
      });
    }

    return NextResponse.json({ update });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || "Validation error" },
        { status: 400 }
      );
    }
    console.error("Error creating practitioner update:", error);
    return NextResponse.json(
      { error: "Failed to create update" },
      { status: 500 }
    );
  }
}
