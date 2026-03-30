import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token manquant" },
        { status: 400 }
      );
    }

    // Trouver le token
    const passwordChangeToken = await prisma.password_change_tokens.findUnique({
      where: { token },
      include: { users: true },
    });

    if (!passwordChangeToken) {
      return NextResponse.json(
        { error: "Token invalide" },
        { status: 400 }
      );
    }

    // Vérifier si le token a expiré
    if (new Date() > passwordChangeToken.expires_at) {
      // Supprimer le token expiré
      await prisma.password_change_tokens.delete({
        where: { id: passwordChangeToken.id },
      });
      return NextResponse.json(
        { error: "Le lien de confirmation a expiré. Veuillez refaire une demande de changement de mot de passe." },
        { status: 400 }
      );
    }

    // Mettre à jour le mot de passe de l'utilisateur
    await prisma.users.update({
      where: { id: passwordChangeToken.user_id },
      data: {
        hashed_password: passwordChangeToken.hashed_password,
        updated_at: new Date(),
      },
    });

    // Supprimer le token utilisé
    await prisma.password_change_tokens.delete({
      where: { id: passwordChangeToken.id },
    });

    return NextResponse.json({
      message: "Votre mot de passe a été changé avec succès.",
    });
  } catch (error) {
    console.error("Error confirming password change:", error);
    return NextResponse.json(
      { error: "Erreur lors de la confirmation du changement de mot de passe" },
      { status: 500 }
    );
  }
}

