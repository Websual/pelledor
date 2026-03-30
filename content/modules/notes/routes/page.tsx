import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { noteAccess, notes } from "@/core/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteNote } from "./delete-note";

export default async function NotesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const db = getDb();
  const access = await db.query.noteAccess.findFirst({
    where: eq(noteAccess.userId, session.user.id),
  });
  const list = await db
    .select()
    .from(notes)
    .where(eq(notes.userId, session.user.id))
    .orderBy(desc(notes.createdAt));

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-semibold">Notes</h1>
      {!access && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          Acces creation de notes non active.{" "}
          <Link href="/notes/billing" className="font-medium underline">
            Payer pour debloquer
          </Link>
        </p>
      )}
      {access && (
        <Link
          href="/notes/new"
          className="mt-4 inline-block rounded-md px-4 py-2 text-sm font-medium text-white"
          style={{ background: "var(--color-primary)" }}
        >
          Nouvelle note
        </Link>
      )}
      <ul className="mt-6 space-y-3">
        {list.map((n) => (
          <li
            key={n.id}
            className="flex items-start justify-between rounded-lg border p-4"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div>
              <div className="font-medium">{n.title}</div>
              <p className="mt-1 text-sm text-neutral-600 line-clamp-2">{n.body}</p>
            </div>
            <DeleteNote id={n.id} />
          </li>
        ))}
      </ul>
      {list.length === 0 && access && (
        <p className="mt-4 text-sm text-neutral-500">Aucune note encore.</p>
      )}
    </main>
  );
}
