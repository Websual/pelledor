import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
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
      select: { id: true, provider: true, provider_account_id: true },
    });

    if (!account) {
      return NextResponse.json({ error: "No Google account linked" }, { status: 404 });
    }

    await prisma.accounts.delete({
      where: {
        provider_provider_account_id: {
          provider: account.provider,
          provider_account_id: account.provider_account_id,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[unlink-google] Error:", error);
    return NextResponse.json(
      { error: "Failed to unlink Google account" },
      { status: 500 }
    );
  }
}
