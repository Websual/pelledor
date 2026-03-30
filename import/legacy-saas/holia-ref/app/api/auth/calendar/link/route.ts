import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";

/**
 * Construit l'URL de redirection OAuth de manière cohérente.
 * Normalise l'URL en supprimant les trailing slashes.
 */
function getRedirectUri(): string {
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3005";
  
  // Normaliser l'URL : supprimer le trailing slash s'il existe
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const redirectUri = `${normalizedBaseUrl}/api/auth/calendar/callback`;
  
  // Log pour déboguer en production
  if (process.env.NODE_ENV === "production") {
    console.log("[calendar/link] Redirect URI:", redirectUri);
  }
  
  return redirectUri;
}

export async function GET(request: NextRequest) {
  try {
    // Vérifier que l'utilisateur est connecté
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Google OAuth not configured" },
        { status: 500 }
      );
    }

    // Construire l'URL de callback de manière cohérente
    const redirectUri = getRedirectUri();

    // Log pour vérification (en production aussi pour déboguer)
    console.log("[calendar/link] Using redirect URI:", redirectUri);
    if (process.env.NODE_ENV === "development") {
      console.log("[calendar/link] Redirect URI:", redirectUri);
    }

    // Créer le client OAuth2
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Scopes pour Google Calendar
    // IMPORTANT : Ajouter 'openid' pour obtenir l'id_token nécessaire à verifyIdToken
    const scopes = [
      "openid",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ];

    // Générer l'URL d'authentification
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline", // Nécessaire pour obtenir le refresh_token
      prompt: "consent", // Force la demande de consentement pour obtenir le refresh_token
      scope: scopes,
      // Inclure l'userId dans l'état pour le récupérer dans le callback
      state: session.user.id,
    });

    // Rediriger vers Google
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("[calendar/link] Error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Google Calendar linking" },
      { status: 500 }
    );
  }
}
