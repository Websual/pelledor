import Link from "next/link";
import { CartContent } from "./cart-content";

export default function PanierPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Panier</h1>
      <CartContent />
      <div className="mt-8 flex gap-4">
        <Link href="/boutique" className="text-sm text-blue-600 underline">
          Continuer mes achats
        </Link>
        <Link href="/boutique/commande" className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white">
          Passer la commande
        </Link>
      </div>
    </main>
  );
}
