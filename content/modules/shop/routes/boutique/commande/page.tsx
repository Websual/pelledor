import Link from "next/link";
import { CheckoutForm } from "./checkout-form";

export default function CommandePage() {
  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Commande</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Renseignez vos coordonnées. Les frais de port sont calculés selon le pays.
      </p>
      <CheckoutForm />
      <Link href="/boutique/panier" className="mt-6 inline-block text-sm text-blue-600 underline">
        ← Retour au panier
      </Link>
    </main>
  );
}
