import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

/**
 * Construit l'URL de redirection OAuth de manière cohérente.
 * Normalise l'URL en supprimant les trailing slashes.
 * IMPORTANT : Cette fonction doit retourner exactement la même URL que dans /link/route.ts
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
    console.log("[calendar/callback] Redirect URI:", redirectUri);
  }
  
  return redirectUri;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // userId depuis la route /link
    const error = searchParams.get("error");

    // Construire l'URL de base pour les redirections (URLs absolues requises)
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3005";
    const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

    // Vérifier les erreurs OAuth
    if (error) {
      console.error("[calendar/callback] OAuth error:", error);
      return NextResponse.redirect(
        `${normalizedBaseUrl}/pro/settings?tab=calendar&status=error&message=${encodeURIComponent(error)}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${normalizedBaseUrl}/pro/settings?tab=calendar&status=error&message=${encodeURIComponent("No authorization code provided")}`
      );
    }

    // Récupérer la session actuelle (sécurité supplémentaire)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.redirect(
        `${normalizedBaseUrl}/pro/settings?tab=calendar&status=error&message=${encodeURIComponent("Not authenticated")}`
      );
    }

    // Utiliser l'userId de la session (plus sûr que le state)
    const userId = session.user.id;

    // Vérifier que le state correspond à l'userId de la session (sécurité)
    if (state && state !== userId) {
      console.warn(
        `[calendar/callback] State mismatch: state=${state}, session.userId=${userId}`
      );
      // On continue quand même avec l'userId de la session
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${normalizedBaseUrl}/pro/settings?tab=calendar&status=error&message=${encodeURIComponent("Google OAuth not configured")}`
      );
    }

    // Construire l'URL de callback de manière cohérente (MÊME LOGIQUE que dans /link)
    // IMPORTANT : Cette URL doit correspondre EXACTEMENT à celle utilisée dans /link
    const redirectUri = getRedirectUri();
    
    // Log supplémentaire pour déboguer l'erreur invalid_grant
    console.log("[calendar/callback] Code received:", code.substring(0, 20) + "...");
    console.log("[calendar/callback] State received:", state);
    console.log("[calendar/callback] Redirect URI for token exchange:", redirectUri);

    if (process.env.NODE_ENV === "development") {
      console.log("[calendar/callback] Using redirect URI:", redirectUri);
    }

    // Créer le client OAuth2
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Échanger le code contre les tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      return NextResponse.redirect(
        `${normalizedBaseUrl}/pro/settings?tab=calendar&status=error&message=${encodeURIComponent("Failed to obtain access token")}`
      );
    }

    // IMPORTANT : Définir les credentials IMMÉDIATEMENT après avoir obtenu les tokens
    // avant tout autre appel à l'API Google
    oauth2Client.setCredentials(tokens);

    // Log des tokens reçus (sans exposer les valeurs sensibles)
    console.log("[calendar/callback] Tokens received:", {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      hasIdToken: !!tokens.id_token,
      expiryDate: tokens.expiry_date,
    });

    // Récupérer l'email via verifyIdToken (plus fiable)
    let email: string | null = null;
    let providerAccountId: string = "";

    if (tokens.id_token) {
      try {
        console.log("[calendar/callback] Attempting to verify ID token...");
        const ticket = await oauth2Client.verifyIdToken({
          idToken: tokens.id_token,
          audience: clientId,
        });
        const payload = ticket.getPayload();
        email = payload?.email || null;
        providerAccountId = payload?.sub || payload?.email || "";
        console.log("[calendar/callback] ID token verified successfully, email:", email);
      } catch (verifyError: any) {
        console.warn("[calendar/callback] Error verifying ID token:", verifyError?.message || verifyError);
        // Fallback sur userinfo API si verifyIdToken échoue
        console.log("[calendar/callback] Falling back to userinfo API...");
        try {
          // S'assurer que les credentials sont bien définis
          oauth2Client.setCredentials(tokens);
          const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
          const userInfo = await oauth2.userinfo.get();
          email = userInfo.data.email || null;
          providerAccountId = userInfo.data.id || userInfo.data.email || "";
          console.log("[calendar/callback] Userinfo API successful, email:", email);
        } catch (userInfoError: any) {
          console.error("[calendar/callback] Error fetching userinfo:", {
            message: userInfoError?.message,
            status: userInfoError?.status,
            code: userInfoError?.code,
          });
          // Si les deux méthodes échouent, on peut quand même sauvegarder avec l'email de la session
          // ou utiliser l'email comme providerAccountId si disponible
          console.warn("[calendar/callback] Both ID token and userinfo failed, using fallback");
          email = session.user.email || null;
          providerAccountId = email || `google-${Date.now()}`;
        }
      }
    } else {
      // Fallback si pas d'id_token : utiliser userinfo API
      console.log("[calendar/callback] No ID token, using userinfo API...");
      try {
        // S'assurer que les credentials sont bien définis
        oauth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        email = userInfo.data.email || null;
        providerAccountId = userInfo.data.id || userInfo.data.email || "";
        console.log("[calendar/callback] Userinfo API successful, email:", email);
      } catch (userInfoError: any) {
        console.error("[calendar/callback] Error fetching userinfo:", {
          message: userInfoError?.message,
          status: userInfoError?.status,
          code: userInfoError?.code,
        });
        // Dernier recours : utiliser l'email de la session
        console.warn("[calendar/callback] Userinfo failed, using session email as fallback");
        email = session.user.email || null;
        providerAccountId = email || `google-${Date.now()}`;
      }
    }

    if (!providerAccountId) {
      return NextResponse.redirect(
        `${normalizedBaseUrl}/pro/settings?tab=calendar&status=error&message=${encodeURIComponent("Failed to identify Google account")}`
      );
    }

    // Calculer expires_at (en secondes Unix timestamp)
    const expiresAt = tokens.expiry_date
      ? Math.floor(tokens.expiry_date / 1000)
      : null;

    // Vérifier si un compte existe déjà pour cet utilisateur
    const existingAccount = await prisma.accounts.findFirst({
      where: {
        user_id: userId,
        provider: "google-calendar",
      },
    });

    // Gestion du refresh_token : ne pas écraser l'ancien s'il n'est pas fourni
    let refreshTokenToSave = tokens.refresh_token;
    if (!refreshTokenToSave && existingAccount?.refresh_token) {
      // Si pas de nouveau refresh_token mais qu'on en a un en DB, garder l'ancien
      refreshTokenToSave = existingAccount.refresh_token;
      console.log("[calendar/callback] No new refresh_token provided, keeping existing one");
    } else if (!refreshTokenToSave && !existingAccount) {
      // Si pas de refresh_token du tout et pas de compte existant, c'est un problème
      console.warn("[calendar/callback] No refresh_token provided and no existing account");
      return NextResponse.redirect(
        `${normalizedBaseUrl}/pro/settings?tab=calendar&status=error&message=${encodeURIComponent("No refresh token received. Please revoke access on Google and try again.")}`
      );
    }

    // Enregistrer ou mettre à jour l'entrée dans la table Account
    await prisma.accounts.upsert({
      where: {
        provider_provider_account_id: {
          provider: "google-calendar",
          provider_account_id: providerAccountId,
        },
      },
      update: {
        access_token: tokens.access_token,
        refresh_token: refreshTokenToSave || undefined,
        expires_at: expiresAt,
        token_type: tokens.token_type || undefined,
        scope: tokens.scope || undefined,
        // Mettre à jour user_id si nécessaire (au cas où le compte serait lié à un autre user)
        user_id: userId,
      },
      create: {
        id: `google-calendar_${providerAccountId}_${userId}`,
        user_id: userId,
        type: "oauth",
        provider: "google-calendar",
        provider_account_id: providerAccountId,
        access_token: tokens.access_token,
        refresh_token: refreshTokenToSave || null,
        expires_at: expiresAt,
        token_type: tokens.token_type || null,
        scope: tokens.scope || null,
      },
    });

    // Rediriger vers la page de paramètres avec un message de succès
    return NextResponse.redirect(
      `${normalizedBaseUrl}/pro/settings?tab=calendar&status=success${email ? `&email=${encodeURIComponent(email)}` : ""}`
    );
  } catch (error: any) {
    console.error("[calendar/callback] Error:", error);
    
    // Construire l'URL de base pour l'erreur aussi
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3005";
    const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
    
    // Log détaillé de l'erreur pour déboguer invalid_grant
    if (error?.response?.data) {
      console.error("[calendar/callback] Error response data:", JSON.stringify(error.response.data, null, 2));
    }
    if (error?.message?.includes("invalid_grant")) {
      console.error("[calendar/callback] invalid_grant error - possible causes:");
      console.error("  - Code already used or expired");
      console.error("  - Redirect URI mismatch");
      console.error("  - Clock skew between server and Google");
    }
    
    return NextResponse.redirect(
      `${normalizedBaseUrl}/pro/settings?tab=calendar&status=error&message=${encodeURIComponent(error?.message || "Failed to link Google Calendar account")}`
    );
  }
}
