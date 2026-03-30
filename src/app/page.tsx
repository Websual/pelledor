export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  getBlueprintActive,
  renderArtisanHomeHtml,
  renderGiteHomeHtml,
  renderHotelHomeHtml,
  renderCabinetHomeHtml,
  renderImmobilierHomeHtml,
  renderPraticienHomeHtml,
  renderRestaurantHomeHtml,
  renderSalonHomeHtml,
  renderBoutiqueHomeHtml,
} from "@/core/blueprint/server";
import { BlueprintHome } from "./blueprint-home";

export default async function HomePage() {
  const blueprint = await getBlueprintActive();

  if (blueprint === "artisan") {
    const html = await renderArtisanHomeHtml();
    return <BlueprintHome html={html} />;
  }
  if (blueprint === "gite") {
    const html = await renderGiteHomeHtml();
    return <BlueprintHome html={html} />;
  }
  if (blueprint === "hotel") {
    const html = await renderHotelHomeHtml();
    return <BlueprintHome html={html} />;
  }
  if (blueprint === "restaurant") {
    const html = await renderRestaurantHomeHtml();
    return <BlueprintHome html={html} />;
  }
  if (blueprint === "praticien") {
    const html = await renderPraticienHomeHtml();
    return <BlueprintHome html={html} />;
  }
  if (blueprint === "cabinet") {
    const html = await renderCabinetHomeHtml();
    return <BlueprintHome html={html} />;
  }
  if (blueprint === "avocat") {
    const html = await renderCabinetHomeHtml();
    return <BlueprintHome html={html} />;
  }
  if (blueprint === "immobilier") {
    const html = await renderImmobilierHomeHtml();
    return <BlueprintHome html={html} />;
  }
  if (blueprint === "salon") {
    const html = await renderSalonHomeHtml();
    return <BlueprintHome html={html} />;
  }
  if (blueprint === "boutique") {
    const html = await renderBoutiqueHomeHtml();
    return <BlueprintHome html={html} />;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Pelledor</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Instance prête. Activez un blueprint vitrine dans l’admin ou connectez-vous.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/login"
          className="inline-flex rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Connexion
        </Link>
        <Link
          href="/admin/blueprint"
          className="inline-flex rounded-md border border-amber-600 px-4 py-2 text-sm text-amber-800 hover:bg-amber-50"
        >
          Blueprint site
        </Link>
        <Link
          href="/annuaire"
          className="inline-flex rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
        >
          Annuaire
        </Link>
        <Link
          href="/evenements"
          className="inline-flex rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
        >
          Événements
        </Link>
        <Link
          href="/blog"
          className="inline-flex rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
        >
          Blog
        </Link>
      </div>
    </main>
  );
}
