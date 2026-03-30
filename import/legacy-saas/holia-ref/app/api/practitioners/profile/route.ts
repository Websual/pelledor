import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generatePractitionerSlug, generatePractitionerSlugFromRegistration, ensureUniqueSlug } from "@/lib/slug";
import { geocodeAddress } from "@/lib/geocoding";
import { sanitizeBioHtml } from "@/lib/sanitize";


// Schema pour les URLs qui accepte les chaînes vides comme null
// Accepte les URLs absolues (http/https) et les chemins relatifs (/uploads/...)
// IMPORTANT: Ne transforme PAS undefined en null pour préserver les champs non fournis
const urlOrEmptySchema = z.preprocess(
  (val) => {
    // Si undefined, on le garde tel quel (ne pas transformer en null)
    if (val === undefined) return undefined;
    // Si chaîne vide ou null, transformer en null
    if (val === "" || val === null) return null;
    return val;
  },
  z.union([
    z.string().refine(
      (val) => {
        // Accepter les URLs absolues (http/https)
        if (val.startsWith("http://") || val.startsWith("https://")) {
          try {
            new URL(val);
            return true;
          } catch {
            return false;
          }
        }
        // Accepter les chemins relatifs (commencent par /)
        if (val.startsWith("/")) {
          return true;
        }
        return false;
      },
      { message: "URL invalide (doit être une URL absolue http/https ou un chemin relatif commençant par /)" }
    ),
    z.null(),
    z.undefined(),
  ]).optional()
);

const profileSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(200, "Le titre ne peut pas dépasser 200 caractères").optional(),
  bio: z
    .string()
    .max(5000, "La bio ne peut pas dépasser 5000 caractères")
    .refine((v) => !v || v.length === 0 || v.length >= 10, { message: "La bio doit contenir au moins 10 caractères" })
    .optional(),
  address: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().max(200, "L'adresse ne peut pas dépasser 200 caractères").nullable().optional()
  ),
  locationCity: z.string().min(1, "La ville est requise").max(100, "La ville ne peut pas dépasser 100 caractères").optional(),
  professionId: z.preprocess(
    (val) => {
      // Si undefined, retourner undefined (ne pas transformer en null)
      // Cela permet de distinguer "non fourni" de "explicitement null"
      if (val === undefined) return undefined;
      // Transformer les chaînes vides et null en null seulement si explicitement fourni
      if (val === "" || val === null) {
        return null;
      }
      return val;
    },
    z.union([
      z.string().min(1, "L'ID de catégorie est invalide"), // Accepte les CUIDs (pas UUID)
      z.null(),
    ]).optional()
  ),
  photoUrl: urlOrEmptySchema,
  coverPhotoUrl: urlOrEmptySchema,
  firstName: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().max(100).nullable().optional()
  ),
  lastName: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().max(100).nullable().optional()
  ),
  slogan: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().max(200).nullable().optional()
  ),
  accessInfo: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().max(500).nullable().optional()
  ),
  transportInfo: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().max(500).nullable().optional()
  ),
  instagramUrl: urlOrEmptySchema,
  linkedInUrl: urlOrEmptySchema,
  siret: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().max(20).nullable().optional()
  ),
  verificationDocumentUrl: urlOrEmptySchema,
  diplomaDocumentUrl: urlOrEmptySchema,
  kbisDocumentUrl: urlOrEmptySchema,
  rcpDocumentUrl: urlOrEmptySchema,
  hasRCPInsurance: z.boolean().optional(),
  acceptNewPatients: z.boolean().optional(),
  autoAcceptAppointments: z.boolean().optional(),
  treatmentKeywords: z.array(z.string()).optional(),
  phone: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().max(20, "Le numéro de téléphone ne peut pas dépasser 20 caractères").nullable().optional()
  ),
  website: urlOrEmptySchema,
  languages: z.array(z.string()).optional(),
  paymentMethods: z.array(z.string()).optional(),
  gallery: z.array(z.string()).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  acceptsGiftCards: z.boolean().optional(),
  allowDeferredPayment: z.boolean().optional(),
});

// GET: Récupérer le profil du praticien
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Trouver le praticien associé à l'utilisateur
    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
      include: {
        professions: true,
        qualifications: {
          orderBy: {
            obtained_year: "desc",
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    // Transformer les données en camelCase pour le frontend
    const transformed = {
      id: practitioner.id,
      userId: practitioner.user_id,
      title: practitioner.title,
      bio: practitioner.bio,
      address: practitioner.address,
      locationCity: practitioner.location_city,
      lat: practitioner.lat,
      lng: practitioner.lng,
      photoUrl: practitioner.photo_url,
      coverPhotoUrl: practitioner.cover_photo_url,
      professionId: practitioner.profession_id,
      categoryId: practitioner.profession_id, // Alias pour compatibilité frontend
      isVerified: practitioner.is_verified,
      ratingAvg: practitioner.rating_avg,
      firstName: practitioner.first_name,
      lastName: practitioner.last_name,
      slogan: practitioner.slogan,
      accessInfo: practitioner.access_info,
      transportInfo: practitioner.transport_info,
      instagramUrl: practitioner.instagram_url,
      linkedInUrl: practitioner.linked_in_url,
      siret: practitioner.siret,
      verificationDocumentUrl: (practitioner as any).verification_document_url,
      diplomaDocumentUrl: (practitioner as any).diploma_document_url,
      diplomaVerified: (practitioner as any).diploma_verified,
      kbisDocumentUrl: (practitioner as any).kbis_document_url,
      kbisVerified: (practitioner as any).kbis_verified,
      rcpDocumentUrl: (practitioner as any).rcp_document_url,
      rcpVerified: (practitioner as any).rcp_verified,
      hasRCPInsurance: practitioner.has_rcp_insurance,
      acceptNewPatients: practitioner.accept_new_patients,
      autoAcceptAppointments: practitioner.auto_accept_appointments,
      treatmentKeywords: practitioner.treatment_keywords || [],
      phone: practitioner.phone,
      website: practitioner.website,
      languages: practitioner.languages || [],
      paymentMethods: practitioner.paymentMethods || [],
      gallery: practitioner.gallery || [],
      slug: practitioner.slug,
      createdAt: practitioner.created_at,
      updatedAt: practitioner.updated_at,
      subscriptionStatus: practitioner.subscription_status || "free",
      stripeAccountId: practitioner.stripe_account_id,
      stripeOnboardingComplete: practitioner.stripe_onboarding_complete || false,
      acceptsGiftCards: Boolean((practitioner as any).accepts_gift_cards),
      allowDeferredPayment: Boolean((practitioner as any).allow_deferred_payment),
      profession: practitioner.professions,
      qualifications: practitioner.qualifications.map((q: any) => ({
        id: q.id,
        title: q.title,
        institution: q.institution,
        discipline: q.discipline,
        obtainedYear: q.obtained_year,
        duration: q.duration,
        description: q.description,
        certificateUrl: q.certificate_url,
        skills: q.skills || [],
        isVerified: q.is_verified || false,
      })),
      users: practitioner.users,
    };

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error fetching practitioner profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch practitioner profile" },
      { status: 500 }
    );
  }
}

// PATCH: Mettre à jour le profil du praticien
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Trouver le praticien associé à l'utilisateur
    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    
    console.log("=== PROFILE UPDATE REQUEST ===");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Received body:", JSON.stringify(body, null, 2));
    
    // Récupérer les valeurs actuelles AVANT la mise à jour pour comparaison
    const currentValues = {
      photo_url: practitioner.photo_url,
      website: practitioner.website,
      instagram_url: practitioner.instagram_url,
      linked_in_url: practitioner.linked_in_url,
      profession_id: practitioner.profession_id,
    };
    console.log("Current values in DB:", JSON.stringify(currentValues, null, 2));
    
    // Vérifier si professionId est présent dans le body original (pour éviter de le déconnecter si absent)
    const hasProfessionIdInBody = "professionId" in body || "categoryId" in body;
    
    // Transformer les chaînes vides en null (gestion supplémentaire avant validation)
    if (body.photoUrl === "") body.photoUrl = null;
    if (body.website === "") body.website = null;
    if (body.phone === "") body.phone = null;
    if (body.address === "") body.address = null;
    // Ne transformer professionId en null que s'il est explicitement présent dans le body
    if (hasProfessionIdInBody && (body.professionId === "" || body.categoryId === "")) {
      body.professionId = body.professionId || body.categoryId || null;
    }
    // Si professionId n'est pas dans le body, le retirer pour qu'il ne soit pas validé
    if (!hasProfessionIdInBody) {
      delete body.professionId;
      delete body.categoryId;
    }
    
    console.log("Body after transformation:", JSON.stringify(body, null, 2));
    console.log("Has professionId in body:", hasProfessionIdInBody);
    
    const validatedData = profileSchema.parse(body);

    // Sanitize HTML bio to prevent XSS (RichEditor output)
    if (validatedData.bio !== undefined) {
      validatedData.bio = sanitizeBioHtml(validatedData.bio);
    }

    console.log("Validated data (after schema):", JSON.stringify(validatedData, null, 2));

    // Géocoder UNIQUEMENT si l'adresse ou la ville ont réellement changé
    let geocodingResult: { lat: number; lng: number } | null = null;
    const addressChanged = validatedData.address !== undefined || validatedData.locationCity !== undefined;
    
    // Ne géocoder que si l'adresse ou la ville sont dans les données validées (ont changé)
    if (addressChanged) {
      const addressToGeocode = validatedData.address !== undefined ? validatedData.address : practitioner.address;
      const cityToGeocode = validatedData.locationCity || practitioner.location_city;
      
      // Géocoder seulement si on a au moins une ville
      if (cityToGeocode) {
        console.log(`Attempting to geocode: address="${addressToGeocode || ""}", city="${cityToGeocode}"`);
        console.log(`Reason: addressChanged=${addressChanged}, hasAddress=${!!addressToGeocode}`);
        
        geocodingResult = await geocodeAddress(addressToGeocode || "", cityToGeocode);
        if (geocodingResult) {
          console.log(`✓ Geocoding SUCCESS: ${addressToGeocode || ""}, ${cityToGeocode} -> (${geocodingResult.lat}, ${geocodingResult.lng})`);
          console.log(`  Previous coordinates: (${practitioner.lat}, ${practitioner.lng})`);
          console.log(`  New coordinates will be saved: (${geocodingResult.lat}, ${geocodingResult.lng})`);
        } else {
          console.error(`✗ Geocoding FAILED for: ${addressToGeocode || ""}, ${cityToGeocode}`);
          // Si le géocodage échoue, on garde les anciennes coordonnées
          if (practitioner.lat && practitioner.lng) {
            console.warn(`  Keeping previous coordinates: (${practitioner.lat}, ${practitioner.lng})`);
          } else {
            console.error(`  No previous coordinates available!`);
          }
        }
      } else {
        console.log(`Skipping geocoding: no city provided`);
      }
    } else {
      console.log(`Skipping geocoding: address and city unchanged`);
    }

    // Prepare update data
    const updateData: any = {
      ...(validatedData.title && { title: validatedData.title }),
      ...(validatedData.bio !== undefined && { bio: validatedData.bio }),
      ...(validatedData.address !== undefined && { address: validatedData.address || null }),
      ...(validatedData.locationCity && { location_city: validatedData.locationCity }),
      // Priorité aux coordonnées fournies directement (depuis l'autocomplete)
      // Sinon utiliser le résultat du géocodage automatique
      ...(validatedData.lat !== undefined && validatedData.lng !== undefined ? {
        lat: validatedData.lat,
        lng: validatedData.lng,
      } : geocodingResult ? {
        lat: geocodingResult.lat,
        lng: geocodingResult.lng,
      } : {}),
      ...(validatedData.photoUrl !== undefined && {
        photo_url: validatedData.photoUrl || null,
      }),
      ...(validatedData.coverPhotoUrl !== undefined && {
        cover_photo_url: validatedData.coverPhotoUrl || null,
      }),
      ...(validatedData.firstName !== undefined && {
        first_name: validatedData.firstName || null,
      }),
      ...(validatedData.lastName !== undefined && {
        last_name: validatedData.lastName || null,
      }),
      ...(validatedData.slogan !== undefined && {
        slogan: validatedData.slogan || null,
      }),
      ...(validatedData.accessInfo !== undefined && {
        access_info: validatedData.accessInfo || null,
      }),
      ...(validatedData.transportInfo !== undefined && {
        transport_info: validatedData.transportInfo || null,
      }),
      ...(validatedData.instagramUrl !== undefined && {
        instagram_url: validatedData.instagramUrl || null,
      }),
      ...(validatedData.linkedInUrl !== undefined && {
        linked_in_url: validatedData.linkedInUrl || null,
      }),
      ...(validatedData.siret !== undefined && {
        siret: validatedData.siret || null,
      }),
      ...(validatedData.verificationDocumentUrl !== undefined && {
        verification_document_url: validatedData.verificationDocumentUrl || null,
      }),
      ...(validatedData.diplomaDocumentUrl !== undefined && {
        diploma_document_url: validatedData.diplomaDocumentUrl || null,
        diploma_verified: false, // Réinitialiser le statut lors d'un changement
      }),
      ...(validatedData.kbisDocumentUrl !== undefined && {
        kbis_document_url: validatedData.kbisDocumentUrl || null,
        kbis_verified: false,
      }),
      ...(validatedData.rcpDocumentUrl !== undefined && {
        rcp_document_url: validatedData.rcpDocumentUrl || null,
        rcp_verified: false,
      }),
      ...(validatedData.hasRCPInsurance !== undefined && {
        has_rcp_insurance: validatedData.hasRCPInsurance,
      }),
      ...(validatedData.acceptNewPatients !== undefined && {
        accept_new_patients: validatedData.acceptNewPatients,
      }),
      ...(validatedData.autoAcceptAppointments !== undefined && {
        auto_accept_appointments: validatedData.autoAcceptAppointments,
      }),
      ...(validatedData.acceptsGiftCards !== undefined && {
        accepts_gift_cards: validatedData.acceptsGiftCards,
      }),
      ...(validatedData.allowDeferredPayment !== undefined && {
        allow_deferred_payment: validatedData.allowDeferredPayment,
      }),
      ...(validatedData.treatmentKeywords !== undefined && {
        treatment_keywords: validatedData.treatmentKeywords,
      }),
      ...(validatedData.phone !== undefined && {
        phone: validatedData.phone || null,
      }),
      ...(validatedData.website !== undefined && {
        website: validatedData.website || null,
      }),
      ...(validatedData.languages !== undefined && {
        languages: validatedData.languages,
      }),
      ...(validatedData.paymentMethods !== undefined && {
        paymentMethods: validatedData.paymentMethods,
      }),
      ...(validatedData.gallery !== undefined && {
        gallery: validatedData.gallery,
      }),
    };

    // Ne pas ajouter is_verified et is_active si le praticien est déjà vérifié
    // Ces champs ne doivent être modifiés que par un admin

    // Générer le slug au format prenom-nom-profession-ville si firstName, lastName, professionId, locationCity disponibles
    const slugNeedsUpdate =
      validatedData.firstName !== undefined ||
      validatedData.lastName !== undefined ||
      validatedData.professionId !== undefined ||
      validatedData.locationCity !== undefined ||
      validatedData.title !== undefined;

    if (slugNeedsUpdate) {
      const firstName = validatedData.firstName ?? practitioner.first_name ?? "";
      const lastName = validatedData.lastName ?? practitioner.last_name ?? "";
      const professionId = validatedData.professionId ?? practitioner.profession_id ?? "";
      const city = validatedData.locationCity ?? practitioner.location_city ?? "";
      const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

      let baseSlug: string;
      if (fullName && professionId && city) {
        // Format prenom-nom-profession-ville
        baseSlug = generatePractitionerSlugFromRegistration(fullName, professionId, city);
      } else {
        // Fallback : titre-ville (compatibilité)
        const title = validatedData.title ?? practitioner.title;
        baseSlug = generatePractitionerSlug(title, city || practitioner.location_city);
      }

      const existing = await prisma.practitioners.findFirst({
        where: { slug: baseSlug },
      });

      if (existing && existing.id !== practitioner.id) {
        const allSlugs = await prisma.practitioners.findMany({ select: { slug: true } });
        const existingSlugs = allSlugs.map((p) => p.slug).filter((s) => s !== practitioner.slug);
        updateData.slug = ensureUniqueSlug(baseSlug, existingSlugs);
      } else {
        updateData.slug = baseSlug;
      }
    }

    console.log("Final updateData (before category handling):", JSON.stringify(updateData, null, 2));
    
    // Toujours mettre à jour updated_at
    updateData.updated_at = new Date();
    
    // Gérer la catégorie séparément si nécessaire (utiliser la syntaxe de relation Prisma)
    // Ne modifier la profession QUE si elle était explicitement dans le body
    if (hasProfessionIdInBody) {
      if (validatedData.professionId) {
        updateData.professions = { connect: { id: validatedData.professionId } };
        console.log("Profession will be connected to:", validatedData.professionId);
      } else {
        updateData.professions = { disconnect: true };
        console.log("Category will be disconnected (explicitly set to null/empty)");
      }
    } else {
      console.log("Category NOT in updateData - will be preserved");
    }
    
    console.log("Final updateData (after category handling):", JSON.stringify(updateData, null, 2));
    console.log("Fields that will be updated:", Object.keys(updateData).join(", "));
    console.log("Fields that will be PRESERVED (not in updateData):", 
      ["photo_url", "website", "instagram_url", "linked_in_url", "category_id"]
        .filter(field => !(field in updateData || (field === "profession_id" && "professions" in updateData)))
        .join(", ")
    );
    
    // Mettre à jour le praticien
    console.log("Executing Prisma update...");
    const updatedPractitioner = await prisma.practitioners.update({
      where: { id: practitioner.id },
      data: updateData,
      include: {
        professions: true,
        qualifications: {
          orderBy: {
            obtained_year: "desc",
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Vérifier les valeurs après la mise à jour
    const afterUpdateValues = {
      photo_url: updatedPractitioner.photo_url,
      website: updatedPractitioner.website,
      instagram_url: updatedPractitioner.instagram_url,
      linked_in_url: updatedPractitioner.linked_in_url,
      profession_id: updatedPractitioner.profession_id,
    };
    console.log("Values AFTER update in DB:", JSON.stringify(afterUpdateValues, null, 2));
    
    // Comparer les valeurs AVANT et APRÈS pour détecter les pertes
    const lostFields: string[] = [];
    if (currentValues.photo_url && !afterUpdateValues.photo_url) {
      lostFields.push("photo_url");
      console.error(`⚠️ photo_url was lost: had "${currentValues.photo_url}", now "${afterUpdateValues.photo_url}"`);
    }
    if (currentValues.website && !afterUpdateValues.website) {
      lostFields.push("website");
      console.error(`⚠️ website was lost: had "${currentValues.website}", now "${afterUpdateValues.website}"`);
    }
    if (currentValues.instagram_url && !afterUpdateValues.instagram_url) {
      lostFields.push("instagram_url");
      console.error(`⚠️ instagram_url was lost: had "${currentValues.instagram_url}", now "${afterUpdateValues.instagram_url}"`);
    }
    if (currentValues.linked_in_url && !afterUpdateValues.linked_in_url) {
      lostFields.push("linked_in_url");
      console.error(`⚠️ linked_in_url was lost: had "${currentValues.linked_in_url}", now "${afterUpdateValues.linked_in_url}"`);
    }
    if (currentValues.profession_id && !afterUpdateValues.profession_id) {
      lostFields.push("profession_id");
      console.error(`⚠️ profession_id was lost: had "${currentValues.profession_id}", now "${afterUpdateValues.profession_id}"`);
    }
    
    if (lostFields.length > 0) {
      console.error("⚠️ WARNING: Fields were lost during update:", lostFields.join(", "));
      console.error("Current values before:", JSON.stringify(currentValues, null, 2));
      console.error("Values after:", JSON.stringify(afterUpdateValues, null, 2));
      console.error("updateData that was sent:", JSON.stringify(updateData, null, 2));
      console.error("⚠️ CRITICAL: Some fields were lost. This should not happen with Prisma update.");
      console.error("⚠️ This suggests that either:");
      console.error("   1. The fields were already null in the database (cache was out of sync)");
      console.error("   2. There's a bug in Prisma update logic");
      console.error("   3. The updateData accidentally set these fields to null");
    } else {
      console.log("✓ All fields preserved correctly");
    }

    // Transformer les données en camelCase pour le frontend
    const transformed = {
      id: updatedPractitioner.id,
      userId: updatedPractitioner.user_id,
      title: updatedPractitioner.title,
      bio: updatedPractitioner.bio,
      address: updatedPractitioner.address,
      locationCity: updatedPractitioner.location_city,
      lat: updatedPractitioner.lat,
      lng: updatedPractitioner.lng,
      photoUrl: updatedPractitioner.photo_url,
      coverPhotoUrl: updatedPractitioner.cover_photo_url,
      professionId: updatedPractitioner.profession_id,
      categoryId: updatedPractitioner.profession_id, // Alias pour compatibilité frontend
      isVerified: updatedPractitioner.is_verified,
      ratingAvg: updatedPractitioner.rating_avg,
      firstName: updatedPractitioner.first_name,
      lastName: updatedPractitioner.last_name,
      slogan: updatedPractitioner.slogan,
      accessInfo: updatedPractitioner.access_info,
      transportInfo: updatedPractitioner.transport_info,
      instagramUrl: updatedPractitioner.instagram_url,
      linkedInUrl: updatedPractitioner.linked_in_url,
      siret: updatedPractitioner.siret,
      verificationDocumentUrl: (updatedPractitioner as any).verification_document_url,
      diplomaDocumentUrl: (updatedPractitioner as any).diploma_document_url,
      diplomaVerified: (updatedPractitioner as any).diploma_verified,
      kbisDocumentUrl: (updatedPractitioner as any).kbis_document_url,
      kbisVerified: (updatedPractitioner as any).kbis_verified,
      rcpDocumentUrl: (updatedPractitioner as any).rcp_document_url,
      rcpVerified: (updatedPractitioner as any).rcp_verified,
      hasRCPInsurance: updatedPractitioner.has_rcp_insurance,
      acceptNewPatients: updatedPractitioner.accept_new_patients,
      autoAcceptAppointments: updatedPractitioner.auto_accept_appointments,
      acceptsGiftCards: Boolean((updatedPractitioner as any).accepts_gift_cards),
      allowDeferredPayment: Boolean((updatedPractitioner as any).allow_deferred_payment),
      treatmentKeywords: updatedPractitioner.treatment_keywords || [],
      phone: updatedPractitioner.phone,
      website: updatedPractitioner.website,
      languages: updatedPractitioner.languages || [],
      paymentMethods: updatedPractitioner.paymentMethods || [],
      gallery: updatedPractitioner.gallery || [],
      slug: updatedPractitioner.slug,
      createdAt: updatedPractitioner.created_at,
      updatedAt: updatedPractitioner.updated_at,
      subscriptionStatus: updatedPractitioner.subscription_status || "free",
      stripeAccountId: updatedPractitioner.stripe_account_id,
      stripeOnboardingComplete: updatedPractitioner.stripe_onboarding_complete || false,
      profession: updatedPractitioner.professions,
      qualifications: updatedPractitioner.qualifications.map((q: any) => ({
        id: q.id,
        title: q.title,
        institution: q.institution,
        discipline: q.discipline,
        obtainedYear: q.obtained_year,
        duration: q.duration,
        description: q.description,
        certificateUrl: q.certificate_url,
        skills: q.skills || [],
        isVerified: q.is_verified || false,
      })),
      users: updatedPractitioner.users,
    };

    console.log("Transformed response (key fields):", JSON.stringify({
      photoUrl: transformed.photoUrl,
      website: transformed.website,
      instagramUrl: transformed.instagramUrl,
      linkedInUrl: transformed.linkedInUrl,
      professionId: transformed.professionId,
    }, null, 2));
    
    // Vérifier si des champs critiques sont null alors qu'ils ne devraient pas l'être
    if (!transformed.photoUrl && currentValues.photo_url) {
      console.error("⚠️ CRITICAL: photoUrl is null in response but was not null before update!");
      console.error("   This means the value was lost. Current DB value:", afterUpdateValues.photo_url);
    }
    if (!transformed.website && currentValues.website) {
      console.error("⚠️ CRITICAL: website is null in response but was not null before update!");
      console.error("   This means the value was lost. Current DB value:", afterUpdateValues.website);
    }
    
    console.log("=== END PROFILE UPDATE ===");

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error updating practitioner profile:", error);
    if (error instanceof z.ZodError) {
      console.error("Validation errors:", JSON.stringify(error.errors, null, 2));
      return NextResponse.json(
        { 
          error: "Validation error", 
          details: error.errors,
          message: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { 
        error: "Failed to update practitioner profile", 
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

