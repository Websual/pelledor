import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartForm } from "./add-to-cart-form";

async function getProduct(slug: string) {
  const base = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const res = await fetch(`${base}/api/modules/shop/products/slug/${slug}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.product ?? null;
}

export default async function ProduitPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/boutique" className="text-sm text-blue-600 underline">
        ← Catalogue
      </Link>
      <div className="mt-8 flex flex-col gap-8 sm:flex-row">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt=""
            className="h-64 w-full rounded-lg object-cover sm:w-72"
          />
        ) : (
          <div className="h-64 w-full rounded-lg bg-neutral-100 sm:w-72" />
        )}
        <div>
          <h1 className="text-xl font-semibold">{product.name}</h1>
          <p className="mt-2 text-lg font-medium">
            {(product.priceCents / 100).toFixed(2)} €
          </p>
          {product.description ? (
            <p className="mt-4 text-sm text-neutral-600">{product.description}</p>
          ) : null}
          <AddToCartForm productId={product.id} />
        </div>
      </div>
    </main>
  );
}
