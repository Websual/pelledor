import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const deleteAccountSchema = z.object({
  confirmEmail: z.string().email("Email invalide"),
  confirmText: z.literal("SUPPRIMER", {
    errorMap: () => ({ message: "Vous devez taper 'SUPPRIMER' pour confirmer" }),
  }),
});

// POST: Supprimer le compte utilisateur
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validation avec Zod
    const validationResult = deleteAccountSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { confirmEmail } = validationResult.data;

    // Vérifier que l'email correspond
    if (confirmEmail !== session.user.email) {
      return NextResponse.json(
        { error: "L'email ne correspond pas à votre compte" },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur pour vérifier qu'il existe
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Supprimer l'utilisateur (cascade supprimera les relations)
    // Note: Prisma supprimera automatiquement les relations grâce à onDelete: Cascade
    await prisma.users.delete({
      where: { id: session.user.id },
    });

    return NextResponse.json({
      success: true,
      message: "Compte supprimé avec succès",
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
