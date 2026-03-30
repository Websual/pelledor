import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createId } from "@paralleldrive/cuid2";

import { z } from "zod";


const qualificationSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  institution: z.string().min(1, "L'établissement est requis"),
  discipline: z.string().optional().nullable(),
  obtainedYear: z.number().int().min(1900).max(2100).optional().nullable(),
  duration: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  certificateUrl: z.string().url().optional().nullable().or(z.string().startsWith("/").optional().nullable()),
  skills: z.array(z.string()).optional().default([]),
});

// POST: Créer une qualification
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
    const validatedData = qualificationSchema.parse(body);

    const qualification = await prisma.qualifications.create({
      data: {
        id: createId(),
        practitioner_id: practitioner.id,
        title: validatedData.title,
        institution: validatedData.institution,
        discipline: validatedData.discipline || null,
        obtained_year: validatedData.obtainedYear || null,
        duration: validatedData.duration || null,
        description: validatedData.description || null,
        certificate_url: validatedData.certificateUrl || null,
        skills: validatedData.skills || [],
        created_at: new Date(),
        updated_at: new Date(),
      } as any,
    });

    // Si le praticien modifie son profil, le remettre en attente de validation
    if (!practitioner.is_verified) {
      await prisma.practitioners.update({
        where: { id: practitioner.id },
        data: {
          is_verified: false,
          is_active: false,
        },
      });
    }

    return NextResponse.json(qualification);
  } catch (error) {
    console.error("Error creating qualification:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create qualification" },
      { status: 500 }
    );
  }
}

