import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(100).optional(),
  text: z.string().min(1, "Le texte est requis").max(1000).optional(),
  type: z.enum(["promotion", "nouveaute"]).optional(),
  promo_text: z.string().max(80).optional().nullable(),
  is_active: z.boolean().optional(),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
  service_id: z.string().optional().nullable(),
  discount_percentage: z.number().int().min(0).max(100).optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const existing = await prisma.practitioner_updates.findFirst({
      where: { id, practitioner_id: practitioner.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Update not found" }, { status: 404 });
    }

    const body = await request.json();
    const validated = updateSchema.parse(body);

    const parseDate = (s: string | null | undefined): Date | null => {
      if (!s || !s.trim()) return null;
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };

    const updateData: Record<string, unknown> = {};
    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.text !== undefined) updateData.text = validated.text;
    if (validated.type !== undefined) updateData.type = validated.type;
    if ("promo_text" in validated) updateData.promo_text = validated.promo_text ?? null;
    if (validated.is_active !== undefined) updateData.is_active = validated.is_active;
    if ("starts_at" in validated) updateData.starts_at = parseDate(validated.starts_at) ?? existing.starts_at;
    if ("ends_at" in validated) updateData.ends_at = parseDate(validated.ends_at);

    const update = await prisma.practitioner_updates.update({
      where: { id },
      data: updateData,
    });

    // Mettre à jour le marketing_post lié si promotion
    const mp = await prisma.marketing_posts.findFirst({
      where: { practitioner_update_id: id },
    });
    const isPromotion = validated.type === "promotion" || existing.type === "promotion";
    if (mp && isPromotion) {
      const startDate = (updateData.starts_at as Date | undefined) ?? mp.start_date;
      let endDate: Date = mp.end_date;
      if (updateData.ends_at !== undefined) {
        endDate = (updateData.ends_at as Date | null) ?? new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
      }
      await prisma.marketing_posts.update({
        where: { id: mp.id },
        data: {
          ...("service_id" in validated && { service_id: validated.service_id ?? null }),
          ...("discount_percentage" in validated && { discount_percentage: validated.discount_percentage ?? null }),
          start_date: startDate,
          end_date: endDate,
        },
      });
    } else if (!mp && isPromotion && (validated.service_id || validated.discount_percentage != null)) {
      const startsAt = (updateData.starts_at as Date) ?? existing.starts_at;
      const endsAt = (updateData.ends_at as Date | null) ?? new Date(startsAt.getTime() + 365 * 24 * 60 * 60 * 1000);
      await prisma.marketing_posts.create({
        data: {
          practitioner_id: practitioner.id,
          practitioner_update_id: id,
          service_id: validated.service_id ?? null,
          discount_percentage: validated.discount_percentage ?? null,
          start_date: startsAt,
          end_date: endsAt,
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
    console.error("Error updating practitioner update:", error);
    return NextResponse.json(
      { error: "Failed to update" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const existing = await prisma.practitioner_updates.findFirst({
      where: { id, practitioner_id: practitioner.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Update not found" }, { status: 404 });
    }

    await prisma.practitioner_updates.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting practitioner update:", error);
    return NextResponse.json(
      { error: "Failed to delete" },
      { status: 500 }
    );
  }
}
