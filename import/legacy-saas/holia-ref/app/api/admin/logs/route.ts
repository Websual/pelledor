import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { LogLevel } from "@prisma/client";

const VALID_LEVELS: LogLevel[] = ["INFO", "WARN", "ERROR"];
const MAX_LOGS = 100;

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session: session.user };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level") as LogLevel | null;

    const where = level && VALID_LEVELS.includes(level) ? { level } : {};

    const logs = await prisma.logs.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: MAX_LOGS,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    await prisma.logs.deleteMany({});
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error purging logs:", error);
    return NextResponse.json(
      { error: "Failed to purge logs" },
      { status: 500 }
    );
  }
}
