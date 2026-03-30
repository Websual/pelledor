import Link from "next/link";
import {
  getArtisanPayloadJson,
  getBlueprintActive,
  getGitePayloadJson,
  getPraticienPayloadJson,
  getCabinetPayloadJson,
  getImmobilierPayloadJson,
  getSalonPayloadJson,
  getHotelPayloadJson,
} from "@/core/blueprint/server";
import { mergeArtisanPayload, mergeGitePayload } from "@/core/blueprint/render";
import { artisanPlaceholderDefaults } from "@/core/blueprint/defaults-artisan";
import { gitePlaceholderDefaults } from "@/core/blueprint/defaults-gite";
import {
  saveBlueprintSettings,
  resetArtisanDefaults,
} from "./actions";
import { ApplyBusinessForm } from "./apply-business-form";
import { ApplyGiteForm } from "./apply-gite-form";
import { ApplyHotelForm } from "./apply-hotel-form";
import { ApplyBoutiqueForm } from "./apply-boutique-form";
import { ApplyRestaurantForm } from "./apply-restaurant-form";
import { ApplyPraticienForm } from "./apply-praticien-form";
import { ApplyCabinetForm } from "./apply-cabinet-form";
import { ApplyImmobilierForm } from "./apply-immobilier-form";
import { ApplySalonForm } from "./apply-salon-form";
import { RebuildButton } from "./RebuildButton";
import { getRestaurantPayloadJson } from "@/core/blueprint/server";
import { restaurantPlaceholderDefaults } from "@/core/blueprint/defaults-restaurant";
import { praticienPlaceholderDefaults } from "@/core/blueprint/defaults-praticien";
import { cabinetPlaceholderDefaults } from "@/core/blueprint/defaults-cabinet";
import { immobilierPlaceholderDefaults } from "@/core/blueprint/defaults-immobilier";
import { salonPlaceholderDefaults } from "@/core/blueprint/defaults-salon";
import { hotelPlaceholderDefaults } from "@/core/blueprint/defaults-hotel";
import { readFileSync } from "fs";
import { join } from "path";

export default async function AdminBlueprintPage() {
  async function saveBlueprintSettingsAction(formData: FormData) {
    "use server";
    await saveBlueprintSettings(formData);
  }

  async function resetArtisanDefaultsAction() {
    "use server";
    await resetArtisanDefaults();
  }

  let businessTable: { need: string; admin: string; modules: string[] }[] = [];
  try {
    const raw = readFileSync(
      join(process.cwd(), "content/blueprints/artisan/blueprint.json"),
      "utf8"
    );
    const j = JSON.parse(raw) as {
      business?: { needs?: { need: string; admin: string; modules: string[] }[] };
    };
    businessTable = j.business?.needs ?? [];
  } catch {
    /* ignore */
  }
  const active = (await getBlueprintActive()) ?? "none";
  const stored = await getArtisanPayloadJson();
  const merged = mergeArtisanPayload(stored);
  const storedGite = await getGitePayloadJson();
  const payloadJson =
    Object.keys(stored).length > 0
      ? JSON.stringify(stored, null, 2)
      : JSON.stringify(
          Object.fromEntries(
            Object.entries(artisanPlaceholderDefaults).slice(0, 12)
          ),
          null,
          2
        );
  const storedRest = await getRestaurantPayloadJson();
  const payloadRestJson =
    Object.keys(storedRest).length > 0
      ? JSON.stringify(storedRest, null, 2)
      : JSON.stringify(restaurantPlaceholderDefaults, null, 2);
  const payloadGiteJson =
    Object.keys(storedGite).length > 0
      ? JSON.stringify(storedGite, null, 2)
      : JSON.stringify(
          Object.fromEntries(Object.entries(gitePlaceholderDefaults).slice(0, 15)),
          null,
          2
        );
  const storedPraticien = await getPraticienPayloadJson();
  const payloadPraticienJson =
    Object.keys(storedPraticien).length > 0
      ? JSON.stringify(storedPraticien, null, 2)
      : JSON.stringify(
          Object.fromEntries(Object.entries(praticienPlaceholderDefaults).slice(0, 20)),
          null,
          2
        );
  const storedCabinet = await getCabinetPayloadJson();
  const payloadCabinetJson =
    Object.keys(storedCabinet).length > 0
      ? JSON.stringify(storedCabinet, null, 2)
      : JSON.stringify(
          Object.fromEntries(Object.entries(cabinetPlaceholderDefaults).slice(0, 18)),
          null,
          2
        );
  const storedImmobilier = await getImmobilierPayloadJson();
  const payloadImmobilierJson =
    Object.keys(storedImmobilier).length > 0
      ? JSON.stringify(storedImmobilier, null, 2)
      : JSON.stringify(
          Object.fromEntries(
            Object.entries(immobilierPlaceholderDefaults).slice(0, 16)
          ),
          null,
          2
        );
  const storedSalon = await getSalonPayloadJson();
  const payloadSalonJson =
    Object.keys(storedSalon).length > 0
      ? JSON.stringify(storedSalon, null, 2)
      : JSON.stringify(
          Object.fromEntries(Object.entries(salonPlaceholderDefaults).slice(0, 14)),
          null,
          2
        );
  const storedHotel = await getHotelPayloadJson();
  const payloadHotelJson =
    Object.keys(storedHotel).length > 0
      ? JSON.stringify(storedHotel, null, 2)
      : JSON.stringify(
          Object.fromEntries(Object.entries(hotelPlaceholderDefaults).slice(0, 14)),
          null,
          2
        );

  return (
    <div className="max-w-3xl">
      {active === "none" && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-5 py-4">
          <p className="font-semibold text-blue-900">🎉 Bienvenue ! Votre instance est prête.</p>
          <p className="mt-1 text-sm text-blue-800">
            Pour activer votre site métier, cliquez sur <strong>Appliquer</strong> ci-dessous
            pour le blueprint de votre choix. Cela activera les modules adaptés et cr&eacute;era des
            donn&eacute;es de d&eacute;mo pour votre secteur.
          </p>
          <p className="mt-2 text-xs text-blue-600">
            Apr&egrave;s l&apos;application : <code className="rounded bg-blue-100 px-1">pnpm saas:build &amp;&amp; pnpm build</code> puis red&eacute;marrez le serveur.
          </p>
        </div>
      )}
      <h1 className="text-xl font-semibold">Blueprints (vitrine + métier)</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Les maquettes HTML vivent dans{" "}
        <code className="rounded bg-neutral-100 px-1">content/blueprints/templates/&lt;id&gt;/index.html</code>.
        Chaque fichier utilise des placeholders{" "}
        <code className="rounded bg-neutral-100 px-1">{"{{CLE}}"}</code> remplis
        depuis la base (ou défauts artisan).
      </p>
      <p className="mt-2 text-sm text-neutral-600">
        <Link href="/" className="text-blue-600 underline" target="_blank">
          Voir la page d’accueil
        </Link>{" "}
        — gîte, <strong>hôtel</strong> (lodging), immobilier, salon…
      </p>

      {active && active !== "none" && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-5 py-4">
          <p className="font-semibold text-green-900">
            Blueprint sélectionné à l&apos;installation :{" "}
            <span className="capitalize">{active}</span>
          </p>
          <p className="mt-1 text-sm text-green-800">
            Cliquez sur <strong>Appliquer</strong> dans le bloc{" "}
            <span className="capitalize font-semibold">{active}</span> ci-dessous
            pour activer les modules et créer les données de démo.
          </p>
        </div>
      )}

      {active === "artisan" || active === "none" ? <ApplyBusinessForm /> : null}
      {active === "restaurant" ? <ApplyRestaurantForm /> : null}
      {active === "gite" ? <ApplyGiteForm /> : null}
      {active === "hotel" ? <ApplyHotelForm /> : null}
      {active === "boutique" ? <ApplyBoutiqueForm /> : null}
      {active === "praticien" ? <ApplyPraticienForm /> : null}
      {active === "cabinet" ? <ApplyCabinetForm /> : null}
      {active === "immobilier" ? <ApplyImmobilierForm /> : null}
      {active === "salon" ? <ApplySalonForm /> : null}

      {/* Rebuild always visible immediately after Apply forms */}
      <RebuildButton />

      <details className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-neutral-700">
          Tous les blueprints disponibles
        </summary>
        <div className="px-4 pb-4">
      <ApplyBusinessForm />
      <div className="mt-6">
        <ApplyGiteForm />
      </div>
      <div className="mt-6">
        <ApplyHotelForm />
      </div>
      <div className="mt-6">
        <ApplyBoutiqueForm />
      </div>
      <div className="mt-6">
        <ApplyRestaurantForm />
      </div>
      <div className="mt-6">
        <ApplyPraticienForm />
      </div>
      <div className="mt-6">
        <ApplyCabinetForm />
      </div>
      <div className="mt-6">
        <ApplyImmobilierForm />
      </div>
      <div className="mt-6">
        <ApplySalonForm />
      </div>
        </div>
      </details>

      {businessTable.length > 0 && (
        <section className="mt-10">
          <h2 className="font-medium">Ce dont un artisan a besoin côté admin</h2>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-4">Besoin métier</th>
                <th className="py-2 pr-4">Dans l’admin</th>
                <th className="py-2">Modules</th>
              </tr>
            </thead>
            <tbody>
              {businessTable.map((row) => (
                <tr key={row.need} className="border-b border-neutral-100">
                  <td className="py-2 pr-4 font-medium">{row.need}</td>
                  <td className="py-2 pr-4 text-neutral-600">{row.admin}</td>
                  <td className="py-2 text-neutral-500">
                    {row.modules.length ? row.modules.join(", ") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <h2 className="mt-12 text-lg font-semibold">Site vitrine (HTML)</h2>
      <form action={saveBlueprintSettingsAction} className="mt-8 space-y-6">
        <div>
          <label className="block text-sm font-medium">Blueprint actif</label>
          <select
            name="active"
            defaultValue={
              active === "boutique"
                ? "boutique"
                : active === "hotel"
                  ? "hotel"
                  : active === "salon"
                  ? "salon"
                  : active === "immobilier"
                  ? "immobilier"
                  : active === "cabinet"
                    ? "cabinet"
                    : active === "praticien"
                      ? "praticien"
                      : active === "restaurant"
                        ? "restaurant"
                        : active === "gite"
                          ? "gite"
                          : active === "artisan"
                            ? "artisan"
                            : "none"
            }
            className="mt-1 block w-full max-w-md rounded-md border px-3 py-2 text-sm"
          >
            <option value="none">Aucun (hub Pelledor sur /)</option>
            <option value="artisan">Artisan</option>
            <option value="gite">Gîte / chambres d’hôtes</option>
            <option value="hotel">Hôtel (chambres / nuits)</option>
            <option value="boutique">Boutique (e‑commerce)</option>
            <option value="restaurant">Restaurant</option>
            <option value="praticien">Praticien (bien-être, séances)</option>
            <option value="cabinet">Cabinet (conseil, juridique)</option>
            <option value="immobilier">Immobilier (agence)</option>
            <option value="salon">Salon (coiffure, barbier)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">
            Surcharges JSON (clés = placeholders)
          </label>
          <p className="text-xs text-neutral-500">
            Ex. <code>NOM_ENTREPRISE</code>, <code>VILLE</code>,{" "}
            <code>COLOR_ACCENT</code>, <code>TITRE_HERO</code>… Liste complète dans{" "}
            <code>src/core/blueprint/defaults-artisan.ts</code>
          </p>
          <textarea
            name="payloadJson"
            rows={12}
            defaultValue={payloadJson}
            className="mt-1 w-full rounded-md border font-mono text-xs"
          />
          <p className="mt-4 text-sm font-medium">Si blueprint = gîte — JSON template gîte</p>
          <textarea
            name="payloadJsonGite"
            rows={12}
            defaultValue={payloadGiteJson}
            className="mt-1 w-full rounded-md border font-mono text-xs"
          />
          <p className="mt-4 text-sm font-medium">Si blueprint = hôtel</p>
          <p className="text-xs text-neutral-500">
            <code>LINK_RESA</code> → page résa lodging ; ex.{" "}
            <code>/hebergement/chambre/chambre-classique?e=mon-hotel</code> —{" "}
            <code>defaults-hotel.ts</code>
          </p>
          <textarea
            name="payloadJsonHotel"
            rows={10}
            defaultValue={payloadHotelJson}
            className="mt-1 w-full rounded-md border font-mono text-xs"
          />
          <p className="mt-4 text-sm font-medium">Si blueprint = restaurant</p>
          <textarea
            name="payloadJsonRestaurant"
            rows={8}
            defaultValue={payloadRestJson}
            className="mt-1 w-full rounded-md border font-mono text-xs"
          />
          <p className="mt-4 text-sm font-medium">Si blueprint = praticien</p>
          <p className="text-xs text-neutral-500">
            Clés : <code>NOM_PRATICIEN</code>, <code>SPECIALITE</code>,{" "}
            <code>CTA_PRIMARY_URL</code>… —{" "}
            <code>defaults-praticien.ts</code>
          </p>
          <textarea
            name="payloadJsonPraticien"
            rows={10}
            defaultValue={payloadPraticienJson}
            className="mt-1 w-full rounded-md border font-mono text-xs"
          />
          <p className="mt-4 text-sm font-medium">Si blueprint = cabinet</p>
          <p className="text-xs text-neutral-500">
            <code>NOM_CABINET</code>, <code>TITRE_HERO</code>,{" "}
            <code>SERVICE_1_NOM</code>… — <code>defaults-cabinet.ts</code>
          </p>
          <textarea
            name="payloadJsonCabinet"
            rows={10}
            defaultValue={payloadCabinetJson}
            className="mt-1 w-full rounded-md border font-mono text-xs"
          />
          <p className="mt-4 text-sm font-medium">Si blueprint = immobilier</p>
          <p className="text-xs text-neutral-500">
            <code>NOM_AGENCE</code>, <code>BIEN_1_PRIX</code>… —{" "}
            <code>defaults-immobilier.ts</code>
          </p>
          <textarea
            name="payloadJsonImmobilier"
            rows={10}
            defaultValue={payloadImmobilierJson}
            className="mt-1 w-full rounded-md border font-mono text-xs"
          />
          <p className="mt-4 text-sm font-medium">Si blueprint = salon</p>
          <p className="text-xs text-neutral-500">
            <code>NOM_SALON</code>, <code>LIEN_RDV</code> (ex. /login)… —{" "}
            <code>defaults-salon.ts</code>
          </p>
          <textarea
            name="payloadJsonSalon"
            rows={10}
            defaultValue={payloadSalonJson}
            className="mt-1 w-full rounded-md border font-mono text-xs"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white"
          >
            Enregistrer
          </button>
        </div>
      </form>

      <form action={resetArtisanDefaultsAction} className="mt-4">
        <button
          type="submit"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-900"
        >
          Réinitialiser payload artisan (défauts complets en base)
        </button>
      </form>

      <details className="mt-8 rounded-lg border bg-neutral-50 p-4 text-sm">
        <summary className="cursor-pointer font-medium">
          Aperçu fusionné (lecture seule)
        </summary>
        <pre className="mt-2 max-h-64 overflow-auto text-xs">
          {JSON.stringify(merged, null, 2).slice(0, 4000)}
          {JSON.stringify(merged).length > 4000 ? "\n…" : ""}
        </pre>
      </details>

      <section className="mt-10 border-t pt-8">
        <h2 className="font-medium">Autres métiers (templates prêts)</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Branchés : … gîte + <strong>hôtel</strong> (lodging) … immobilier, salon.
        </p>
      </section>
    </div>
  );
}
