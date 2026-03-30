import Link from "next/link";

export const metadata = {
  title: "Mentions légales | Holia",
  description:
    "Mentions légales du site Holia. Éditeur Holia par Websual, siège à Idron, hébergement Contabo dans l'Union européenne.",
};

const sections = [
  { id: "editeur", label: "Éditeur" },
  { id: "siege", label: "Siège social" },
  { id: "hebergement", label: "Hébergement" },
  { id: "propriete-intellectuelle", label: "Propriété intellectuelle" },
  { id: "responsabilite", label: "Responsabilité" },
];

export default function MentionsLegalesPage() {
  return (
    <main className="min-h-screen bg-[#fafaf9] py-16 pt-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-anthracite mb-4">
            Mentions légales
          </h1>
          <p className="text-anthracite/60 text-sm mb-10">
            Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </p>

          <p className="text-anthracite/80 leading-relaxed mb-10">
            Le site et l&apos;application Holia sont édités et exploités conformément aux dispositions
            légales en vigueur. Les informations ci-dessous sont fournies en vertu des obligations
            relatives à la transparence et à l&apos;information des utilisateurs.
          </p>

          {/* Sommaire cliquable */}
          <nav
            id="sommaire"
            className="mb-12 p-6 rounded-2xl bg-[#9bb49b]/5 border border-[#9bb49b]/20"
          >
            <h2 className="text-lg font-semibold text-anthracite mb-4">Sommaire</h2>
            <ul className="space-y-2">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-[#9bb49b] hover:text-[#8aa48a] hover:underline transition-colors"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-12">
            <section id="editeur">
              <h2 className="text-2xl font-bold text-anthracite mb-4">Éditeur</h2>
              <p className="text-anthracite/80 leading-relaxed mb-4">
                Le site Holia est édité par :
              </p>
              <ul className="list-disc pl-6 text-anthracite/80 space-y-2">
                <li><strong>Dénomination :</strong> Holia par Websual</li>
                <li><strong>Forme juridique :</strong> Marque exploitée par Websual</li>
                <li><strong>Pays :</strong> France</li>
              </ul>
            </section>

            <section id="siege">
              <h2 className="text-2xl font-bold text-anthracite mb-4">Siège social</h2>
              <p className="text-anthracite/80 leading-relaxed">
                Le siège social de Websual, éditeur de Holia, est situé à <strong>Idron</strong>, en France.
              </p>
            </section>

            <section id="hebergement">
              <h2 className="text-2xl font-bold text-anthracite mb-4">Hébergement</h2>
              <p className="text-anthracite/80 leading-relaxed mb-4">
                Le site et l&apos;application Holia sont hébergés par :
              </p>
              <ul className="list-disc pl-6 text-anthracite/80 space-y-2">
                <li><strong>Hébergeur :</strong> Contabo</li>
                <li><strong>Localisation :</strong> Union européenne</li>
                <li>
                  Les serveurs sont situés dans l&apos;Union européenne, conformément aux exigences
                  du Règlement Général sur la Protection des Données (RGPD).
                </li>
              </ul>
            </section>

            <section id="propriete-intellectuelle">
              <h2 className="text-2xl font-bold text-anthracite mb-4">Propriété intellectuelle</h2>
              <p className="text-anthracite/80 leading-relaxed">
                Les éléments composant Holia (textes, images, logos, interfaces, base de données,
                marques) sont protégés par le droit de la propriété intellectuelle. Toute reproduction,
                représentation, modification ou exploitation non autorisée est interdite et constitue
                une contrefaçon passible de poursuites.
              </p>
            </section>

            <section id="responsabilite">
              <h2 className="text-2xl font-bold text-anthracite mb-4">Responsabilité</h2>
              <p className="text-anthracite/80 leading-relaxed">
                Holia est une application de mise en relation entre praticiens du bien-être et patients.
                L&apos;éditeur n&apos;est pas partie aux prestations réalisées par les praticiens et n&apos;engage
                pas sa responsabilité au titre de ces prestations. Pour le détail des rôles et responsabilités,
                reportez-vous à nos{" "}
                <Link href="/cgu" className="text-[#9bb49b] hover:underline font-medium">
                  Conditions Générales d&apos;Utilisation
                </Link>
                .
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-100">
            <p className="text-sm text-anthracite/60">
              Ces mentions légales peuvent être modifiées à tout moment. Pour toute question, contactez-nous via
              notre{" "}
              <Link href="/contact" className="text-[#9bb49b] hover:underline">
                page de contact
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
