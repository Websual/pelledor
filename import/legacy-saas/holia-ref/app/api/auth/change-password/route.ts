import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createId } from "@paralleldrive/cuid2";
import { sendPasswordChangeEmail } from "@/lib/emails";


import { hash } from "bcryptjs";
import { z } from "zod";



const changePasswordSchema = z.object({
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = changePasswordSchema.parse(body);

    // Générer un token de validation unique
    const token = createId();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Token valide 24h

    // Hash le nouveau mot de passe
    const hashedPassword = await hash(validatedData.password, 10);

    // Stocker le token et le nouveau mot de passe hashé dans la base
    await prisma.password_change_tokens.upsert({
      where: { user_id: session.user.id },
      create: {
        id: createId(),
        user_id: session.user.id,
        token,
        hashed_password: hashedPassword,
        expires_at: expiresAt,
      },
      update: {
        token,
        hashed_password: hashedPassword,
        expires_at: expiresAt,
      },
    });

    // Alternative: stocker dans une table users avec un champ temporaire
    // Pour l'instant, on va envoyer l'email avec le token
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3005"}/auth/confirm-password-change?token=${token}`;

    // Envoyer l'email de confirmation
    await sendPasswordChangeEmail({
      userEmail: session.user.email || "",
      userName: session.user.name || "Utilisateur",
      resetUrl,
    });

    return NextResponse.json({
      message: "Un email de confirmation a été envoyé. Cliquez sur le lien pour valider le changement de mot de passe.",
    });
  } catch (error) {
    console.error("Error requesting password change:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Erreur lors de la demande de changement de mot de passe" },
      { status: 500 }
    );
  }
}

