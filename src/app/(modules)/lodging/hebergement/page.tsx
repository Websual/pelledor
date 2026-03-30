import Link from "next/link";

export default function HebergementHubPage() {
  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-xl font-semibold">Hébergement</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Choisissez une chambre depuis la vitrine blueprint gîte (lien « Chambres »)
        ou passez par{" "}
        <code className="rounded bg-neutral-100 px-1">
          /hebergement/chambre/[slug]?e=SLUG_ETABLISSEMENT
        </code>
        .
      </p>
      <Link href="/" className="mt-6 inline-block text-sm text-blue-600 underline">
        Accueil
      </Link>
    </main>
  );
}
