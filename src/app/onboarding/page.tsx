import { auth } from "@/auth";
import { getBlueprintActive } from "@/core/blueprint/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const BLUEPRINT_LABELS: Record<string, { label: string; emoji: string; applyHref: string; demoHint: string }> = {
  artisan: {
    label: "Artisan",
    emoji: "🔧",
    applyHref: "/admin/blueprint#artisan",
    demoHint: "Votre site vitrine artisan est prêt. Les clients peuvent demander un devis en ligne.",
  },
  restaurant: {
    label: "Restaurant",
    emoji: "🍽️",
    applyHref: "/admin/blueprint#restaurant",
    demoHint: "Votre page de réservation est active : /restauration/reserver?e=mon-restaurant",
  },
  gite: {
    label: "Gîte / Hébergement",
    emoji: "🏡",
    applyHref: "/admin/blueprint#gite",
    demoHint: "Vos chambres sont en ligne. Réservation : /hebergement/chambre/chambre-1?e=mon-gite",
  },
  hotel: {
    label: "Hôtel",
    emoji: "🏨",
    applyHref: "/admin/blueprint#hotel",
    demoHint: "3 chambres de démo créées. Réservation : /hebergement/chambre/chambre-classique?e=mon-hotel",
  },
  praticien: {
    label: "Praticien bien-être",
    emoji: "🧘",
    applyHref: "/admin/blueprint#praticien",
    demoHint: "Votre fiche praticien est active. RDV en ligne : /annuaire/mon-praticien",
  },
  cabinet: {
    label: "Cabinet",
    emoji: "⚖️",
    applyHref: "/admin/blueprint#cabinet",
    demoHint: "Votre cabinet est en ligne. Prise de RDV : /annuaire/mon-cabinet",
  },
  immobilier: {
    label: "Agence immobilière",
    emoji: "🏢",
    applyHref: "/admin/blueprint#immobilier",
    demoHint: "Votre agence est active. Événements (portes ouvertes) : /evenements",
  },
  salon: {
    label: "Salon de beauté",
    emoji: "✂️",
    applyHref: "/admin/blueprint#salon",
    demoHint: "Votre salon est en ligne. RDV en ligne : /annuaire/mon-salon",
  },
  boutique: {
    label: "Boutique e-commerce",
    emoji: "🛒",
    applyHref: "/admin/blueprint#boutique",
    demoHint: "Votre catalogue est actif : /boutique — Commandes : /admin/shop",
  },
};

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let active = "none";
  try {
    active = (await getBlueprintActive()) ?? "none";
  } catch {
    // DB error — show generic steps
  }

  const bp = BLUEPRINT_LABELS[active];

  const steps = [
    {
      n: 1,
      done: true,
      title: "Compte admin créé",
      desc: `Connecté en tant que ${session.user.email}`,
      action: null,
    },
    {
      n: 2,
      done: active !== "none",
      title: active !== "none" ? `Blueprint ${bp?.label ?? active} sélectionné` : "Choisir votre métier",
      desc: active !== "none"
        ? "Le blueprint de base est enregistré."
        : "Sélectionnez votre secteur pour configurer les modules adaptés.",
      action: active === "none" ? { label: "Choisir un blueprint →", href: "/admin/blueprint" } : null,
    },
    {
      n: 3,
      done: false,
      title: "Appliquer le blueprint",
      desc: active !== "none"
        ? `Activez les modules ${bp?.label ?? active} et créez les données de démo.`
        : "Activez les modules une fois votre métier choisi.",
      action: active !== "none"
        ? { label: `Appliquer ${bp?.label ?? active} →`, href: bp?.applyHref ?? "/admin/blueprint" }
        : null,
    },
    {
      n: 4,
      done: false,
      title: "Personnaliser votre vitrine",
      desc: "Modifiez les couleurs, le nom de votre entreprise, les textes.",
      action: { label: "Apparence →", href: "/admin/appearance" },
    },
    {
      n: 5,
      done: false,
      title: "Tester votre app",
      desc: bp?.demoHint ?? "Votre site est prêt — naviguez sur la page d'accueil.",
      action: { label: "Voir le site →", href: "/" },
    },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <div className="mb-3 text-4xl">{bp?.emoji ?? "🚀"}</div>
        <h1 className="text-2xl font-bold text-neutral-900">
          {active !== "none" ? `Configuration ${bp?.label ?? active}` : "Bienvenue sur SaaS OS"}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Suivez ces 5 étapes pour avoir votre app métier opérationnelle en moins de 5 minutes.
        </p>
      </div>

      <ol className="space-y-4">
        {steps.map((step) => (
          <li
            key={step.n}
            className={`rounded-xl border p-4 ${
              step.done
                ? "border-green-200 bg-green-50"
                : "border-neutral-200 bg-white"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  step.done
                    ? "bg-green-500 text-white"
                    : "bg-neutral-200 text-neutral-600"
                }`}
              >
                {step.done ? "✓" : step.n}
              </div>
              <div className="flex-1">
                <p className={`font-semibold ${step.done ? "text-green-800" : "text-neutral-900"}`}>
                  {step.title}
                </p>
                <p className="mt-0.5 text-sm text-neutral-600">{step.desc}</p>
                {step.action && (
                  <Link
                    href={step.action.href}
                    className="mt-2 inline-flex items-center gap-1 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-700"
                  >
                    {step.action.label}
                  </Link>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-xl border border-neutral-100 bg-neutral-50 p-4 text-center text-sm text-neutral-500">
        <p>Besoin d&apos;aide ? Consultez la{" "}
          <Link href="/docs" className="text-blue-600 hover:underline">documentation</Link>{" "}
          ou accédez à{" "}
          <Link href="/admin" className="text-blue-600 hover:underline">votre admin</Link>.
        </p>
      </div>
    </div>
  );
}
