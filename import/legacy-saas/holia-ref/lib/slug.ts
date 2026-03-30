/**
 * Slugify rigoureux : sans accents, sans caractères spéciaux.
 * Seuls a-z, 0-9 et les tirets sont conservés.
 */
export function slugify(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprimer les accents
    .replace(/[^a-z0-9\s-]/g, "") // Supprimer caractères spéciaux (garder espaces et tirets)
    .replace(/\s+/g, "-") // Espaces -> tirets
    .replace(/-+/g, "-") // Tirets multiples -> un seul
    .replace(/^-+|-+$/g, "") // Supprimer tirets en début/fin
    .substring(0, 80) || "slug";
}

/**
 * Génère un slug praticien au format prenom-nom-metier-ville.
 * Utilisé à l'inscription. Gère les noms incomplets (fallback).
 */
export function generatePractitionerSlugFromRegistration(
  fullName: string,
  professionSlug: string,
  city: string
): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const prenom = slugify(parts[0] || "prenom");
  const nom = slugify(parts.slice(1).join(" ") || "nom");
  const metier = slugify(professionSlug || "metier");
  const ville = slugify(city || "ville");
  const base = [prenom, nom, metier, ville].filter(Boolean).join("-");
  return base || "praticien";
}

/** @deprecated Préférer generatePractitionerSlugFromRegistration pour les nouvelles inscriptions */
export function generateSlug(text: string): string {
  return slugify(text);
}

/** @deprecated Préférer generatePractitionerSlugFromRegistration */
export function generatePractitionerSlug(title: string, city: string): string {
  const titleSlug = slugify(title);
  const citySlug = slugify(city);
  return `${titleSlug}-${citySlug}`;
}

/**
 * Retourne un slug unique : ajoute un suffixe numérique en cas de collision.
 */
export function ensureUniqueSlug(
  baseSlug: string,
  existingSlugs: string[]
): string {
  let slug = baseSlug;
  let counter = 1;
  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
}

const FRENCH_MONTHS = [
  "janvier", "fevrier", "mars", "avril", "mai", "juin",
  "juillet", "aout", "septembre", "octobre", "novembre", "decembre",
];

/**
 * Slugify pour événements : préserve les apostrophes comme tirets (l'eau -> l-eau).
 */
function slugifyForEvent(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/'/g, "-") // Apostrophes -> tirets
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80) || "slug";
}

/**
 * Génère un slug événement au format : nom-evenement-ville-jj-mois.
 * Exemple : 'La magie de l'eau' à 'Pau' le 06/02 -> la-magie-de-l-eau-pau-06-fevrier
 */
export function generateEventSlug(
  title: string,
  city: string,
  date: Date
): string {
  const titleSlug = slugifyForEvent(title);
  const citySlug = slugifyForEvent(city || "lieu");
  const day = date.getDate().toString().padStart(2, "0");
  const month = FRENCH_MONTHS[date.getMonth()] || "mois";
  const dateSlug = `${day}-${month}`;
  const base = [titleSlug, citySlug, dateSlug].filter(Boolean).join("-");
  return base || "evenement";
}