import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Charte Déontologique | Holia",
  description:
    "Charte déontologique des praticiens Holia. Secret professionnel, respect, compétence, prudence et éthique dans la pratique du bien-être.",
};

const POINTS = [
  {
    id: "secret-professionnel",
    titre: "Secret professionnel",
    contenu:
      "Le praticien s'engage à préserver la confidentialité absolue des informations partagées par les personnes qui le consultent. Aucune donnée personnelle, médicale ou relative à la vie privée ne peut être divulguée à des tiers, sauf obligation légale ou consentement explicite.",
  },
  {
    id: "respect",
    titre: "Respect",
    contenu:
      "Le praticien s'engage à accueillir chaque personne avec bienveillance, sans discrimination liée à l'origine, aux convictions, au genre ou à la situation personnelle. Le respect de l'autonomie, des choix et du rythme de la personne est une priorité.",
  },
  {
    id: "competence",
    titre: "Compétence",
    contenu:
      "Le praticien s'engage à exercer uniquement dans le cadre de sa formation, de ses diplômes et de ses compétences reconnues. Il se forme régulièrement et met à jour ses connaissances pour garantir une pratique adaptée et à jour.",
  },
  {
    id: "prudence",
    titre: "Prudence",
    contenu:
      "Le praticien s'engage à exercer avec discernement. Il reconnaît les limites de sa pratique, oriente vers les professionnels de santé appropriés lorsqu'il le juge nécessaire, et ne pose pas de diagnostic médical.",
  },
  {
    id: "integrite",
    titre: "Intégrité",
    contenu:
      "Le praticien s'engage à une honnêteté totale dans sa communication, sa publicité et ses tarifs. Il ne fait pas de promesses excessives et présente ses services de manière claire et transparente.",
  },
  {
    id: "non-nuisance",
    titre: "Non-nuisance",
    contenu:
      "Le praticien s'engage à ne pas nuire, physiquement ou psychologiquement, aux personnes qui le consultent. Sa pratique exclut toute manipulation, abus de vulnérabilité ou exploitation de la relation de confiance.",
  },
  {
    id: "independance",
    titre: "Indépendance",
    contenu:
      "Le praticien s'engage à préserver son indépendance professionnelle. Ses conseils et recommandations ne sont influencés ni par des intérêts commerciaux, ni par des pressions extérieures, au seul bénéfice des personnes accompagnées.",
  },
  {
    id: "ethique",
    titre: "Éthique",
    contenu:
      "Le praticien s'engage à maintenir une relation professionnelle claire et respectueuse des frontières. Il évite toute confusion entre vie personnelle et vie professionnelle et se comporte en tout temps de manière exemplaire.",
  },
];

export default function CharteDeontologiquePage() {
  return (
    <main className="min-h-screen bg-[#fafaf9] py-16 pt-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-anthracite/70 hover:text-sauge transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Retour à l&apos;accueil</span>
        </Link>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-sauge/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Shield className="h-7 w-7 text-sauge" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-anthracite">
                Charte Déontologique Holia
              </h1>
              <p className="text-anthracite/60 text-sm mt-1">
                Engagement des praticiens du bien-être sur la plateforme
              </p>
            </div>
          </div>

          <p className="text-anthracite/80 leading-relaxed mb-10">
            La présente charte définit les principes éthiques et déontologiques auxquels s&apos;engagent
            les praticiens inscrits sur Holia. En rejoignant la plateforme, chaque professionnel s&apos;engage
            à respecter ces principes dans l&apos;exercice de son activité.
          </p>

          {/* Sommaire */}
          <nav
            id="sommaire"
            className="mb-12 p-6 rounded-2xl bg-sauge/5 border border-sauge/20"
          >
            <h2 className="text-lg font-semibold text-anthracite mb-4">Les 8 piliers</h2>
            <ul className="space-y-2">
              {POINTS.map((p) => (
                <li key={p.id}>
                  <a
                    href={`#${p.id}`}
                    className="text-sauge hover:text-sauge/80 hover:underline transition-colors"
                  >
                    {p.titre}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-10">
            {POINTS.map((point, index) => (
              <section key={point.id} id={point.id} className="scroll-mt-24">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-sauge/10 flex items-center justify-center flex-shrink-0 font-bold text-sauge text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-anthracite mb-3">
                      {point.titre}
                    </h2>
                    <p className="text-anthracite/80 leading-relaxed">
                      {point.contenu}
                    </p>
                  </div>
                </div>
              </section>
            ))}
          </div>

          <div className="mt-12 p-6 rounded-2xl bg-sauge/5 border border-sauge/20">
            <p className="text-anthracite/80 text-sm leading-relaxed">
              Tout praticien signataire de cette charte s&apos;engage à en respecter l&apos;esprit et la lettre.
              Holia se réserve le droit de suspendre ou de retirer de la plateforme tout praticien dont
              le comportement serait contraire à ces principes.
            </p>
          </div>

          <p className="text-anthracite/50 text-xs mt-10">
            Dernière mise à jour :{" "}
            {new Date().toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/recherche"
            className="inline-flex items-center gap-2 text-sauge hover:text-sauge/80 font-medium transition-colors"
          >
            Trouver un praticien engagé
            <ArrowLeft className="h-4 w-4 rotate-180" />
          </Link>
        </div>
      </div>
    </main>
  );
}
