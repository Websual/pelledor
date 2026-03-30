import Link from "next/link";

async function getProducts() {
  const base = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const res = await fetch(`${base}/api/modules/shop/products`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.products ?? [];
}

export default async function BoutiqueCataloguePage() {
  const products = await getProducts();
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Boutique</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Catalogue des produits. Panier et commande avec frais de port.
      </p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.length === 0 ? (
          <p className="col-span-full text-sm text-neutral-500">
            Aucun produit pour l’instant. Ajoutez-en dans l’admin (Boutique).
          </p>
        ) : (
          products.map((p: { id: string; slug: string; name: string; priceCents: number; imageUrl?: string | null }) => (
            <Link
              key={p.id}
              href={`/boutique/produit/${p.slug}`}
              className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-neutral-300"
            >
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt=""
                  className="h-40 w-full rounded object-cover"
                />
              ) : (
                <div className="h-40 w-full rounded bg-neutral-100" />
              )}
              <h2 className="mt-3 font-medium">{p.name}</h2>
              <p className="mt-1 text-sm text-neutral-600">
                {(p.priceCents / 100).toFixed(2)} €
              </p>
            </Link>
          ))
        )}
      </div>
      <div className="mt-8 flex gap-4">
        <Link
          href="/boutique/panier"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
        >
          Voir le panier
        </Link>
        <Link href="/" className="rounded-md border px-4 py-2 text-sm hover:bg-neutral-50">
          Accueil
        </Link>
      </div>
    </main>
  );
}
