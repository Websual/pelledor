import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { notifications } from "@/core/db/schema.modules";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MarkRead } from "./mark-read";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const db = getDb();
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, session.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <Link href="/admin" className="text-sm underline">
        Admin
      </Link>
      <h1 className="mt-4 text-xl font-semibold">Notifications</h1>
      <ul className="mt-6 space-y-3">
        {rows.map((n) => (
          <li
            key={n.id}
            className={`rounded border p-3 text-sm ${n.read ? "opacity-60" : ""}`}
          >
            <div className="font-medium">{n.title}</div>
            <p className="text-neutral-600">{n.message}</p>
            <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
              {new Date(n.createdAt).toLocaleString()}
              {!n.read && <MarkRead id={n.id} />}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
