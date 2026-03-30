import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";



interface UpdateUserProfileBody {
  name?: string;
  phone?: string | null;
  image?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
}

// GET: Récupérer le profil de l'utilisateur
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.users.findFirst({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        image: true,
        role: true,
        created_at: true,
        date_of_birth: true,
        gender: true,
        practitioners: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Patient vérifié : au moins un RDV honoré (DONE ou terminé et payé)
    const [honoredRow] = await prisma.$queryRaw<
      [{ count: bigint }]
    >`
      SELECT COUNT(*)::bigint FROM appointments a
      LEFT JOIN services s ON a.service_id = s.id
      WHERE a.user_id = ${session.user.id}
        AND (
          a.status = 'DONE'
          OR (
            a.payment_status = 'PAID'
            AND a.status != 'CANCELED'
            AND (a.starts_at + (COALESCE(s.duration_min, 60) * interval '1 minute')) < now()
          )
        )
    `;
    const hasHonoredAppointment = Number(honoredRow?.count ?? 0) > 0;

    // Transformer les données pour correspondre à l'interface frontend (camelCase)
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      image: user.image,
      role: user.role,
      createdAt: user.created_at.toISOString(),
      dateOfBirth: user.date_of_birth ? user.date_of_birth.toISOString() : null,
      gender: user.gender,
      practitioner: user.practitioners,
      hasHonoredAppointment,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}

// PATCH: Mettre à jour le profil de l'utilisateur
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: UpdateUserProfileBody = await request.json();

    // Basic validation
    if (body.name !== undefined && (body.name.length < 1 || body.name.length > 100)) {
      return NextResponse.json(
        { error: "Name must be between 1 and 100 characters" },
        { status: 400 }
      );
    }

    if (body.phone !== undefined && body.phone && body.phone.length > 20) {
      return NextResponse.json(
        { error: "Phone must be less than 20 characters" },
        { status: 400 }
      );
    }

    if (body.image !== undefined && body.image) {
      const img = body.image;
      if (typeof img !== "string") {
        return NextResponse.json({ error: "Image must be a string" }, { status: 400 });
      }
      if (img.startsWith("/")) {
        if (!/^\/uploads\/[a-z0-9/_.-]+$/i.test(img)) {
          return NextResponse.json({ error: "Image path invalide" }, { status: 400 });
        }
      } else {
        try {
          new URL(img);
        } catch {
          return NextResponse.json({ error: "Image must be a valid URL or path" }, { status: 400 });
        }
      }
    }

    // Préparer les données à mettre à jour
    const updateData: any = {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.image !== undefined && { image: body.image }),
    };

    // Ajouter dateOfBirth et gender
    if (body.dateOfBirth !== undefined) {
      updateData.date_of_birth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    }
    if (body.gender !== undefined) {
      updateData.gender = body.gender || null;
    }

    const user = await prisma.users.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        image: true,
        role: true,
        created_at: true,
        date_of_birth: true,
        gender: true,
      },
    });

    // Transformer les données pour correspondre à l'interface frontend (camelCase)
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      image: user.image,
      role: user.role,
      createdAt: user.created_at.toISOString(),
      dateOfBirth: user.date_of_birth ? user.date_of_birth.toISOString() : null,
      gender: user.gender,
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update user profile" },
      { status: 500 }
    );
  }
}

