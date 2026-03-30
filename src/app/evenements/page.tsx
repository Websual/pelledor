import Link from "next/link";


export default async function EvenementsPage() {
  const base = process.env.AUTH_URL || "http://localhost:3000";
  const r = await fetch(`${base}/api/modules/events/events`, { cache: "no-store" });
  const { events = [] } = r.ok ? await r.json() : {};

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Evenements</h1>
      <ul className="mt-6 space-y-4">
        {events.map(
          (ev: {
            id: string;
            slug: string;
            title: string;
            date: string;
            priceCents: number;
            remainingPlaces: number;
          }) => (
            <li key={ev.id} className="rounded-lg border p-4">
              <Link href={`/evenements/${ev.slug}`} className="font-medium hover:underline">
                {ev.title}
              </Link>
              <div className="text-sm text-neutral-600">
                {new Date(ev.date).toLocaleString()} — {(ev.priceCents / 100).toFixed(2)} EUR —{" "}
                {ev.remainingPlaces} places
              </div>
            </li>
          )
        )}
      </ul>
      {events.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500">Aucun evenement actif.</p>
      )}
    </main>
  );
}
