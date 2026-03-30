import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { storeLinkingUserId } from "@/lib/account-linking";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Générer un token temporaire
    const token = `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    storeLinkingUserId(token, session.user.id);

    // Construire l'URL absolue pour la redirection
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";
    const callbackUrl = `${baseUrl}/pro/settings?tab=calendar&linkToken=${token}`;
    const signInUrl = `${baseUrl}/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}`;

    return NextResponse.redirect(signInUrl);
  } catch (error) {
    console.error("[link-google] Error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Google linking" },
      { status: 500 }
    );
  }
}
