import { prisma } from "./prisma";
import { createId } from "@paralleldrive/cuid2";


export type NotificationType =
  | "MESSAGE_RECEIVED"
  | "BOOKING_NEW"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELED"
  | "REVIEW_RECEIVED"
  | "DOCUMENT_VERIFIED"
  | "SUBSCRIPTION_ISSUE"
  | "SYSTEM_INFO"
  | "PAYMENT_RECEIVED";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  metadata?: any;
}

export async function createNotification({
  userId,
  type,
  title,
  message,
  link = null,
  metadata = null,
}: CreateNotificationParams) {
  try {
    const notification = await prisma.notifications.create({
      data: {
        id: createId(),
        user_id: userId,
        type: type as any,
        title,
        message,
        link,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
      },
    });

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    // Ne pas faire échouer l'opération principale si la notification échoue
    return null;
  }
}

// Helper pour créer une notification de nouveau RDV
export async function notifyNewBooking({
  practitionerUserId,
  clientName,
  appointmentId,
  serviceName,
  startsAt,
}: {
  practitionerUserId: string;
  clientName: string;
  appointmentId: string;
  serviceName: string;
  startsAt: Date;
}) {
  return createNotification({
    userId: practitionerUserId,
    type: "BOOKING_NEW",
    title: "Nouvelle réservation",
    message: `${clientName} a réservé une séance "${serviceName}" pour le ${new Date(startsAt).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}.`,
    link: `/pro/appointments/${appointmentId}`,
    metadata: {
      appointmentId,
      serviceName,
      startsAt: startsAt.toISOString(),
    },
  });
}

// Helper pour créer une notification de confirmation de RDV
export async function notifyBookingConfirmed({
  clientUserId,
  practitionerName,
  appointmentId,
  serviceName,
  startsAt,
}: {
  clientUserId: string;
  practitionerName: string;
  appointmentId: string;
  serviceName: string;
  startsAt: Date;
}) {
  return createNotification({
    userId: clientUserId,
    type: "BOOKING_CONFIRMED",
    title: "Rendez-vous confirmé",
    message: `Votre séance "${serviceName}" avec ${practitionerName} est confirmée pour le ${new Date(startsAt).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}.`,
    link: `/account/appointments`,
    metadata: {
      appointmentId,
      practitionerName,
      serviceName,
      startsAt: startsAt.toISOString(),
    },
  });
}

// Helper pour créer une notification d'annulation
export async function notifyBookingCanceled({
  userId,
  isPractitioner,
  otherPartyName,
  appointmentId,
  serviceName,
  startsAt,
  clientName,
}: {
  userId: string;
  isPractitioner: boolean;
  otherPartyName: string;
  appointmentId: string;
  serviceName: string;
  startsAt: Date;
  clientName?: string;
}) {
  const whoCanceled = isPractitioner ? "Le praticien" : "Le patient";
  return createNotification({
    userId,
    type: "BOOKING_CANCELED",
    title: "Rendez-vous annulé",
    message: `${whoCanceled} ${otherPartyName} a annulé le rendez-vous "${serviceName}" prévu le ${new Date(startsAt).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}.`,
    link: isPractitioner ? `/pro/appointments/${appointmentId}` : `/account/appointments`,
    metadata: {
      appointmentId,
      otherPartyName,
      serviceName,
      startsAt: startsAt.toISOString(),
      clientName: clientName || otherPartyName,
    },
  });
}

// Helper pour créer une notification de nouveau message
// recipientRole: rôle du destinataire (CLIENT = patient, PRACTITIONER = praticien)
// senderId: userId de l'expéditeur (l'autre personne dans la conversation)
export async function notifyMessageReceived({
  recipientUserId,
  recipientRole,
  senderId,
  senderName,
  appointmentId,
  messagePreview,
}: {
  recipientUserId: string;
  recipientRole: "CLIENT" | "PRACTITIONER";
  senderId: string;
  senderName: string;
  appointmentId: string;
  messagePreview?: string;
}) {
  const basePath = recipientRole === "CLIENT" ? "/account/messages" : "/pro/messages";
  const link = `${basePath}?chat=${encodeURIComponent(senderId)}`;
  return createNotification({
    userId: recipientUserId,
    type: "MESSAGE_RECEIVED",
    title: `Nouveau message de ${senderName}`,
    message: messagePreview || `${senderName} vous a envoyé un message.`,
    link,
    metadata: {
      appointmentId,
      senderId,
      senderName,
    },
  });
}

// Helper pour créer une notification de nouvel avis
export async function notifyReviewReceived({
  practitionerUserId,
  clientName,
  rating,
  reviewId,
}: {
  practitionerUserId: string;
  clientName: string;
  rating: number;
  reviewId: string;
}) {
  return createNotification({
    userId: practitionerUserId,
    type: "REVIEW_RECEIVED",
    title: "Nouvel avis reçu",
    message: `${clientName} vous a laissé un avis ${rating} étoile${rating > 1 ? "s" : ""}.`,
    link: `/pro/reviews`,
    metadata: {
      reviewId,
      clientName,
      rating,
    },
  });
}

// Helper pour créer une notification de paiement reçu
export async function notifyPaymentReceived({
  practitionerUserId,
  clientName,
  amountCents,
  appointmentId,
  serviceName,
}: {
  practitionerUserId: string;
  clientName: string;
  amountCents: number;
  appointmentId: string;
  serviceName?: string;
}) {
  const amount = (amountCents / 100).toFixed(2);
  return createNotification({
    userId: practitionerUserId,
    type: "PAYMENT_RECEIVED",
    title: "Paiement reçu",
    message: `Paiement de ${amount}€ validé pour la séance avec ${clientName}.`,
    link: `/pro/appointments/${appointmentId}`,
    metadata: {
      appointmentId,
      clientName,
      amountCents,
      serviceName: serviceName || null,
    },
  });
}

// Helper pour créer une notification de validation de document
export async function notifyDocumentVerified({
  practitionerUserId,
  qualificationTitle,
}: {
  practitionerUserId: string;
  qualificationTitle: string;
}) {
  return createNotification({
    userId: practitionerUserId,
    type: "DOCUMENT_VERIFIED",
    title: "Diplôme validé",
    message: `Votre diplôme "${qualificationTitle}" a été validé par l'équipe Holia. Votre profil est maintenant certifié.`,
    link: `/pro/profile`,
    metadata: {
      qualificationTitle,
    },
  });
}

// Helper pour créer une notification de problème d'abonnement
export async function notifySubscriptionIssue({
  practitionerUserId,
  reason,
}: {
  practitionerUserId: string;
  reason: string;
}) {
  return createNotification({
    userId: practitionerUserId,
    type: "SUBSCRIPTION_ISSUE",
    title: "Problème d'abonnement",
    message: `Votre abonnement Premium rencontre un problème : ${reason}. Veuillez mettre à jour votre moyen de paiement.`,
    link: `/pro/settings`,
    metadata: {
      reason,
    },
  });
}

