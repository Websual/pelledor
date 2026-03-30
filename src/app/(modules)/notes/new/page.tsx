import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { noteAccess } from "@/core/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NewNoteForm } from "./form";

export default async function NewNotePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const db = getDb();
  const access = await db.query.noteAccess.findFirst({
    where: eq(noteAccess.userId, session.user.id),
  });
  if (!access) redirect("/notes/billing");

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <Link href="/notes" className="text-sm text-neutral-600 underline">
        Retour
      </Link>
      <h1 className="mt-4 text-xl font-semibold">Nouvelle note</h1>
      <NewNoteForm />
    </main>
  );
}
