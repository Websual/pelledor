import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// GET: Récupérer un praticien individuel avec tous les détails
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const practitioner = await prisma.practitioners.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            created_at: true,
          },
        },
        professions: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        services: {
          select: {
            id: true,
            name: true,
            duration_min: true,
            price_cents: true,
            description: true,
          },
        },
        qualifications: {
          select: {
            id: true,
            title: true,
            institution: true,
            discipline: true,
            obtained_year: true,
            certificate_url: true,
            is_verified: true,
          },
        },
        _count: {
          select: {
            appointments: true,
            reviews: true,
          },
        },
      },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    // Transformer les données en camelCase
    const transformed = {
      id: practitioner.id,
      title: practitioner.title,
      bio: practitioner.bio || "",
      address: practitioner.address,
      locationCity: practitioner.location_city,
      lat: practitioner.lat,
      lng: practitioner.lng,
      photoUrl: practitioner.photo_url,
      coverPhotoUrl: practitioner.cover_photo_url,
      isVerified: practitioner.is_verified,
      isActive: practitioner.is_active,
      ratingAvg: practitioner.rating_avg || 0,
      createdAt: practitioner.created_at.toISOString(),
      updatedAt: practitioner.updated_at.toISOString(),
      siret: practitioner.siret,
      verificationDocumentUrl: practitioner.verification_document_url,
      diplomaDocumentUrl: practitioner.diploma_document_url,
      diplomaVerified: practitioner.diploma_verified,
      kbisDocumentUrl: practitioner.kbis_document_url,
      kbisVerified: practitioner.kbis_verified,
      rcpDocumentUrl: practitioner.rcp_document_url,
      rcpVerified: practitioner.rcp_verified,
      firstName: practitioner.first_name,
      lastName: practitioner.last_name,
      phone: practitioner.phone,
      website: practitioner.website,
      instagramUrl: practitioner.instagram_url,
      linkedInUrl: practitioner.linked_in_url,
      hasRCPInsurance: practitioner.has_rcp_insurance,
      acceptNewPatients: practitioner.accept_new_patients,
      user: practitioner.users ? {
        id: practitioner.users.id,
        name: practitioner.users.name,
        email: practitioner.users.email,
        phone: practitioner.users.phone,
        createdAt: practitioner.users.created_at.toISOString(),
      } : null,
      profession: practitioner.professions ? {
        id: practitioner.professions.id,
        name: practitioner.professions.name,
        slug: practitioner.professions.slug,
      } : null,
      services: practitioner.services.map((s) => ({
        id: s.id,
        name: s.name,
        durationMin: s.duration_min,
        priceCents: s.price_cents,
        description: s.description,
      })),
      qualifications: practitioner.qualifications.map((q) => ({
        id: q.id,
        title: q.title,
        institution: q.institution,
        discipline: q.discipline,
        obtainedYear: q.obtained_year,
        certificateUrl: q.certificate_url,
        isVerified: q.is_verified,
      })),
      _count: {
        appointments: practitioner._count.appointments,
        reviews: practitioner._count.reviews,
      },
    };

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error fetching practitioner:", error);
    return NextResponse.json(
      { error: "Failed to fetch practitioner" },
      { status: 500 }
    );
  }
}

// PATCH: Mettre à jour les champs d'un praticien (édition admin)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Schéma de validation pour les champs modifiables par admin
    const updateSchema = z.object({
      title: z.string().min(1).max(200).optional(),
      bio: z.string().min(10).max(2000).optional(),
      address: z.string().max(200).nullable().optional(),
      locationCity: z.string().min(1).max(100).optional(),
      siret: z.string().max(20).nullable().optional(),
      firstName: z.string().max(100).nullable().optional(),
      lastName: z.string().max(100).nullable().optional(),
      phone: z.string().max(20).nullable().optional(),
    });

    const validatedData = updateSchema.parse(body);

    // Vérifier que le praticien existe
    const practitioner = await prisma.practitioners.findUnique({
      where: { id },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    // Préparer les données de mise à jour
    const updateData: any = {
      updated_at: new Date(),
    };

    if (validatedData.title !== undefined) updateData.title = validatedData.title;
    if (validatedData.bio !== undefined) updateData.bio = validatedData.bio;
    if (validatedData.address !== undefined) updateData.address = validatedData.address;
    if (validatedData.locationCity !== undefined) updateData.location_city = validatedData.locationCity;
    if (validatedData.siret !== undefined) updateData.siret = validatedData.siret;
    if (validatedData.firstName !== undefined) updateData.first_name = validatedData.firstName;
    if (validatedData.lastName !== undefined) updateData.last_name = validatedData.lastName;
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;

    const updatedPractitioner = await prisma.practitioners.update({
      where: { id },
      data: updateData,
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            created_at: true,
          },
        },
        professions: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Transformer en camelCase
    const transformed = {
      id: updatedPractitioner.id,
      title: updatedPractitioner.title,
      bio: updatedPractitioner.bio || "",
      address: updatedPractitioner.address,
      locationCity: updatedPractitioner.location_city,
      siret: updatedPractitioner.siret,
      firstName: updatedPractitioner.first_name,
      lastName: updatedPractitioner.last_name,
      phone: updatedPractitioner.phone,
      isVerified: updatedPractitioner.is_verified,
      isActive: updatedPractitioner.is_active,
      user: updatedPractitioner.users ? {
        id: updatedPractitioner.users.id,
        name: updatedPractitioner.users.name,
        email: updatedPractitioner.users.email,
        phone: updatedPractitioner.users.phone,
        createdAt: updatedPractitioner.users.created_at.toISOString(),
      } : null,
      profession: updatedPractitioner.professions ? {
        id: updatedPractitioner.professions.id,
        name: updatedPractitioner.professions.name,
        slug: updatedPractitioner.professions.slug,
      } : null,
    };

    return NextResponse.json(transformed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating practitioner:", error);
    return NextResponse.json(
      { error: "Failed to update practitioner" },
      { status: 500 }
    );
  }
}
