import Link from "next/link";

export default async function AnnuairePage() {
  const base = process.env.AUTH_URL || "http://localhost:3000";
  const r = await fetch(`${base}/api/modules/directory/practitioners`, {
    cache: "no-store",
  }).catch(() => null);
  const j = r?.ok ? await r.json() : { practitioners: [] };
  const list = j.practitioners || [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Annuaire</h1>
      <ul className="mt-6 space-y-3">
        {list.map((p: { id: string; slug: string; title: string; city: string }) => (
          <li key={p.id}>
            <Link
              href={`/annuaire/${p.slug}`}
              className="block rounded-lg border p-4 hover:bg-neutral-50"
            >
              <span className="font-medium">{p.title}</span>
              <span className="ml-2 text-sm text-neutral-500">{p.city}</span>
            </Link>
          </li>
        ))}
      </ul>
      {list.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500">
          Aucun praticien. Admin → Donnees demo pour en creer.
        </p>
      )}
    </main>
  );
}
