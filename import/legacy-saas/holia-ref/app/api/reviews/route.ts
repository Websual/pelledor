import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reviewSchema } from "@/lib/validations";
import { notifyReviewReceived } from "@/lib/notifications";
import { createId } from "@paralleldrive/cuid2";

// Liste enrichie de mots à détecter (insultes, vulgarités et termes suspects)
const PROFANITY_WORDS = [
  // Insultes directes
  "con", "connard", "connasse", "salope", "pute", "putain", "bordel", "enculé", "enculer", "enfoiré", "enfoirée",
  "fdp", "tg", "ntm", "nique", "niquer", "merde", "merdique", "pd", 
  
  // Insultes et termes dégradants
  "idiot", "idiote", "debile", "débile", "stupide", "nul", "nulle", "nulles", "pourri", "pourrie", "naze",
  "crétin", "crétine", "abruti", "abrutie", "imbécile", "taré", "tarée", "cinglé", "cinglée",
  "dingue", "dingo", "fou", "folle", "malade", "malade mental",
  
  // Termes agressifs et vulgaires
  "va te faire", "va te faire foutre", "va te faire voir", "casse toi", "dégage", "dégagez",
  "ta gueule", "ferme ta gueule", "ferme la", "t'as qu'à", "t'as qu'à crever",
  
  // Termes suspects pour modération (spam, arnaque, etc.)
  "arnaque", "arnaqueur", "arnaqueuse", "escroc", "escroquerie", "fraude", "fraudeur",
  "spam", "spammer", "pub", "publicité", "promo", "promotion", "lien", "site web", "www", "http",
  
  // Termes très négatifs
  "horrible", "horriblement", "dégueulasse", "dégueulas", "dégoûtant", "dégoûtante",
  "catastrophe", "catastrophique", "désastre", "désastreux", "désastreuse",
  "incompétent", "incompétente", "incompétence", "inutile", "inutiles",
  
  // Termes de haine ou discrimination
  "haine", "haïr", "déteste", "détester", "exècre", "exécrer", "wallah",
  
  // Abréviations vulgaires
  "ptdr", "mdr" // Peuvent être utilisés de manière agressive dans certains contextes
];

// Fonction helper pour recalculer la moyenne d'un praticien
async function recalculatePractitionerRating(practitionerId: string) {
  // Récupérer uniquement les avis visibles (non masqués et non en attente de modération)
  const visibleReviews = await prisma.reviews.findMany({
    where: {
      practitioner_id: practitionerId,
      is_hidden: false,
      needs_review: false, // Exclure les avis en attente de modération
    } as any,
  });

  // Calculer la nouvelle moyenne
  const avgRating =
    visibleReviews.length > 0
      ? visibleReviews.reduce((sum, r) => sum + r.rating, 0) / visibleReviews.length
      : 0;

  // Mettre à jour la moyenne du praticien
  await prisma.practitioners.update({
    where: { id: practitionerId },
    data: { rating_avg: avgRating },
  });
}

// Fonction de détection améliorée
function needsReviewCheck(comment: string | null | undefined, rating: number): boolean {
  if (!comment) return false;
  
  // Normaliser le commentaire : enlever la ponctuation pour la détection de mots
  const commentNormalized = comment.toLowerCase().trim();
  // Remplacer la ponctuation par des espaces pour mieux séparer les mots
  const commentForWordCount = commentNormalized.replace(/[.,!?;:()\[\]{}'"]/g, ' ');
  
  // Vérifier la longueur (moins de 5 mots)
  const wordCount = commentForWordCount.split(/\s+/).filter(word => word.length > 0).length;
  if (wordCount < 5) {
    console.log(`[Review Check] Flagged: Short comment (${wordCount} words < 5)`);
    return true;
  }
  
  // Vérifier les insultes avec détection améliorée
  // On cherche le mot entier ou comme partie d'un mot (pour détecter "pute" dans "pute!" ou "putes")
  for (const word of PROFANITY_WORDS) {
    // Simple includes devrait fonctionner pour "pute" dans "grosse pute!"
    if (commentNormalized.includes(word)) {
      console.log(`[Review Check] Flagged: Profanity detected ("${word}")`);
      return true;
    }
  }
  
  // Vérifier les notes très basses avec commentaires courts ou agressifs
  if (rating <= 2 && wordCount < 10) {
    console.log(`[Review Check] Flagged: Low rating (${rating}) with short comment (${wordCount} words)`);
    return true;
  }
  
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = reviewSchema.parse(body);

    let practitionerId: string;
    let practitionerUserId: string | null = null;

    // Si un appointmentId est fourni, vérifier le rendez-vous
    if (validatedData.appointmentId) {
      const appointment = await prisma.appointments.findFirst({
        where: { id: validatedData.appointmentId },
        include: {
          practitioners: {
            select: {
              id: true,
              user_id: true,
            },
          },
        },
      });

      if (!appointment) {
        return NextResponse.json(
          { error: "Appointment not found" },
          { status: 404 }
        );
      }

      if (appointment.user_id !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (appointment.status !== "DONE") {
        return NextResponse.json(
          { error: "Appointment must be completed before reviewing" },
          { status: 400 }
        );
      }

      // Check if review already exists for this appointment
      const existingReview = await prisma.reviews.findFirst({
        where: { appointment_id: validatedData.appointmentId },
      });

      if (existingReview) {
        return NextResponse.json(
          { error: "Review already exists for this appointment" },
          { status: 400 }
        );
      }

      practitionerId = appointment.practitioner_id;
      practitionerUserId = appointment.practitioners.user_id;
    } else {
      // Pas de rendez-vous - utiliser practitionerId directement
      if (!validatedData.practitionerId) {
        return NextResponse.json(
          { error: "Practitioner ID is required when no appointment is provided" },
          { status: 400 }
        );
      }

      // Vérifier que le praticien existe
      const practitioner = await prisma.practitioners.findFirst({
        where: { id: validatedData.practitionerId },
        select: {
          id: true,
          user_id: true,
        },
      });

      if (!practitioner) {
        return NextResponse.json(
          { error: "Practitioner not found" },
          { status: 404 }
        );
      }

      practitionerId = practitioner.id;
      practitionerUserId = practitioner.user_id;

      // Vérifier qu'il n'y a pas déjà un avis sans rendez-vous de cet utilisateur pour ce praticien
      const existingReview = await prisma.reviews.findFirst({
        where: {
          practitioner_id: practitionerId,
          user_id: session.user.id,
          appointment_id: {
            equals: null,
          },
        },
      });

      if (existingReview) {
        return NextResponse.json(
          { error: "Vous avez déjà laissé un avis pour ce praticien sans rendez-vous spécifique" },
          { status: 400 }
        );
      }
    }

    // Vérifier si l'avis nécessite une modération
    const needsReview = needsReviewCheck(validatedData.comment, validatedData.rating);
    
    // Debug log pour vérifier la détection
    if (validatedData.comment) {
      console.log(`[Review Check] Comment: "${validatedData.comment}", Rating: ${validatedData.rating}, Needs Review: ${needsReview}`);
    }

    const review = await prisma.reviews.create({
      data: {
        id: createId(),
        appointment_id: validatedData.appointmentId || null,
        user_id: session.user.id,
        practitioner_id: practitionerId,
        rating: validatedData.rating,
        comment: validatedData.comment,
        needs_review: needsReview,
        updated_at: new Date(),
      } as any,
    });

    // Créer une notification pour le praticien
    if (practitionerUserId) {
      try {
        const clientName = session.user.name || session.user.email || "Un client";
        await notifyReviewReceived({
          practitionerUserId: practitionerUserId,
          clientName,
          rating: validatedData.rating,
          reviewId: review.id,
        });
      } catch (error) {
        console.error("Error creating review notification:", error);
        // Ne pas faire échouer la création de l'avis si la notification échoue
      }
    }

    // Recalculer la moyenne du praticien
    await recalculatePractitionerRating(practitionerId);

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error("Error creating review:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}

