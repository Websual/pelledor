import Link from "next/link";

export const metadata = {
  title: "Politique de Confidentialité | Holia",
  description:
    "Politique de confidentialité et protection des données personnelles. Chiffrement AES-256, droit à l'oubli, sous-traitants.",
};

const sections = [
  { id: "introduction", label: "Introduction" },
  { id: "securite-echanges", label: "Sécurité des échanges" },
  { id: "droit-oubli", label: "Droit à l'oubli & rétention" },
  { id: "verification-pro", label: "Vérification professionnelle" },
  { id: "sous-traitants", label: "Sous-traitants" },
  { id: "donnees-google", label: "Utilisation des données utilisateur Google" },
  { id: "donnees-sante", label: "Données de santé" },
  { id: "donnees-traitees", label: "Données traitées" },
  { id: "droits", label: "Vos droits" },
  { id: "contact", label: "Contact" },
];

export default function ConfidentialitePage() {
  return (
    <main className="min-h-screen bg-[#fafaf9] py-16 pt-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-anthracite mb-4">
            Politique de Confidentialité
          </h1>
          <p className="text-anthracite/60 text-sm mb-10">
            Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
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
            <section id="introduction">
              <h2 className="text-2xl font-bold text-anthracite mb-4">Introduction</h2>
              <p className="text-anthracite/80 leading-relaxed">
                Holia s&apos;engage à protéger votre vie privée et vos données personnelles avec un niveau
                de sécurité exceptionnel. Cette politique explique comment nous collectons, utilisons et
                protégeons vos informations conformément au Règlement Général sur la Protection des Données (RGPD).
              </p>
            </section>

            <section id="securite-echanges">
              <h2 className="text-2xl font-bold text-anthracite mb-4">Sécurité des échanges</h2>
              <p className="text-anthracite/80 leading-relaxed mb-4">
                Tous les messages échangés entre patients et praticiens via notre messagerie intégrée
                sont chiffrés grâce à l&apos;algorithme <strong>AES-256</strong> (Advanced Encryption Standard),
                référence mondiale en matière de cryptographie.
              </p>
              <p className="text-anthracite/80 leading-relaxed">
                Ces données sont stockées sous forme chiffrée sur nos serveurs. En temps normal,
                les administrateurs de la plateforme ne peuvent pas lire le contenu de vos échanges.
                Seuls vous et votre interlocuteur (patient ou praticien) avez accès aux messages déchiffrés.
              </p>
            </section>

            <section id="droit-oubli">
              <h2 className="text-2xl font-bold text-anthracite mb-4">Droit à l&apos;oubli & rétention</h2>
              <p className="text-anthracite/80 leading-relaxed">
                Dans une démarche de minimisation des données, les messages sont définitivement supprimés
                de nos serveurs <strong>6 mois après la fin du rendez-vous</strong> associé. Cette suppression
                est irréversible et intervient automatiquement dans le cadre de notre politique de rétention.
                Nous ne conservons que les données strictement nécessaires au fonctionnement du service
                et aux obligations légales.
              </p>
            </section>

            <section id="verification-pro">
              <h2 className="text-2xl font-bold text-anthracite mb-4">Vérification professionnelle</h2>
              <p className="text-anthracite/80 leading-relaxed">
                Les documents fournis par les praticiens (SIRET, assurance RC Pro, diplômes ou certifications)
                sont utilisés <strong>uniquement à des fins de certification</strong> et de vérification de leur
                capacité à exercer. Ces documents sont stockés sur un stockage sécurisé et isolé, accessible
                uniquement aux personnes habilitées dans le cadre du processus de validation.
              </p>
            </section>

            <section id="sous-traitants">
              <h2 className="text-2xl font-bold text-anthracite mb-4">Sous-traitants</h2>
              <p className="text-anthracite/80 leading-relaxed mb-4">
                Nous travaillons avec des partenaires de confiance, soumis à des engagements contractuels
                stricts en matière de protection des données :
              </p>
              <ul className="list-disc pl-6 text-anthracite/80 space-y-2 mb-4">
                <li><strong>Stripe</strong> — Paiements sécurisés</li>
                <li><strong>INSEE</strong> — Vérification légale des numéros SIRET</li>
              </ul>
              <p className="text-anthracite/80 leading-relaxed">
                Les données traitées par ces sous-traitants restent au sein de l&apos;<strong>Union Européenne</strong>,
                conformément aux exigences du RGPD.
              </p>
            </section>

            <section id="donnees-google">
              <h2 className="text-2xl font-bold text-anthracite mb-4">Utilisation des données utilisateur Google</h2>
              <p className="text-anthracite/80 leading-relaxed mb-4">
                Nous demandons l&apos;accès au calendrier (Google Calendar) <strong>uniquement pour synchroniser les rendez-vous Holia</strong> et éviter les doubles réservations. Les créneaux réservés sur Holia sont envoyés vers votre agenda Google afin que vos disponibilités restent à jour, et les événements déjà présents dans votre calendrier peuvent être pris en compte pour ne pas proposer de créneaux en conflit.
              </p>
              <p className="text-anthracite/80 leading-relaxed mb-4">
                Nous ne partageons, ne vendons et ne transférons <strong>jamais</strong> ces données Google à des tiers, à l&apos;exception des prestataires techniques indispensables au fonctionnement de l&apos;application (par exemple notre hébergeur de base de données), qui sont soumis à des obligations contractuelles strictes en matière de confidentialité et de sécurité des données.
              </p>
              <p className="text-anthracite/80 leading-relaxed">
                L&apos;utilisation des informations reçues des API Google par Holia respectera la{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#9bb49b] hover:underline font-medium"
                >
                  politique de données utilisateur des services API de Google
                </a>
                , y compris les exigences d&apos;utilisation limitée.
              </p>
            </section>

            <section id="donnees-sante">
              <h2 className="text-2xl font-bold text-anthracite mb-4">Données de santé</h2>
              <p className="text-anthracite/80 leading-relaxed">
                Holia n&apos;est pas un Dossier Médical Partagé (DMP) et ne constitue pas un outil de suivi
                médical. Nous vous invitons à <strong>ne pas partager d&apos;informations médicales critiques</strong> via
                la messagerie (résultats d&apos;examens, ordonnances, antécédents sensibles, etc.). Pour toute
                question de santé, privilégiez une consultation en présentiel ou un échange direct avec votre
                professionnel de santé.
              </p>
            </section>

            <section id="donnees-traitees">
              <h2 className="text-2xl font-bold text-anthracite mb-4">Données traitées</h2>
              <ul className="list-disc pl-6 text-anthracite/80 space-y-2">
                <li><strong>Compte utilisateur</strong> : email, nom, prénom, rôle (client/praticien), téléphone le cas échéant</li>
                <li><strong>Profil praticien</strong> : titre, ville, informations publiques, contenus fournis</li>
                <li><strong>Rendez-vous</strong> : dates, services, statuts, échanges liés</li>
                <li><strong>Fonctionnement</strong> : logs techniques, sécurité, prévention des abus</li>
              </ul>
            </section>

            <section id="droits">
              <h2 className="text-2xl font-bold text-anthracite mb-4">Vos droits</h2>
              <p className="text-anthracite/80 leading-relaxed mb-4">
                Conformément au RGPD, vous disposez des droits suivants :
              </p>
              <ul className="list-disc pl-6 text-anthracite/80 space-y-2">
                <li>Droit d&apos;accès — Consulter vos données personnelles</li>
                <li>Droit de rectification — Corriger vos données</li>
                <li>Droit à l&apos;effacement — Supprimer votre compte</li>
                <li>Droit à la portabilité — Récupérer vos données</li>
                <li>Droit d&apos;opposition — Refuser certains traitements</li>
              </ul>
              <p className="text-anthracite/80 leading-relaxed mt-4">
                Pour exercer ces droits ou en cas de réclamation, vous pouvez contacter la CNIL (cnil.fr).
              </p>
            </section>

            <section id="contact">
              <h2 className="text-2xl font-bold text-anthracite mb-4">Contact</h2>
              <p className="text-anthracite/80 leading-relaxed">
                Pour toute question concernant cette politique ou pour exercer vos droits, contactez-nous via{" "}
                <Link href="/contact" className="text-[#9bb49b] hover:underline font-medium">
                  notre page de contact
                </Link>
                .
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-100">
            <p className="text-sm text-anthracite/60">
              Cette politique de confidentialité peut être modifiée à tout moment. Nous vous informerons
              des changements significatifs par email ou via une notification sur le site.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
