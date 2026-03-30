import Link from "next/link";

export const metadata = {
  title: "Conditions Générales d'Utilisation | Holia",
  description:
    "Conditions générales d'utilisation de la plateforme Holia. Mise en relation praticiens bien-être et patients, frais, responsabilités.",
};

const sections = [
  { id: "article-1", label: "Article 1 — Objet et rôle de Holia" },
  { id: "article-2", label: "Article 2 — Inscription et comptes" },
  { id: "article-3", label: "Article 3 — Prise de rendez-vous et messagerie" },
  { id: "article-4", label: "Article 4 — Rôles et responsabilités" },
  { id: "article-5", label: "Article 5 — Limitation de responsabilité" },
  { id: "article-6", label: "Article 6 — Contenus et avis" },
  { id: "article-7", label: "Article 7 — Conditions financières" },
  { id: "article-8", label: "Article 8 — Données personnelles" },
  { id: "article-9", label: "Article 9 — Sécurité et abus" },
  { id: "article-10", label: "Article 10 — Propriété intellectuelle" },
  { id: "article-11", label: "Article 11 — Durée et résiliation" },
  { id: "article-12", label: "Article 12 — Droit applicable et litiges" },
  { id: "article-13", label: "Article 13 — Contact" },
];

export default function CGUPage() {
  return (
    <main className="min-h-screen bg-[#fafaf9] py-16 pt-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-anthracite mb-4">
            Conditions Générales d&apos;Utilisation
          </h1>
          <p className="text-anthracite/60 text-sm mb-10">
            Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </p>

          <p className="text-anthracite/80 leading-relaxed mb-10">
            Les présentes Conditions Générales d&apos;Utilisation (ci-après « CGU ») régissent l&apos;accès
            et l&apos;utilisation de la plateforme Holia (l&apos;« Application »). En utilisant l&apos;Application,
            vous acceptez sans réserve les CGU.
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
            <section id="article-1">
              <h2 className="text-2xl font-bold text-anthracite mb-4">Article 1 — Objet et rôle de Holia</h2>
              <p className="text-anthracite/80 leading-relaxed">
                Holia est une application de mise en relation entre clients (les « Utilisateurs ») et praticiens
                du bien-être (les « Praticiens »). Holia n&apos;est ni un prestataire de soins ni un établissement
                de santé. Holia n&apos;intervient pas dans la relation contractuelle entre Praticien et Utilisateur
                et n&apos;est pas partie aux prestations réalisées.
              </p>
            </section>

            <section id="article-2">
              <h2 className="text-2xl font-bold text-anthracite mb-4">Article 2 — Inscription et comptes</h2>
              <ul className="list-disc pl-6 text-anthracite/80 space-y-2">
                <li>Chaque Utilisateur doit fournir des informations exactes et à jour.</li>
                <li>Les Praticiens s&apos;engagent à communiquer des informations sincères sur leur profil et leurs services.</li>
                <li>Holia peut suspendre ou supprimer un compte en cas de non-respect des CGU ou de risque avéré de fraude.</li>
              </ul>
            </section>

            <section id="article-3">
              <h2 className="text-2xl font-bold text-anthracite mb-4">Article 3 — Prise de rendez-vous et messagerie</h2>
              <ul className="list-disc pl-6 text-anthracite/80 space-y-2">
                <li>
                  La réservation se fait via l&apos;Application. Le contrat de prestation est conclu directement entre
                  l&apos;Utilisateur et le Praticien.
                </li>
                <li>
                  La messagerie intégrée permet des échanges préalables pour clarifier le lieu, la nature de la prestation
                  et les attentes. Holia n&apos;est pas responsable du contenu des échanges.
                </li>
                <li>
                  Les Praticiens doivent recevoir les Utilisateurs dans un lieu adapté, sûr et conforme aux règles
                  applicables à leur activité.
                </li>
              </ul>
            </section>

            <section id="article-4">
              <h2 className="text-2xl font-bold text-anthracite mb-4">Article 4 — Rôles et responsabilités</h2>
              <ul className="list-disc pl-6 text-anthracite/80 space-y-2">
                <li>
                  <strong>Holia</strong> : fournit un service d&apos;intermédiation (mise en relation, outils de réservation
                  et de communication). Holia ne garantit ni la disponibilité, ni la qualité, ni l&apos;issue des prestations.
                </li>
                <li>
                  <strong>Praticiens</strong> : agissent de manière indépendante. Ils sont seuls responsables de la réalisation
                  de la prestation de soin ou de bien-être. Ils mandatent expressément Holia pour collecter en leur nom
                  et pour leur compte la part du prix leur revenant, ainsi que les frais de service et de transaction auprès
                  de l&apos;Utilisateur.
                </li>
                <li>
                  <strong>Utilisateurs</strong> : conservent la responsabilité de leur décision de recourir à un Praticien
                  et s&apos;assurent que la prestation est adaptée à leurs besoins. En cas de doute, ils doivent consulter
                  un professionnel de santé.
                </li>
              </ul>
            </section>

            <section id="article-5">
              <h2 className="text-2xl font-bold text-anthracite mb-4">Article 5 — Limitation de responsabilité</h2>
              <ul className="list-disc pl-6 text-anthracite/80 space-y-2">
                <li>
                  Holia n&apos;est pas responsable des informations fournies par les Praticiens, ni des prestations réalisées,
                  ni d&apos;un quelconque dommage indirect, immatériel, perte de chance, ni des manquements contractuels
                  entre Praticiens et Utilisateurs.
                </li>
                <li>
                  Holia met en œuvre des moyens raisonnables pour assurer la disponibilité de l&apos;Application mais
                  ne garantit pas l&apos;absence d&apos;interruptions, bugs ou erreurs.
                </li>
              </ul>
            </section>

            <section id="article-6">
              <h2 className="text-2xl font-bold text-anthracite mb-4">Article 6 — Contenus et avis</h2>
              <ul className="list-disc pl-6 text-anthracite/80 space-y-2">
                <li>Les contenus et avis doivent rester exacts, respectueux et conformes à la loi.</li>
                <li>Holia peut modérer ou supprimer des contenus manifestement illicites, diffamatoires ou frauduleux.</li>
              </ul>
            </section>

            <section id="article-7">
              <h2 className="text-2xl font-bold text-anthracite mb-4">Article 7 — Conditions financières</h2>
              <div className="text-anthracite/80 leading-relaxed space-y-4">
                <p>
                  <strong>Composition du prix :</strong> Le montant total TTC payé par l&apos;Utilisateur lors de la
                  réservation est composé de :
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>La prestation de bien-être</strong> : due au Praticien au titre de son expertise.
                  </li>
                  <li>
                    <strong>Les frais de service Holia</strong> : dus à la plateforme pour l&apos;utilisation des outils
                    de mise en relation, de messagerie et de gestion.
                  </li>
                  <li>
                    <strong>Les frais de traitement sécurisé</strong> : dus au prestataire de paiement (Stripe) pour
                    la sécurisation de la transaction bancaire.
                  </li>
                </ul>
                <p>
                  <strong>Mandat de facturation :</strong> Le Praticien accepte que Holia présente sur une facture unique
                  la décomposition de ces frais. Le Praticien ne comptabilise dans son chiffre d&apos;affaires que la part
                  « Prestation de bien-être ». Holia et Stripe perçoivent leurs frais respectifs directement lors de la
                  transaction.
                </p>
                <p>
                  <strong>Paiement :</strong> Les paiements sont traités via le système sécurisé Stripe Connect. Les fonds
                  (nets de frais de service et de transaction) sont versés sur le compte bancaire du Praticien selon les
                  délais de traitement en vigueur.
                </p>
                <p>
                  <strong>Remboursement :</strong> En cas d&apos;annulation conforme à la politique du Praticien, le
                  remboursement de la « Prestation » est intégral. Les frais de traitement Stripe peuvent rester à la
                  charge du Praticien selon les conditions générales de Stripe Connect.
                </p>
              </div>
            </section>

            <section id="article-8">
              <h2 className="text-2xl font-bold text-anthracite mb-4">Article 8 — Données personnelles</h2>
              <p className="text-anthracite/80 leading-relaxed">
                Le traitement des données personnelles est décrit dans la{" "}
                <Link href="/confidentialite" className="text-[#9bb49b] hover:underline font-medium">
                  Politique de confidentialité
                </Link>
                . Conformément au RGPD, vous disposez de droits d&apos;accès, rectification, effacement, limitation,
                opposition et portabilité.
              </p>
            </section>

            <section id="article-9">
              <h2 className="text-2xl font-bold text-anthracite mb-4">Article 9 — Sécurité et abus</h2>
              <ul className="list-disc pl-6 text-anthracite/80 space-y-2">
                <li>
                  Tout signalement d&apos;abus, de comportement à risque ou d&apos;activité illicite peut être transmis
                  via la page Contact. Holia pourra suspendre un compte le temps des vérifications nécessaires.
                </li>
                <li>
                  Les Praticiens doivent se conformer aux bonnes pratiques d&apos;accueil (hygiène, sécurité, confidentialité).
                </li>
              </ul>
            </section>

            <section id="article-10">
              <h2 className="text-2xl font-bold text-anthracite mb-4">Article 10 — Propriété intellectuelle</h2>
              <p className="text-anthracite/80 leading-relaxed">
                L&apos;Application et ses éléments sont protégés. Toute reproduction ou réutilisation non autorisée
                est interdite.
              </p>
            </section>

            <section id="article-11">
              <h2 className="text-2xl font-bold text-anthracite mb-4">Article 11 — Durée et résiliation</h2>
              <p className="text-anthracite/80 leading-relaxed">
                Les CGU s&apos;appliquent tant que vous utilisez l&apos;Application. Vous pouvez clôturer votre compte
                à tout moment. Holia peut suspendre ou supprimer un compte en cas de non-respect des CGU ou de risque avéré.
              </p>
            </section>

            <section id="article-12">
              <h2 className="text-2xl font-bold text-anthracite mb-4">Article 12 — Droit applicable et litiges</h2>
              <p className="text-anthracite/80 leading-relaxed">
                Les CGU sont régies par le droit français. En cas de litige, une solution amiable sera recherchée
                avant toute action judiciaire.
              </p>
            </section>

            <section id="article-13">
              <h2 className="text-2xl font-bold text-anthracite mb-4">Article 13 — Contact</h2>
              <p className="text-anthracite/80 leading-relaxed">
                Pour toute question relative aux CGU, contactez-nous via notre{" "}
                <Link href="/contact" className="text-[#9bb49b] hover:underline font-medium">
                  page de contact
                </Link>
                .
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-100">
            <p className="text-sm text-anthracite/60">
              Les présentes CGU peuvent être modifiées à tout moment. Nous vous informerons des changements significatifs
              par email ou via une notification sur le site.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
