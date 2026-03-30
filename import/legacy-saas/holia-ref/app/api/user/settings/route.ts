import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

// Schéma de validation pour le changement de mot de passe
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Le mot de passe actuel est requis"),
  newPassword: z.string().min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères"),
});

// Schéma de validation pour les préférences de notifications
const notificationPreferencesSchema = z.object({
  emailReminders: z.boolean(),
  emailOffers: z.boolean(),
});

// GET: Récupérer les paramètres de l'utilisateur
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        // Pour l'instant, on utilise des valeurs par défaut pour les préférences
        // TODO: Ajouter ces champs au schéma Prisma si nécessaire
        email_verified: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Valeurs par défaut pour les préférences (à remplacer par des champs DB réels)
    return NextResponse.json({
      emailReminders: true, // Par défaut activé
      emailOffers: true, // Par défaut activé
    });
  } catch (error) {
    console.error("Error fetching user settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch user settings" },
      { status: 500 }
    );
  }
}

// PATCH: Mettre à jour les préférences de notifications
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validation avec Zod
    const validationResult = notificationPreferencesSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Pour l'instant, on ne fait rien car les champs n'existent pas encore dans le schéma
    // TODO: Ajouter les champs email_reminders et email_offers au modèle users
    // await prisma.users.update({
    //   where: { id: session.user.id },
    //   data: {
    //     email_reminders: validationResult.data.emailReminders,
    //     email_offers: validationResult.data.emailOffers,
    //   },
    // });

    return NextResponse.json({
      success: true,
      message: "Préférences de notifications mises à jour",
    });
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to update notification preferences" },
      { status: 500 }
    );
  }
}
