import Link from "next/link";
import { notFound } from "next/navigation";
import { BookForm } from "./book-form";

export default async function PraticienPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const base = process.env.AUTH_URL || "http://localhost:3000";
  const pr = await fetch(`${base}/api/modules/directory/practitioners/${slug}`, {
    cache: "no-store",
  });
  if (!pr.ok) notFound();
  const { practitioner: p } = await pr.json();
  const sv = await fetch(
    `${base}/api/modules/directory/services?practitionerId=${p.id}`,
    { cache: "no-store" }
  );
  const { services = [] } = sv.ok ? await sv.json() : {};

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <Link href="/annuaire" className="text-sm underline">
        Annuaire
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">{p.title}</h1>
      <p className="text-neutral-600">{p.city}</p>
      <p className="mt-4 text-sm whitespace-pre-wrap">{p.bio}</p>
      <h2 className="mt-8 font-medium">Prestations</h2>
      <ul className="mt-2 space-y-2">
        {services.map(
          (s: {
            id: string;
            name: string;
            durationMin: number;
            priceCents: number;
          }) => (
            <li key={s.id} className="flex justify-between rounded border px-3 py-2 text-sm">
              <span>{s.name}</span>
              <span>
                {s.durationMin} min — {(s.priceCents / 100).toFixed(2)} EUR
              </span>
            </li>
          )
        )}
      </ul>
      {services.length > 0 && (
        <div className="mt-8 rounded border p-4">
          <h3 className="font-medium">Prendre RDV</h3>
          <BookForm practitionerId={p.id} services={services} />
        </div>
      )}
    </main>
  );
}
