import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await prisma.accounts.findFirst({
      where: {
        user_id: session.user.id,
        provider: "google-calendar",
      },
      select: {
        id: true,
        provider_account_id: true,
        access_token: true,
        refresh_token: true,
        expires_at: true,
      },
    });

    if (!account) {
      return NextResponse.json({ connected: false });
    }

    // Le provider_account_id peut être l'email ou l'ID Google
    let email: string | undefined = undefined;

    // Si c'est un email, on l'utilise directement
    if (account.provider_account_id?.includes("@")) {
      email = account.provider_account_id;
    } else {
      // Sinon, on essaie de récupérer l'email via l'API Google OAuth2
      try {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const baseUrl =
          process.env.NEXTAUTH_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          "http://localhost:3005";
        const redirectUri = `${baseUrl}/api/auth/calendar/callback`;

        if (clientId && clientSecret && account.access_token) {
          const oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            redirectUri
          );

          oauth2Client.setCredentials({
            access_token: account.access_token,
            refresh_token: account.refresh_token || undefined,
            expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
          });

          const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
          const userInfo = await oauth2.userinfo.get();
          email = userInfo.data.email || undefined;
        }
      } catch (e) {
        console.error("[google-account] Error fetching email from Google API:", e);
        // Fallback sur l'email de la session
        email = session.user.email ?? undefined;
      }
    }

    return NextResponse.json({
      connected: true,
      email: email,
    });
  } catch (error) {
    console.error("[google-account] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Google account status" },
      { status: 500 }
    );
  }
}
