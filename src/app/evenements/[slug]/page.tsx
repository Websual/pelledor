import Link from "next/link";
import { notFound } from "next/navigation";
import { EventBuy } from "./event-buy";

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const base = process.env.AUTH_URL || "http://localhost:3000";
  const r = await fetch(`${base}/api/modules/events/events`, { cache: "no-store" });
  const { events = [] } = r.ok ? await r.json() : {};
  const ev = events.find((e: { slug: string }) => e.slug === slug);
  if (!ev) notFound();

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <Link href="/evenements" className="text-sm underline">
        Evenements
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">{ev.title}</h1>
      <p className="text-sm text-neutral-600">
        {new Date(ev.date).toLocaleString()} — {(ev.priceCents / 100).toFixed(2)} EUR / place
      </p>
      <p className="mt-4 whitespace-pre-wrap text-sm">{ev.description}</p>
      <p className="mt-2 text-sm font-medium">{ev.remainingPlaces} places restantes</p>
      <EventBuy eventId={ev.id} slug={ev.slug} disabled={ev.remainingPlaces < 1} />
    </main>
  );
}
