import { NextRequest, NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { prisma } from "@/lib/prisma";
import { geocodeAddress } from "@/lib/geocoding";
import { generatePractitionerSlugFromRegistration, ensureUniqueSlug } from "@/lib/slug";

/**
 * Import des données détectées par l'extension Chrome "Holia Scouter".
 * Protégé par l'en-tête X-Holia-Admin-Key (HOLIA_ADMIN_KEY dans .env).
 *
 * Body : Nom, Ville, Email, SIRET, Site Web, Adresse, Téléphone, Réseaux sociaux.
 * - Si SIRET existe et fiche non réclamée → mise à jour (email, instagram, etc.).
 * - Si SIRET existe et is_claimed = true → aucune mise à jour (profil praticien).
 * - Si SIRET absent → création avec source_url 'SCOUTER'.
 * - Géocodage automatique si adresse ou ville fournie.
 */
const ADMIN_KEY_HEADER = "x-holia-admin-key";

function first<T>(v: T | T[] | undefined): T | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function firstStr(v: string | string[] | undefined): string | undefined {
  const s = first(v);
  return typeof s === "string" && s.trim() ? s.trim() : undefined;
}

function normalizeSiret(v: string | string[] | undefined): string | undefined {
  const raw = firstStr(v);
  if (!raw) return undefined;
  const digits = raw.replace(/\s/g, "").replace(/\./g, "");
  return digits.length === 14 && /^\d+$/.test(digits) ? digits : undefined;
}

export async function POST(request: NextRequest) {
  const key = request.headers.get(ADMIN_KEY_HEADER)?.trim();
  const expected = process.env.HOLIA_ADMIN_KEY?.trim();

  if (!expected) {
    return NextResponse.json(
      { error: "Import scouter non configuré (HOLIA_ADMIN_KEY manquant)" },
      { status: 500 }
    );
  }

  if (!key || key !== expected) {
    return NextResponse.json({ error: "Clé admin invalide" }, { status: 401 });
  }

  let body: {
    url?: string;
    title?: string;
    name?: string;
    profession?: string;
    all_professions?: string[];
    city?: string;
    address?: string;
    siret?: string | string[];
    email?: string | string[];
    phone?: string | string[];
    website?: string | string[];
    social?: { instagram?: string[]; facebook?: string[]; linkedin?: string[] };
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const name = firstStr(body.name) ?? firstStr(body.title) ?? "";
  const profession = firstStr(body.profession) ?? "";
  const allProfessionsRaw = body.all_professions;
  const all_professions = Array.isArray(allProfessionsRaw)
    ? allProfessionsRaw.map((p) => (p && typeof p === "string" ? p.trim() : "")).filter(Boolean)
    : [];
  const city = firstStr(body.city) ?? "France";
  const addressRaw = firstStr(body.address);
  // Adresse complète type INSEE : "adresse, ville" pour cohérence avec les imports INSEE
  const address =
    addressRaw && city
      ? `${addressRaw}, ${city}`.trim()
      : addressRaw ?? undefined;
  const siret = normalizeSiret(body.siret);
  const email = firstStr(body.email) ?? (Array.isArray(body.email) ? body.email.map((e) => (e && typeof e === "string" ? e.trim() : "")).find(Boolean) : undefined);
  const phone = firstStr(body.phone);
  const website = firstStr(body.website) ?? (body.url && typeof body.url === "string" ? body.url.trim() : undefined);
  const social = body.social ?? {};
  const instagram = Array.isArray(social.instagram) ? social.instagram[0]?.trim() : undefined;
  const facebook = Array.isArray(social.facebook) ? social.facebook[0]?.trim() : undefined;
  const linkedin = Array.isArray(social.linkedin) ? social.linkedin[0]?.trim() : undefined;

  if (!name) {
    return NextResponse.json({ error: "Le nom (name ou title) est requis" }, { status: 400 });
  }

  let lat: number | null = null;
  let lng: number | null = null;
  if (addressRaw || city) {
    const coords = await geocodeAddress(addressRaw ?? "", city);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
    }
  }

  const now = new Date();

  if (siret) {
    const existing = await prisma.practitioners.findFirst({
      where: { siret },
    });

    if (existing) {
      if (existing.is_claimed) {
        return NextResponse.json({
          success: true,
          ok: true,
          action: "skipped_claimed",
          id: existing.id,
          slug: existing.slug,
          message:
            "Fiche non modifiée : profil déjà réclamé par un praticien (is_claimed). Aucun écrasement des données.",
        });
      }

      const updateData: Record<string, unknown> = {
        updated_at: now,
      };
      if (email != null && email !== "") updateData.contact_email = email;
      if (phone != null && phone !== "") updateData.phone = phone;
      if (website != null && website !== "") updateData.website = website;
      if (address != null && address !== "") updateData.address = address;
      if (lat != null) updateData.lat = lat;
      if (lng != null) updateData.lng = lng;
      if (instagram != null && instagram !== "") updateData.instagram_url = instagram;
      if (linkedin != null && linkedin !== "") updateData.linked_in_url = linkedin;
      if (city !== "France" && city !== existing.location_city) updateData.location_city = city;
      if (name !== existing.title) updateData.title = name;
      if (all_professions.length > 0) updateData.all_professions = all_professions;

      await prisma.practitioners.update({
        where: { id: existing.id },
        data: updateData as Parameters<typeof prisma.practitioners.update>[0]["data"],
      });

      return NextResponse.json({
        success: true,
        slug: existing.slug,
        ok: true,
        action: "updated",
        id: existing.id,
        message: "Fiche mise à jour (SIRET existant)",
      });
    }
  }

  const existingSlugs = (await prisma.practitioners.findMany({ select: { slug: true } })).map((p) => p.slug);
  const slugBase = generatePractitionerSlugFromRegistration(
    name,
    profession || "praticien",
    city
  );
  const slug = ensureUniqueSlug(slugBase, existingSlugs);

  const newPractitioner = await prisma.practitioners.create({
    data: {
      id: createId(),
      title: name,
      bio: "",
      location_city: city,
      lat: lat ?? undefined,
      lng: lng ?? undefined,
      address: address ?? undefined,
      phone: phone ?? undefined,
      website: website ?? undefined,
      instagram_url: instagram ?? undefined,
      linked_in_url: linkedin ?? undefined,
      siret: siret ?? undefined,
      contact_email: email ?? undefined,
      source_url: "SCOUTER",
      slug,
      updated_at: now,
      is_claimed: false,
      is_active: true,
      all_professions: all_professions.length > 0 ? all_professions : undefined,
    },
  });

  return NextResponse.json({
    success: true,
    slug: newPractitioner.slug,
    ok: true,
    action: "created",
    id: newPractitioner.id,
    message: "Fiche créée (source SCOUTER)",
  });
}
