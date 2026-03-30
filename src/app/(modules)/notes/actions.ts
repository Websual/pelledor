"use server";

import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { noteAccess, notes } from "@/core/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createNote(title: string, body: string) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Connexion requise" };
  const db = getDb();
  const access = await db.query.noteAccess.findFirst({
    where: eq(noteAccess.userId, session.user.id),
  });
  if (!access) return { ok: false, error: "Paiement requis pour creer des notes" };
  await db.insert(notes).values({
    userId: session.user.id,
    title: title.slice(0, 512),
    body,
  });
  revalidatePath("/notes");
  revalidatePath("/admin/notes");
  return { ok: true };
}

export async function deleteNote(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false };
  const db = getDb();
  await db
    .delete(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, session.user.id)));
  revalidatePath("/notes");
  revalidatePath("/admin/notes");
  return { ok: true };
}
