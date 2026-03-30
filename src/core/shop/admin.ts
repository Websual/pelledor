import type { Session } from "next-auth";
import { NextResponse } from "next/server";

/** Seuls les comptes `role === "admin"` peuvent gérer catalogue / commandes côté API shop. */
export function requireShopAdmin(session: Session | null): NextResponse | null {
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin requis" }, { status: 403 });
  }
  return null;
}
