import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createId } from "@paralleldrive/cuid2";
import { createHash } from "crypto";
import { z } from "zod";

const reportSchema = z.object({
  flagReason: z.string().max(500).optional(),
});

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

function getReporterKey(request: NextRequest, userId: string | null): string {
  if (userId) {
    return `user:${userId}`;
  }
  const ip = getClientIp(request);
  const hash = createHash("sha256").update(ip + "holia-report-salt").digest("hex").slice(0, 32);
  return `ip:${hash}`;
}

// GET: Vérifier si l'utilisateur actuel a déjà signalé cet avis
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;
    const { id: reviewId } = await params;

    const review = await prisma.reviews.findUnique({ where: { id: reviewId } });
    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const reporterKey = getReporterKey(request, userId);
    const existing = await prisma.review_reports.findUnique({
      where: {
        review_id_reporter_key: { review_id: reviewId, reporter_key: reporterKey },
      },
    });

    return NextResponse.json({ reported: !!existing });
  } catch (error) {
    console.error("Error checking report status:", error);
    return NextResponse.json({ error: "Failed to check" }, { status: 500 });
  }
}

// POST: Signaler un avis (utilisateur connecté ou anonyme)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;

    const { id: reviewId } = await params;

    let flagReason: string | undefined;
    try {
      const body = await request.json().catch(() => ({}));
      const parsed = reportSchema.safeParse(body);
      if (parsed.success) flagReason = parsed.data.flagReason;
    } catch {
      // Body optionnel
    }

    const review = await prisma.reviews.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const reporterKey = getReporterKey(request, userId);

    // Vérifier si ce reporter a déjà signalé (éviter 100+ signalements du même utilisateur/IP)
    const existingReport = await prisma.review_reports.findUnique({
      where: {
        review_id_reporter_key: {
          review_id: reviewId,
          reporter_key: reporterKey,
        },
      },
    });

    if (existingReport) {
      return NextResponse.json(
        { error: "Vous avez déjà signalé cet avis.", alreadyReported: true },
        { status: 400 }
      );
    }

    // Créer l'entrée de signalement (une seule fois par reporter)
    await prisma.review_reports.create({
      data: {
        id: createId(),
        review_id: reviewId,
        reporter_key: reporterKey,
      },
    });

    // Incrémenter flag_count et mettre à jour is_flagged si > 3
    const newFlagCount = review.flag_count + 1;
    const isFlagged = newFlagCount > 3;

    await prisma.reviews.update({
      where: { id: reviewId },
      data: {
        flag_count: newFlagCount,
        is_flagged: isFlagged,
        flag_reason: flagReason ?? review.flag_reason,
        updated_at: new Date(),
      } as any,
    });

    return NextResponse.json({
      success: true,
      flagCount: newFlagCount,
      isFlagged,
      message: "Avis signalé. Merci pour votre contribution.",
    });
  } catch (error) {
    console.error("Error reporting review:", error);
    return NextResponse.json(
      { error: "Failed to report review" },
      { status: 500 }
    );
  }
}
