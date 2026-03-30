import Link from "next/link";

export default function MerciPage() {
  return (
    <main className="mx-auto max-w-lg px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">Merci pour votre commande</h1>
      <p className="mt-4 text-sm text-neutral-600">
        Votre paiement a bien été enregistré. Vous recevrez un email de confirmation.
      </p>
      <Link
        href="/boutique"
        className="mt-8 inline-block rounded-md bg-neutral-900 px-6 py-2 text-sm text-white"
      >
        Retour à la boutique
      </Link>
    </main>
  );
}
