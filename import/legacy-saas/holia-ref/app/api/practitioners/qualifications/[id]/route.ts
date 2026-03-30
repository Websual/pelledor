import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { z } from "zod";

const qualificationSchema = z.object({
  title: z.string().min(1, "Le titre est requis").optional(),
  institution: z.string().min(1, "L'établissement est requis").optional(),
  discipline: z.string().optional().nullable(),
  obtainedYear: z.number().int().min(1900).max(2100).optional().nullable(),
  duration: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  certificateUrl: z.string().url().optional().nullable().or(z.string().startsWith("/").optional().nullable()),
  skills: z.array(z.string()).optional().default([]),
});

// PATCH: Mettre à jour une qualification
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

    // Vérifier que la qualification appartient au praticien
    const qualification = await prisma.qualifications.findFirst({
      where: {
        id,
        practitioner_id: practitioner.id,
      },
    });

    if (!qualification) {
      return NextResponse.json(
        { error: "Qualification not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = qualificationSchema.parse(body);

    const updateData: any = {};
    if (validatedData.title !== undefined) updateData.title = validatedData.title;
    if (validatedData.institution !== undefined) updateData.institution = validatedData.institution;
    if (validatedData.discipline !== undefined) updateData.discipline = validatedData.discipline || null;
    if (validatedData.obtainedYear !== undefined) updateData.obtained_year = validatedData.obtainedYear || null;
    if (validatedData.duration !== undefined) updateData.duration = validatedData.duration || null;
    if (validatedData.description !== undefined) updateData.description = validatedData.description || null;
    if (validatedData.certificateUrl !== undefined) updateData.certificate_url = validatedData.certificateUrl || null;
    if (validatedData.skills !== undefined) updateData.skills = validatedData.skills || [];
    
    // Toujours mettre à jour updated_at lors d'une modification
    updateData.updated_at = new Date();

    const updatedQualification = await prisma.qualifications.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(updatedQualification);
  } catch (error) {
    console.error("Error updating qualification:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update qualification" },
      { status: 500 }
    );
  }
}

// DELETE: Supprimer une qualification
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

    // Vérifier que la qualification appartient au praticien
    const qualification = await prisma.qualifications.findFirst({
      where: {
        id,
        practitioner_id: practitioner.id,
      },
    });

    if (!qualification) {
      return NextResponse.json(
        { error: "Qualification not found" },
        { status: 404 }
      );
    }

    await prisma.qualifications.delete({
      where: { id },
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

    return NextResponse.json({ message: "Qualification deleted successfully" });
  } catch (error) {
    console.error("Error deleting qualification:", error);
    return NextResponse.json(
      { error: "Failed to delete qualification" },
      { status: 500 }
    );
  }
}

