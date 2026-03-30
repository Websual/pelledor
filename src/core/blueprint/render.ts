import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { artisanPlaceholderDefaults } from "./defaults-artisan";
import { gitePlaceholderDefaults } from "./defaults-gite";
import { praticienPlaceholderDefaults } from "./defaults-praticien";
import { cabinetPlaceholderDefaults } from "./defaults-cabinet";
import { immobilierPlaceholderDefaults } from "./defaults-immobilier";
import { salonPlaceholderDefaults } from "./defaults-salon";
import { restaurantPlaceholderDefaults } from "./defaults-restaurant";
import { hotelPlaceholderDefaults } from "./defaults-hotel";
import { boutiquePlaceholderDefaults } from "./defaults-boutique";

const TEMPLATES_ROOT = join(process.cwd(), "content", "blueprints", "templates");

/**
 * Échappe le texte inséré dans du HTML (contenu admin).
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Fusionne défauts artisan + surcharge (valeurs non vides).
 */
export function mergeArtisanPayload(
  stored: Record<string, string> | null | undefined
): Record<string, string> {
  const out = { ...artisanPlaceholderDefaults };
  if (stored && typeof stored === "object") {
    for (const [k, v] of Object.entries(stored)) {
      if (v != null && String(v).trim() !== "") out[k] = String(v);
    }
  }
  return out;
}

/**
 * Rend le HTML du template artisan avec placeholders {{KEY}}.
 */
export function renderArtisanTemplate(
  payload: Record<string, string>
): string {
  const path = join(TEMPLATES_ROOT, "artisan", "index.html");
  if (!existsSync(path)) {
    return `<!DOCTYPE html><html><body><p>Template manquant : content/blueprints/templates/artisan/index.html</p></body></html>`;
  }
  let html = readFileSync(path, "utf8");
  html = html.replace(
    '<script src="/lucide.min.js"></script>',
    '<script src="https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js"></script>'
  );
  for (const [key, value] of Object.entries(payload)) {
    const re = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    html = html.replace(re, value);
  }
  /* Placeholders oubliés → vide pour ne pas casser la page */
  html = html.replace(/\{\{[A-Z0-9_]+\}\}/g, "");
  return html;
}

export function mergeGitePayload(
  stored: Record<string, string> | null | undefined
): Record<string, string> {
  const out = { ...gitePlaceholderDefaults };
  if (stored && typeof stored === "object") {
    for (const [k, v] of Object.entries(stored)) {
      if (v != null && String(v).trim() !== "") out[k] = String(v);
    }
  }
  return out;
}

export function renderGiteTemplate(payload: Record<string, string>): string {
  const path = join(TEMPLATES_ROOT, "gite", "index.html");
  if (!existsSync(path)) {
    return `<!DOCTYPE html><html><body><p>Template gite manquant</p></body></html>`;
  }
  let html = readFileSync(path, "utf8");
  html = html.replace(
    '<script src="/lucide.min.js"></script>',
    '<script src="https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js"></script>'
  );
  for (const [key, value] of Object.entries(payload)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  html = html.replace(/\{\{[A-Z0-9_]+\}\}/g, "");
  return html;
}

export function mergeHotelPayload(
  stored: Record<string, string> | null | undefined
): Record<string, string> {
  const out = { ...hotelPlaceholderDefaults };
  if (stored && typeof stored === "object") {
    for (const [k, v] of Object.entries(stored)) {
      if (v != null && String(v).trim() !== "") out[k] = String(v);
    }
  }
  return out;
}

export function renderHotelTemplate(payload: Record<string, string>): string {
  const path = join(TEMPLATES_ROOT, "hotel", "index.html");
  if (!existsSync(path))
    return `<!DOCTYPE html><html><body>Template hôtel manquant</body></html>`;
  let html = readFileSync(path, "utf8");
  html = html.replace(
    '<script src="/lucide.min.js"></script>',
    '<script src="https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js"></script>'
  );
  for (const [key, value] of Object.entries(payload)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  html = html.replace(/\{\{[A-Z0-9_]+\}\}/g, "");
  const resa =
    payload.LINK_RESA?.trim() ||
    "/hebergement/chambre/chambre-classique?e=mon-hotel";
  const safe = resa.replace(/"/g, "&quot;");
  html = html.replace(
    /<button class="booking-submit"[^>]*>Rechercher<\/button>/,
    `<a class="booking-submit" href="${safe}" style="display:inline-flex;align-items:center;justify-content:center;width:100%;text-decoration:none;background:var(--accent);color:#fff;border:none;padding:0.85rem 1rem;font:inherit;cursor:pointer;border-radius:4px;">Réserver en ligne</a>`
  );
  return html;
}

export function mergeRestaurantPayload(
  stored: Record<string, string> | null | undefined
): Record<string, string> {
  const out = { ...restaurantPlaceholderDefaults };
  if (stored && typeof stored === "object") {
    for (const [k, v] of Object.entries(stored)) {
      if (v != null && String(v).trim() !== "") out[k] = String(v);
    }
  }
  return out;
}

export function renderRestaurantTemplate(
  payload: Record<string, string>
): string {
  const path = join(TEMPLATES_ROOT, "restaurant", "index.html");
  if (!existsSync(path))
    return `<!DOCTYPE html><html><body>Template restaurant manquant</body></html>`;
  let html = readFileSync(path, "utf8");
  html = html.replace(
    '<script src="/lucide.min.js"></script>',
    '<script src="https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js"></script>'
  );
  for (const [key, value] of Object.entries(payload)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  html = html.replace(/\{\{[A-Z0-9_]+\}\}/g, "");
  html = html.replace(
    /href="#contact"/g,
    'href="/restauration/reserver?e=mon-restaurant"'
  );
  return html;
}

export function mergePraticienPayload(
  stored: Record<string, string> | null | undefined
): Record<string, string> {
  const out = { ...praticienPlaceholderDefaults };
  if (stored && typeof stored === "object") {
    for (const [k, v] of Object.entries(stored)) {
      if (v != null && String(v).trim() !== "") out[k] = String(v);
    }
  }
  return out;
}

export function renderPraticienTemplate(
  payload: Record<string, string>
): string {
  const path = join(TEMPLATES_ROOT, "praticien", "index.html");
  if (!existsSync(path))
    return `<!DOCTYPE html><html><body>Template praticien manquant</body></html>`;
  let html = readFileSync(path, "utf8");
  html = html.replace(
    '<script src="/lucide.min.js"></script>',
    '<script src="https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js"></script>'
  );
  for (const [key, value] of Object.entries(payload)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  html = html.replace(/\{\{[A-Z0-9_]+\}\}/g, "");
  return html;
}

export function mergeCabinetPayload(
  stored: Record<string, string> | null | undefined
): Record<string, string> {
  const out = { ...cabinetPlaceholderDefaults };
  if (stored && typeof stored === "object") {
    for (const [k, v] of Object.entries(stored)) {
      if (v != null && String(v).trim() !== "") out[k] = String(v);
    }
  }
  return out;
}

export function renderCabinetTemplate(
  payload: Record<string, string>
): string {
  const path = join(TEMPLATES_ROOT, "cabinet", "index.html");
  if (!existsSync(path))
    return `<!DOCTYPE html><html><body>Template cabinet manquant</body></html>`;
  let html = readFileSync(path, "utf8");
  html = html.replace(
    '<script src="/lucide.min.js"></script>',
    '<script src="https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js"></script>'
  );
  for (const [key, value] of Object.entries(payload)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  html = html.replace(/\{\{[A-Z0-9_]+\}\}/g, "");
  html = html.replace(
    /<a href="#contact" class="cta-fill">Prendre Rendez-vous<\/a>/,
    '<a href="/login" class="cta-fill">Prendre Rendez-vous</a>'
  );
  html = html.replace(
    /<li><a href="#contact">Contact<\/a><\/li>/,
    '<li><a href="/login">RDV en ligne</a></li>'
  );
  return html;
}

export function mergeImmobilierPayload(
  stored: Record<string, string> | null | undefined
): Record<string, string> {
  const out = { ...immobilierPlaceholderDefaults };
  if (stored && typeof stored === "object") {
    for (const [k, v] of Object.entries(stored)) {
      if (v != null && String(v).trim() !== "") out[k] = String(v);
    }
  }
  return out;
}

export function renderImmobilierTemplate(
  payload: Record<string, string>
): string {
  const path = join(TEMPLATES_ROOT, "immobilier", "index.html");
  if (!existsSync(path))
    return `<!DOCTYPE html><html><body>Template immobilier manquant</body></html>`;
  let html = readFileSync(path, "utf8");
  html = html.replace(
    '<script src="/lucide.min.js"></script>',
    '<script src="https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js"></script>'
  );
  for (const [key, value] of Object.entries(payload)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  html = html.replace(/\{\{[A-Z0-9_]+\}\}/g, "");
  return html;
}

export function mergeSalonPayload(
  stored: Record<string, string> | null | undefined
): Record<string, string> {
  const out = { ...salonPlaceholderDefaults };
  if (stored && typeof stored === "object") {
    for (const [k, v] of Object.entries(stored)) {
      if (v != null && String(v).trim() !== "") out[k] = String(v);
    }
  }
  return out;
}

export function renderSalonTemplate(payload: Record<string, string>): string {
  const path = join(TEMPLATES_ROOT, "salon", "index.html");
  if (!existsSync(path))
    return `<!DOCTYPE html><html><body>Template salon manquant</body></html>`;
  let html = readFileSync(path, "utf8");
  html = html.replace(
    '<script src="/lucide.min.js"></script>',
    '<script src="https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js"></script>'
  );
  for (const [key, value] of Object.entries(payload)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  html = html.replace(/\{\{[A-Z0-9_]+\}\}/g, "");
  return html;
}

export function mergeBoutiquePayload(
  payload: Partial<Record<string, string>>
): Record<string, string> {
  const merged: Record<string, string> = { ...boutiquePlaceholderDefaults };
  for (const [k, v] of Object.entries(payload)) {
    if (v !== undefined && v !== "") merged[k] = v;
  }
  return merged;
}

export function renderBoutiqueTemplate(
  payload: Record<string, string>
): string {
  const path = join(TEMPLATES_ROOT, "boutique", "index.html");
  if (!existsSync(path))
    return `<!DOCTYPE html><html><body>Template boutique manquant</body></html>`;
  let html = readFileSync(path, "utf8");
  for (const [key, value] of Object.entries(payload)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  html = html.replace(/\{\{[A-Z0-9_]+\}\}/g, "");
  return html;
}
