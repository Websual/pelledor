/**
 * Maillage intelligent : transforme les noms de métiers dans le contenu MDX
 * en liens cliquables vers /profession/[slug]
 *
 * Les termes sont recherchés en respectant les limites de mots.
 * Les liens existants et le code sont préservés.
 */

interface ProfessionMapping {
  terms: string[];
  slug: string;
}

const PROFESSION_MAP: ProfessionMapping[] = [
  { terms: ["naturopathie", "naturopathe", "naturopathes"], slug: "naturopathe" },
  { terms: ["sophrologie", "sophrologue", "sophrologues"], slug: "sophrologue" },
  {
    terms: [
      "hypnothérapie",
      "hypnotherapie",
      "hypnothérapeute",
      "hypnotherapeute",
      "hypnose",
      "hypnothérapeutes",
      "hypnotherapeutes",
    ],
    slug: "hypnotherapeute",
  },
  {
    terms: ["ostéopathie", "osteopathie", "ostéopathe", "osteopathe", "ostéopathes", "osteopathes"],
    slug: "osteopathe",
  },
  {
    terms: ["réflexologie", "reflexologie", "réflexologue", "reflexologue", "réflexologues", "reflexologues"],
    slug: "reflexologue",
  },
  {
    terms: [
      "kinésithérapie",
      "kinesitherapie",
      "kinésithérapeute",
      "kinesitherapeute",
      "kinésithérapeutes",
      "kinesitherapeutes",
    ],
    slug: "kinesitherapeute",
  },
  { terms: ["psychologie", "psychologue", "psychologues"], slug: "psychologue" },
  { terms: ["coaching bien-être", "coach bien-être"], slug: "coach-bien-etre" },
  { terms: ["acupuncture", "acupuncteur", "acupuncteurs"], slug: "acupuncteur" },
  {
    terms: ["magnétisme", "magnetisme", "magnétiseur", "magnetiseur", "magnétiseurs", "magnetiseurs"],
    slug: "magnetiseur",
  },
  { terms: ["reiki", "praticien reiki", "praticiens reiki"], slug: "praticien-reiki" },
];

/**
 * Protège les liens et le code, effectue les remplacements, restaure.
 */
export function transformMdxWithProfessionLinks(content: string): string {
  if (!content || typeof content !== "string") return content;

  const protectedParts: string[] = [];

  // 1. Protéger les blocs code ```...```
  let working = content.replace(/```[\s\S]*?```/g, (match) => {
    const idx = protectedParts.length;
    protectedParts.push(match);
    return `\x00PROT${idx}\x00`;
  });

  // 2. Protéger les liens [text](url)
  working = working.replace(/\[[^\]]+\]\([^)]+\)/g, (match) => {
    const idx = protectedParts.length;
    protectedParts.push(match);
    return `\x00PROT${idx}\x00`;
  });

  // 3. Protéger le code inline `...`
  working = working.replace(/`[^`]+`/g, (match) => {
    const idx = protectedParts.length;
    protectedParts.push(match);
    return `\x00PROT${idx}\x00`;
  });

  // 4. Trier les termes par longueur décroissante pour éviter remplacements partiels
  const flatTerms: { term: string; slug: string }[] = [];
  for (const { terms, slug } of PROFESSION_MAP) {
    for (const term of terms) {
      flatTerms.push({ term, slug });
    }
  }
  flatTerms.sort((a, b) => b.term.length - a.term.length);

  // 5. Remplacer chaque terme par un placeholder (évite de remplacer dans les URLs générées)
  const linkPlaceholders: string[] = [];
  for (const { term, slug } of flatTerms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?<!\\w)(${escaped})(?!\\w)`, "gi");
    working = working.replace(regex, (match) => {
      const idx = linkPlaceholders.length;
      linkPlaceholders.push(`[${match}](/profession/${slug})`);
      return `\x00LINK${idx}\x00`;
    });
  }

  // 6. Restaurer les placeholders de liens créés
  for (let i = 0; i < linkPlaceholders.length; i++) {
    working = working.replace(`\x00LINK${i}\x00`, linkPlaceholders[i] ?? "");
  }

  // 7. Restaurer les parties protégées
  for (let i = 0; i < protectedParts.length; i++) {
    working = working.replace(`\x00PROT${i}\x00`, protectedParts[i] ?? "");
  }

  return working;
}
