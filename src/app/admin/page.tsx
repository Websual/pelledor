import { auth } from "@/auth";
import { getBlueprintActive } from "@/core/blueprint/server";
import { getDb } from "@/core/db/server";
import { appSettings } from "@/core/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";

const BLUEPRINT_LABELS: Record<string, string> = {
  artisan: "Artisan (bâtiment, dépannage)",
  restaurant: "Restaurant",
  gite: "Gîte / chambres d'hôtes",
  hotel: "Hôtel",
  praticien: "Praticien bien-être",
  cabinet: "Cabinet (conseil, juridique)",
  immobilier: "Immobilier (agence)",
  salon: "Salon (coiffure, beauté)",
  boutique: "Boutique e-commerce",
  none: "Aucun (hub Pelledor)",
};

const QUICK_LINKS = [
  { href: "/admin/blueprint", label: "🎨 Blueprint métier", desc: "Changer le métier, la vitrine, les tokens" },
  { href: "/admin/modules", label: "🧩 Modules", desc: "Activer / désactiver les fonctionnalités" },
  { href: "/admin/appearance", label: "🖌 Apparence", desc: "Couleurs, polices, espacements" },
  { href: "/admin/rdv", label: "📅 Rendez-vous", desc: "Agenda et réservations en ligne" },
  { href: "/admin/devis", label: "📄 Devis", desc: "Devis et factures artisan" },
  { href: "/admin/restaurant", label: "🍽 Restaurant", desc: "Tables et réservations" },
  { href: "/admin/lodging", label: "🛏 Hébergement", desc: "Chambres et réservations" },
  { href: "/admin/shop", label: "🛒 Boutique", desc: "Catalogue, commandes, livraison" },
  { href: "/admin/factures", label: "💰 Factures", desc: "Historique et paiements" },
];

async function getActiveModules(): Promise<string[]> {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "modules.active"));
    const val = rows[0]?.value;
    if (!val) return [];
    const parsed = JSON.parse(val) as unknown;
    if (Array.isArray(parsed)) return parsed as string[];
    return [];
  } catch {
    return [];
  }
}

export default async function AdminPage() {
  const session = await auth();
  let active = "none";
  let activeModules: string[] = [];
  try {
    active = (await getBlueprintActive()) ?? "none";
    activeModules = await getActiveModules();
  } catch {
    // DB not ready
  }

  const blueprintLabel = BLUEPRINT_LABELS[active] ?? active;
  const needsSetup = active === "none";

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold">Tableau de bord</h1>
      <p className="mt-1 text-sm text-neutral-500">{session?.user?.email}</p>

      {/* Setup banner */}
      {needsSetup && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
          <p className="font-semibold">⚠️ Aucun blueprint métier actif</p>
          <p className="mt-1">
            Choisissez votre métier dans{" "}
            <Link href="/admin/blueprint" className="font-medium underline">
              Admin Blueprint
            </Link>{" "}
            pour configurer votre app en quelques clics.
          </p>
        </div>
      )}

      {/* Blueprint selected but modules not yet applied */}
      {!needsSetup && activeModules.length === 0 && (
        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900">
          <p className="font-semibold">🚀 Blueprint <span className="capitalize">{active}</span> sélectionné — appliquez-le pour activer votre app</p>
          <p className="mt-1 text-blue-800">
            Cliquez sur le bouton <strong>Appliquer</strong> dans l&apos;admin blueprint pour activer les modules
            et créer les données de démo de votre secteur.
          </p>
          <div className="mt-3">
            <Link
              href="/admin/blueprint"
              className="inline-flex items-center gap-1 rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
            >
              Appliquer le blueprint {active} →
            </Link>
          </div>
        </div>
      )}

      {/* Status cards */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Blueprint actif</p>
          <p className="mt-1 text-base font-semibold text-neutral-900">{blueprintLabel}</p>
          <Link href="/admin/blueprint" className="mt-2 block text-xs text-blue-600 hover:underline">
            Modifier →
          </Link>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Modules actifs</p>
          <p className="mt-1 text-base font-semibold text-neutral-900">
            {activeModules.length > 0 ? `${activeModules.length} module(s)` : "—"}
          </p>
          <Link href="/admin/modules" className="mt-2 block text-xs text-blue-600 hover:underline">
            Gérer →
          </Link>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Apparence</p>
          <p className="mt-1 text-base font-semibold text-neutral-900">Tokens live</p>
          <Link href="/admin/appearance" className="mt-2 block text-xs text-blue-600 hover:underline">
            Personnaliser →
          </Link>
        </div>
      </div>

      {/* Quick links */}
      <h2 className="mt-10 text-base font-semibold text-neutral-800">Accès rapide</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group rounded-lg border bg-white p-4 transition-shadow hover:shadow-sm"
          >
            <p className="text-sm font-semibold text-neutral-900 group-hover:text-blue-700">
              {l.label}
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">{l.desc}</p>
          </Link>
        ))}
      </div>

      {/* View site */}
      <div className="mt-8 flex items-center gap-4 text-sm text-neutral-500">
        <Link href="/" className="hover:underline">Voir le site →</Link>
        <span>·</span>
        <Link href="/admin/blueprint" className="hover:underline">Changer de blueprint →</Link>
      </div>
    </div>
  );
}
