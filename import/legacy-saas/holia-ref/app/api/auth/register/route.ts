import { NextRequest, NextResponse } from "next/server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createId } from "@paralleldrive/cuid2";
import {
  generatePractitionerSlugFromRegistration,
  ensureUniqueSlug,
} from "@/lib/slug";


const registerSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  role: z.enum(["USER", "PRACTITIONER"]).default("PRACTITIONER"),
  profession: z.string().optional(), // ID de profession ou nom libre pour "Autre"
  claimId: z.string().optional(), // ID du praticien à réclamer
  acceptCharter: z.boolean().optional(), // Engagement charte déontologique (requis pour praticiens)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Validation AVANT toute création : éviter un user sans praticien en cas d'erreur
    if (validatedData.role === "PRACTITIONER") {
      if (!validatedData.acceptCharter) {
        return NextResponse.json(
          { error: "Vous devez vous engager à respecter la charte déontologique Holia" },
          { status: 400 }
        );
      }
      if (!validatedData.claimId && !validatedData.profession) {
        return NextResponse.json(
          { error: "La profession est requise pour les praticiens" },
          { status: 400 }
        );
      }
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.users.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Un utilisateur avec cet email existe déjà" },
        { status: 409 }
      );
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    const charterAcceptedAt = new Date();

    // Transaction : user + praticien créés ensemble, rollback si erreur
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.users.create({
        data: {
          id: createId(),
          name: validatedData.name,
          email: validatedData.email,
          hashed_password: hashedPassword,
          role: validatedData.role as any,
          updated_at: new Date(),
        } as any,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      if (validatedData.role === "PRACTITIONER") {
        if (validatedData.claimId) {
          const existingPractitioner = await tx.practitioners.findUnique({
            where: { id: validatedData.claimId },
          });
          if (!existingPractitioner) {
            throw new Error("Praticien introuvable pour la réclamation");
          }
          if (existingPractitioner.is_claimed) {
            throw new Error("Ce profil a déjà été réclamé");
          }
          let updateData: {
            user_id: string;
            is_claimed: boolean;
            is_verified: boolean;
            is_active: boolean;
            charter_accepted_at: Date;
            updated_at: Date;
            profession_id?: string | null;
            slug?: string;
          } = {
            user_id: newUser.id,
            is_claimed: true,
            is_verified: false,
            is_active: true,
            charter_accepted_at: charterAcceptedAt,
            updated_at: new Date(),
          };
          if (validatedData.profession) {
            const profession = await tx.professions.findFirst({
              where: {
                OR: [
                  { id: validatedData.profession },
                  { slug: validatedData.profession },
                ],
              },
            });
            if (profession) {
              updateData.profession_id = profession.id;
              const baseSlug = generatePractitionerSlugFromRegistration(
                existingPractitioner.title,
                profession.slug,
                existingPractitioner.location_city
              );
              const existingSlugs = (
                await tx.practitioners.findMany({ select: { slug: true } })
              )
                .map((p) => p.slug)
                .filter((s) => s !== existingPractitioner.slug);
              updateData.slug = ensureUniqueSlug(baseSlug, existingSlugs);
            }
          }
          await tx.practitioners.update({
            where: { id: validatedData.claimId },
            data: updateData as any,
          });
        } else {
          let professionId: string | null = null;
          let professionSlugForSlug = "metier";
          if (validatedData.profession) {
            const profession = await tx.professions.findFirst({
              where: {
                OR: [
                  { id: validatedData.profession },
                  { slug: validatedData.profession },
                ],
              },
            });
            if (profession) {
              professionId = profession.id;
              professionSlugForSlug = profession.slug;
            } else {
              // Profession non trouvée en BDD (ex. id externe / invalide) → ne pas l'injecter dans le slug
              professionSlugForSlug = "praticien";
              professionId = null;
            }
          }
          const baseSlug = generatePractitionerSlugFromRegistration(
            validatedData.name,
            professionSlugForSlug,
            "ville"
          );
          const existingSlugs = (
            await tx.practitioners.findMany({ select: { slug: true } })
          ).map((p) => p.slug);
          const slug = ensureUniqueSlug(baseSlug, existingSlugs);

          await tx.practitioners.create({
            data: {
              id: createId(),
              user_id: newUser.id,
              title: validatedData.name,
              bio: "Profil en cours de configuration",
              location_city: "Ville",
              slug: slug,
              profession_id: professionId,
              is_verified: false,
              is_active: true,
              is_claimed: true,
              charter_accepted_at: charterAcceptedAt,
              updated_at: new Date(),
            } as any,
          });
        }
      }

      return newUser;
    });

    return NextResponse.json({
      message: "Utilisateur créé avec succès",
      user,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: error.errors,
        },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      if (error.message === "Praticien introuvable pour la réclamation") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === "Ce profil a déjà été réclamé") {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error("Erreur lors de l'inscription:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}