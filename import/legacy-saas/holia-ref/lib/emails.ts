import nodemailer from "nodemailer";
import { Resend } from "resend";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { createLog } from "@/lib/log";

// Configuration du transport SMTP
const getTransporter = () => {
  // Si SMTP_HOST est défini, utiliser la configuration SMTP personnalisée
  if (process.env.SMTP_HOST) {
    const port = parseInt(process.env.SMTP_PORT || "587");
    const secure = process.env.SMTP_SECURE === "true"; // true pour 465, false pour autres ports
    
    // Nettoyer les valeurs : retirer les guillemets et espaces si présents
    const cleanEnvValue = (value: string | undefined): string | undefined => {
      if (!value) return undefined;
      return value.trim().replace(/^["']|["']$/g, '');
    };
    
    const smtpUser = cleanEnvValue(process.env.SMTP_USER);
    const smtpPass = cleanEnvValue(process.env.SMTP_PASS);
    
    // Debug: vérifier que les variables sont bien chargées (sans afficher le mot de passe complet)
    if (process.env.NODE_ENV === "development") {
      console.log("[SMTP Config] Host:", process.env.SMTP_HOST);
      console.log("[SMTP Config] Port:", port);
      console.log("[SMTP Config] Secure:", secure);
      console.log("[SMTP Config] User:", smtpUser);
      console.log("[SMTP Config] Pass length:", smtpPass?.length || 0);
      console.log("[SMTP Config] Pass first char:", smtpPass?.[0] || "none");
      console.log("[SMTP Config] Pass last char:", smtpPass?.[smtpPass?.length - 1] || "none");
    }
    
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: port,
      secure: secure, // SSL pour le port 465
      requireTLS: !secure && process.env.SMTP_REQUIRE_TLS !== "false", // STARTTLS pour port 587
      auth: smtpUser && smtpPass
        ? {
            user: smtpUser,
            pass: smtpPass,
          }
        : undefined,
      tls: {
        // Ne pas rejeter les certificats non autorisés (utile pour les serveurs auto-signés)
        rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false",
      },
      debug: process.env.NODE_ENV === "development", // Activer les logs en développement
      logger: process.env.NODE_ENV === "development", // Logger les opérations
    });
  }

  // Sinon, utiliser Gmail si SMTP_USER et SMTP_PASS sont définis
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Si rien n'est configuré, essayer un serveur SMTP local (pour développement)
  // Cela nécessite un serveur mail configuré sur le serveur
  // Désactiver TLS pour les connexions locales à Postfix
  return nodemailer.createTransport({
    host: "localhost",
    port: 25,
    secure: false,
    requireTLS: false,
    ignoreTLS: true,
    tls: {
      rejectUnauthorized: false,
    },
  });
};

const transporter = getTransporter();

// Initialiser Resend si la clé API est disponible
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Vérifier si l'envoi d'email est configuré
const isEmailConfigured = () => {
  return !!(
    process.env.SMTP_HOST ||
    (process.env.SMTP_USER && process.env.SMTP_PASS) ||
    process.env.RESEND_API_KEY
  );
};

const getFromEmail = () => {
  return process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM_EMAIL || "noreply@holia.me";
};

const getFromName = () => {
  return process.env.SMTP_FROM_NAME || "Holia";
};

// Template de base pour tous les emails Holia
const getEmailTemplate = (content: string) => {
  const headerImageUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3005"}/images/mail-header.png`;
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Holia</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f7f7f7;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f7f7f7; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <!-- Header avec image -->
                <tr>
                  <td style="padding: 0; text-align: center; background-color: #ffffff;">
                    <img src="${headerImageUrl}" alt="Holia" style="width: 100%; max-width: 600px; height: auto; display: block;" />
                  </td>
                </tr>
                <!-- Espacement entre header et contenu -->
                <tr>
                  <td style="padding: 0; height: 40px; background-color: #ffffff;"></td>
                </tr>
                <!-- Contenu -->
                <tr>
                  <td style="padding: 0 40px 40px;">
                    ${content}
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; background-color: #f7f7f7; border-top: 1px solid #e5e5e5; text-align: center;">
                    <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                      À bientôt sur <strong style="color: #9bb49b;">Holia</strong>
                    </p>
                    <p style="margin: 10px 0 0; color: #999; font-size: 12px;">
                      L'équipe Holia
                    </p>
                    <p style="margin: 20px 0 0; color: #999; font-size: 11px; line-height: 1.5;">
                      Holia - Service de mise en relation bien-être. Vous recevez ce mail suite à votre réservation.
                    </p>
                    <p style="margin: 8px 0 0; color: #999; font-size: 11px;">
                      <a href="${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3005"}/cgu" style="color: #9bb49b; text-decoration: underline;">Conditions générales d'utilisation</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

// Helper pour créer un bouton stylisé
const getButtonHtml = (text: string, url: string, variant: "primary" | "secondary" = "primary") => {
  const bgColor = variant === "primary" ? "#9bb49b" : "#ffffff";
  const textColor = variant === "primary" ? "#ffffff" : "#9bb49b";
  const border = variant === "secondary" ? "2px solid #9bb49b" : "none";
  
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0;">
      <tr>
        <td align="center" style="padding: 0;">
          <a href="${url}" style="display: inline-block; padding: 14px 32px; background-color: ${bgColor}; color: ${textColor}; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; border: ${border}; text-align: center;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
};

// Helper pour créer une carte d'information
const getCardHtml = (content: string, bgColor: string = "#ffffff") => {
  return `
    <div style="background-color: ${bgColor}; padding: 24px; border-radius: 24px; margin: 24px 0; border: 1px solid #e5e5e5;">
      ${content}
    </div>
  `;
};

interface BookingConfirmationEmailProps {
  userName: string;
  practitionerName: string;
  serviceName: string;
  startsAt: Date;
  userEmail: string;
  cancelUrl: string;
  locationChoice?: "PRESENTIAL" | "VIDEO" | null;
  videoLink?: string | null;
}

export async function sendBookingConfirmationEmail({
  userName,
  practitionerName,
  serviceName,
  startsAt,
  userEmail,
  cancelUrl,
  locationChoice,
  videoLink,
}: BookingConfirmationEmailProps) {
  if (!isEmailConfigured()) {
    console.warn("SMTP not configured, skipping email send. Configure SMTP_HOST and SMTP_PORT or SMTP_USER and SMTP_PASS");
    return;
  }

  try {
    const formattedDate = format(startsAt, "EEEE d MMMM yyyy 'à' HH:mm", {
      locale: fr,
    });

    // Déterminer le texte du type de séance
    let locationText = "";
    if (locationChoice === "PRESENTIAL") {
      locationText = "📍 Au cabinet";
    } else if (locationChoice === "VIDEO") {
      locationText = "💻 En vidéo";
    }

    const content = `
      <h1 style="color: #2f2f2f; font-family: Inter, Arial, sans-serif; font-size: 28px; font-weight: 700; margin: 0 0 32px; line-height: 1.2;">
        Confirmation de votre rendez-vous
      </h1>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Bonjour ${userName},
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
        Votre rendez-vous a été confirmé avec succès !
      </p>
      
      ${getCardHtml(`
        <h2 style="color: #2f2f2f; font-family: Inter, Arial, sans-serif; font-size: 20px; font-weight: 600; margin: 0 0 16px;">
          Détails du rendez-vous
        </h2>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px; width: 140px;"><strong style="color: #333;">Praticien :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${practitionerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px;"><strong style="color: #333;">Service :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${serviceName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px;"><strong style="color: #333;">Date et heure :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${formattedDate}</td>
          </tr>
          ${locationText ? `
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px;"><strong style="color: #333;">Type de séance :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${locationText}</td>
          </tr>
          ` : ""}
        </table>
      `)}
      
      ${locationChoice === "VIDEO" && videoLink ? getCardHtml(`
        <h2 style="color: #2f2f2f; font-family: Inter, Arial, sans-serif; font-size: 18px; font-weight: 600; margin: 0 0 12px;">
          Lien de visioconférence
        </h2>
        <p style="margin: 0 0 16px; color: #333; font-size: 15px; line-height: 1.6;">
          Pour rejoindre votre séance en visioconférence, cliquez sur le lien ci-dessous :
        </p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 16px 0;">
          <tr>
            <td align="center" style="padding: 0;">
              <a href="${videoLink}" style="display: inline-block; padding: 12px 24px; background-color: #9bb49b; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px; text-align: center;">
                Rejoindre la visioconférence
              </a>
            </td>
          </tr>
        </table>
        <p style="margin: 16px 0 0; color: #666; font-size: 13px; line-height: 1.5;">
          <strong>Note :</strong> Ce lien est valable pour votre séance. Assurez-vous d'avoir une connexion internet stable et un environnement calme.
        </p>
      `, "#f9f9f9") : ""}
      
      ${getButtonHtml("Annuler ou modifier ce rendez-vous", cancelUrl)}
    `;

    const htmlContent = getEmailTemplate(content);

    await transporter.sendMail({
      from: `"${getFromName()}" <${getFromEmail()}>`,
      to: userEmail,
      subject: `Confirmation de votre rendez-vous avec ${practitionerName}`,
      html: htmlContent,
    });
    await createLog("INFO", "Email envoyé: confirmation rendez-vous patient", {
      to: userEmail,
      subject: `Confirmation de votre rendez-vous avec ${practitionerName}`,
      type: "booking_confirmation",
    });
  } catch (error) {
    await createLog("ERROR", "Échec envoi email: confirmation rendez-vous patient", {
      to: userEmail,
      error: String(error),
      type: "booking_confirmation",
    });
    console.error("Error sending booking confirmation email:", error);
    throw error;
  }
}

interface AppointmentReminderEmailProps {
  userName: string;
  practitionerName: string;
  serviceName: string;
  startsAt: Date;
  userEmail: string;
  cancelUrl: string;
}

export async function sendAppointmentReminderEmail({
  userName,
  practitionerName,
  serviceName,
  startsAt,
  userEmail,
  cancelUrl,
}: AppointmentReminderEmailProps) {
  if (!isEmailConfigured()) {
    console.warn("Email not configured, skipping email send. Configure RESEND_API_KEY or SMTP settings");
    return;
  }

  try {
    const formattedDate = format(startsAt, "EEEE d MMMM yyyy 'à' HH:mm", {
      locale: fr,
    });

    const content = `
      <h1 style="color: #2f2f2f; font-family: Inter, Arial, sans-serif; font-size: 28px; font-weight: 700; margin: 0 0 32px; line-height: 1.2;">
        Rappel de votre rendez-vous
      </h1>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Bonjour ${userName},
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
        Nous vous rappelons que vous avez un rendez-vous prévu dans les prochaines 24 heures.
      </p>
      
      ${getCardHtml(`
        <h2 style="color: #2f2f2f; font-family: Inter, Arial, sans-serif; font-size: 20px; font-weight: 600; margin: 0 0 16px;">
          Détails du rendez-vous
        </h2>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px; width: 140px;"><strong style="color: #333;">Praticien :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${practitionerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px;"><strong style="color: #333;">Service :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${serviceName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px;"><strong style="color: #333;">Date et heure :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${formattedDate}</td>
          </tr>
        </table>
      `)}
      
      ${getButtonHtml("Annuler ou modifier ce rendez-vous", cancelUrl)}
      
      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
        À bientôt sur Holia !
      </p>
    `;

    const htmlContent = getEmailTemplate(content);

    if (resend) {
      await resend.emails.send({
        from: `${getFromName()} <${getFromEmail()}>`,
        to: userEmail,
        subject: `Rappel : Votre rendez-vous avec ${practitionerName} demain`,
        html: htmlContent,
      });
    } else {
      await transporter.sendMail({
        from: `"${getFromName()}" <${getFromEmail()}>`,
        to: userEmail,
        subject: `Rappel : Votre rendez-vous avec ${practitionerName} demain`,
        html: htmlContent,
      });
    }
  } catch (error) {
    console.error("Error sending appointment reminder email:", error);
    throw error;
  }
}

interface ReviewInvitationEmailProps {
  userName: string;
  practitionerName: string;
  serviceName: string;
  appointmentId: string;
  userEmail: string;
  reviewUrl: string;
}

export async function sendReviewInvitationEmail({
  userName,
  practitionerName,
  serviceName,
  appointmentId,
  userEmail,
  reviewUrl,
}: ReviewInvitationEmailProps) {
  if (!isEmailConfigured()) {
    console.warn("SMTP not configured, skipping email send. Configure SMTP_HOST and SMTP_PORT or SMTP_USER and SMTP_PASS");
    return;
  }

  try {
    const content = `
      <h1 style="color: #6B7F5A; font-family: Manrope, Arial, sans-serif; margin-top: 0;">
        Partagez votre expérience
      </h1>
      
      <p>Bonjour ${userName},</p>
      
      <p>Votre rendez-vous avec ${practitionerName} pour "${serviceName}" est terminé.</p>
      
      <p>Votre avis nous aiderait beaucoup, ainsi que les futurs clients, à mieux connaître l'expérience offerte par ${practitionerName}.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${reviewUrl}" style="background-color: #6B7F5A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          Laisser un avis
        </a>
      </div>
      
      <p style="margin-top: 30px; color: #666; font-size: 14px;">
        Merci pour votre confiance !
      </p>
      
      <p style="color: #666; font-size: 14px;">
        L'équipe Holia
      </p>
    `;
    await transporter.sendMail({
      from: `"${getFromName()}" <${getFromEmail()}>`,
      to: userEmail,
      subject: `Partagez votre expérience avec ${practitionerName}`,
      html: getEmailTemplate(content),
    });
  } catch (error) {
    console.error("Error sending review invitation email:", error);
    throw error;
  }
}

interface AppointmentCancellationEmailProps {
  userName: string;
  practitionerName: string;
  serviceName: string;
  startsAt: Date;
  userEmail: string;
  canceledBy: "client" | "practitioner";
  appointmentsUrl: string;
}

export async function sendAppointmentCancellationEmail({
  userName,
  practitionerName,
  serviceName,
  startsAt,
  userEmail,
  canceledBy,
  appointmentsUrl,
}: AppointmentCancellationEmailProps) {
  if (!isEmailConfigured()) {
    console.warn("SMTP not configured, skipping email send. Configure SMTP_HOST and SMTP_PORT or SMTP_USER and SMTP_PASS");
    return;
  }

  try {
    const formattedDate = format(startsAt, "EEEE d MMMM yyyy 'à' HH:mm", {
      locale: fr,
    });

    const canceledByText = canceledBy === "client" ? "Vous avez annulé" : `${practitionerName} a annulé`;

    const content = `
      <h1 style="color: #6B7F5A; font-family: Manrope, Arial, sans-serif; margin-top: 0;">
        Annulation de votre rendez-vous
      </h1>
      
      <p>Bonjour ${userName},</p>
      
      <p>Votre rendez-vous a été annulé${canceledBy === "practitioner" ? " par le praticien" : ""}.</p>
      
      <div style="background-color: #f7f7f7; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="color: #2C2C2C; font-family: Manrope, Arial, sans-serif; margin-top: 0;">
          Détails du rendez-vous
        </h2>
        <p><strong>Praticien :</strong> ${practitionerName}</p>
        <p><strong>Service :</strong> ${serviceName}</p>
        <p><strong>Date et heure :</strong> ${formattedDate}</p>
      </div>
      
      <p>
        <a href="${appointmentsUrl}" style="color: #6B7F5A; text-decoration: underline;">
          Voir mes rendez-vous
        </a>
      </p>
      
      <p style="margin-top: 30px; color: #666; font-size: 14px;">
        Si vous souhaitez reprogrammer ce rendez-vous, n'hésitez pas à consulter les disponibilités du praticien.
      </p>
      
      <p style="margin-top: 30px; color: #666; font-size: 14px;">
        À bientôt sur Holia !
      </p>
    `;
    await transporter.sendMail({
      from: `"${getFromName()}" <${getFromEmail()}>`,
      to: userEmail,
      subject: `Annulation de votre rendez-vous avec ${practitionerName}`,
      html: getEmailTemplate(content),
    });
  } catch (error) {
    console.error("Error sending appointment cancellation email:", error);
    throw error;
  }
}

interface PractitionerNotificationEmailProps {
  practitionerName: string;
  clientName: string;
  serviceName: string;
  startsAt: Date;
  practitionerEmail: string;
  dashboardUrl: string;
  clientPhone: string | null;
}

export async function sendPractitionerNotificationEmail({
  practitionerName,
  clientName,
  serviceName,
  startsAt,
  practitionerEmail,
  dashboardUrl,
  clientPhone,
}: PractitionerNotificationEmailProps) {
  if (!isEmailConfigured()) {
    console.warn("Email not configured, skipping email send. Configure RESEND_API_KEY or SMTP settings");
    return;
  }

  try {
    const formattedDate = format(startsAt, "EEEE d MMMM yyyy 'à' HH:mm", {
      locale: fr,
    });

    const content = `
      <h1 style="color: #2f2f2f; font-family: Inter, Arial, sans-serif; font-size: 28px; font-weight: 700; margin: 0 0 32px; line-height: 1.2;">
        Nouvelle réservation
      </h1>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Bonjour ${practitionerName},
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
        Vous avez une nouvelle réservation en attente de validation !
      </p>
      
      ${getCardHtml(`
        <h2 style="color: #2f2f2f; font-family: Inter, Arial, sans-serif; font-size: 20px; font-weight: 600; margin: 0 0 16px;">
          Détails de la réservation
        </h2>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px; width: 140px;"><strong style="color: #333;">Client :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${clientName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px;"><strong style="color: #333;">Service :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${serviceName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px;"><strong style="color: #333;">Date et heure :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${formattedDate}</td>
          </tr>
          ${clientPhone ? `
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px;"><strong style="color: #333;">Téléphone :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${clientPhone}</td>
          </tr>
          ` : ""}
        </table>
      `)}
      
      ${getButtonHtml("Voir mes rendez-vous", dashboardUrl)}
    `;

    const htmlContent = getEmailTemplate(content);

    // Utiliser Resend si disponible, sinon fallback sur SMTP
    if (resend) {
      await resend.emails.send({
        from: `${getFromName()} <${getFromEmail()}>`,
        to: practitionerEmail,
        subject: `Nouvelle demande de rendez-vous en attente de validation`,
        html: htmlContent,
      });
    } else {
      await transporter.sendMail({
        from: `"${getFromName()}" <${getFromEmail()}>`,
        to: practitionerEmail,
        subject: `Nouvelle réservation : ${clientName}`,
        html: htmlContent,
      });
    }
    await createLog("INFO", "Email envoyé: notification praticien (nouvelle réservation)", {
      to: practitionerEmail,
      type: "practitioner_notification",
    });
  } catch (error) {
    await createLog("ERROR", "Échec envoi email: notification praticien", {
      to: practitionerEmail,
      error: String(error),
      type: "practitioner_notification",
    });
    console.error("Error sending practitioner notification email:", error);
    throw error;
  }
}

interface PractitionerPaidAppointmentEmailProps {
  practitionerName: string;
  clientName: string;
  serviceName: string;
  startsAt: Date;
  practitionerEmail: string;
  dashboardUrl: string;
  amountCents: number;
}

export async function sendPractitionerPaidAppointmentEmail({
  practitionerName,
  clientName,
  serviceName,
  startsAt,
  practitionerEmail,
  dashboardUrl,
  amountCents,
}: PractitionerPaidAppointmentEmailProps) {
  if (!isEmailConfigured()) {
    console.warn("Email not configured, skipping email send. Configure RESEND_API_KEY or SMTP settings");
    return;
  }

  try {
    const formattedDate = format(startsAt, "EEEE d MMMM yyyy 'à' HH:mm", {
      locale: fr,
    });

    const amountEuros = (amountCents / 100).toFixed(2);

    const content = `
      <h1 style="color: #2f2f2f; font-family: Inter, Arial, sans-serif; font-size: 28px; font-weight: 700; margin: 0 0 32px; line-height: 1.2;">
        Nouveau rendez-vous payé
      </h1>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Bonjour ${practitionerName},
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
        Un nouveau rendez-vous a été payé et confirmé avec <strong>${clientName}</strong>.
      </p>
      
      ${getCardHtml(`
        <h2 style="color: #2f2f2f; font-family: Inter, Arial, sans-serif; font-size: 20px; font-weight: 600; margin: 0 0 16px;">
          Détails du rendez-vous
        </h2>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px; width: 140px;"><strong style="color: #333;">Client :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${clientName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px;"><strong style="color: #333;">Service :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${serviceName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px;"><strong style="color: #333;">Date et heure :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px;"><strong style="color: #333;">Montant :</strong></td>
            <td style="padding: 8px 0; color: #9bb49b; font-size: 15px; font-weight: 600;">${amountEuros}€</td>
          </tr>
        </table>
      `)}
      
      ${getButtonHtml("Voir mes rendez-vous", dashboardUrl)}
      
      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
        Le paiement a été traité avec succès. Vous pouvez consulter tous les détails dans votre espace praticien.
      </p>
    `;

    const htmlContent = getEmailTemplate(content);

    // Utiliser Resend si disponible, sinon fallback sur SMTP
    if (resend) {
      await resend.emails.send({
        from: `${getFromName()} <${getFromEmail()}>`,
        to: practitionerEmail,
        subject: `Nouveau rendez-vous payé avec ${clientName}`,
        html: htmlContent,
      });
    } else {
      await transporter.sendMail({
        from: `"${getFromName()}" <${getFromEmail()}>`,
        to: practitionerEmail,
        subject: `Nouveau rendez-vous payé avec ${clientName}`,
        html: htmlContent,
      });
    }
  } catch (error) {
    console.error("Error sending practitioner paid appointment email:", error);
    throw error;
  }
}

interface PaymentConfirmationEmailProps {
  userName: string;
  practitionerName: string;
  serviceName: string;
  startsAt: Date;
  userEmail: string;
  accessInfo: string | null;
  practitionerId: string;
  appointmentId: string;
  locationChoice?: "PRESENTIAL" | "VIDEO" | null;
  videoLink?: string | null;
  amountCents?: number; // Montant réellement payé (avec promotions)
}

export async function sendPaymentConfirmationEmail({
  userName,
  practitionerName,
  serviceName,
  startsAt,
  userEmail,
  accessInfo,
  practitionerId,
  appointmentId,
  locationChoice,
  videoLink,
  amountCents,
}: PaymentConfirmationEmailProps) {
  if (!isEmailConfigured()) {
    console.warn("Email not configured, skipping email send. Configure RESEND_API_KEY or SMTP settings");
    return;
  }

  try {
    const formattedDate = format(startsAt, "EEEE d MMMM yyyy 'à' HH:mm", {
      locale: fr,
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3005";
    const chatUrl = `${baseUrl}/account/messages?practitionerId=${practitionerId}`;
    const appointmentsUrl = `${baseUrl}/account/appointments`;

    // Déterminer le texte du type de séance
    let locationText = "";
    if (locationChoice === "PRESENTIAL") {
      locationText = "📍 Au cabinet";
    } else if (locationChoice === "VIDEO") {
      locationText = "💻 En vidéo";
    }

    const content = `
      <h1 style="color: #2f2f2f; font-family: Inter, Arial, sans-serif; font-size: 28px; font-weight: 700; margin: 0 0 32px; line-height: 1.2;">
        Confirmation de votre rendez-vous
      </h1>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Bonjour ${userName},
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
        Votre paiement a été validé avec succès ! Votre rendez-vous est confirmé.
      </p>
      
      ${getCardHtml(`
        <h2 style="color: #2f2f2f; font-family: Inter, Arial, sans-serif; font-size: 20px; font-weight: 600; margin: 0 0 16px;">
          Détails du rendez-vous
        </h2>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px; width: 140px;"><strong style="color: #333;">Praticien :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${practitionerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px;"><strong style="color: #333;">Service :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${serviceName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px;"><strong style="color: #333;">Date et heure :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${formattedDate}</td>
          </tr>
          ${amountCents != null ? `
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px;"><strong style="color: #333;">Montant payé :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${(amountCents / 100).toFixed(2)} €</td>
          </tr>
          ` : ""}
          ${locationText ? `
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px;"><strong style="color: #333;">Type de séance :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${locationText}</td>
          </tr>
          ` : ""}
        </table>
      `)}
      
      ${locationChoice === "VIDEO" && videoLink ? getCardHtml(`
        <h2 style="color: #2f2f2f; font-family: Inter, Arial, sans-serif; font-size: 18px; font-weight: 600; margin: 0 0 12px;">
          Lien de visioconférence
        </h2>
        <p style="margin: 0 0 16px; color: #333; font-size: 15px; line-height: 1.6;">
          Pour rejoindre votre séance en visioconférence, cliquez sur le lien ci-dessous :
        </p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 16px 0;">
          <tr>
            <td align="center" style="padding: 0;">
              <a href="${videoLink}" style="display: inline-block; padding: 12px 24px; background-color: #9bb49b; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px; text-align: center;">
                Rejoindre la visioconférence
              </a>
            </td>
          </tr>
        </table>
        <p style="margin: 16px 0 0; color: #666; font-size: 13px; line-height: 1.5;">
          <strong>Note :</strong> Ce lien est valable pour votre séance. Assurez-vous d'avoir une connexion internet stable et un environnement calme.
        </p>
      `, "#f9f9f9") : ""}
      
      ${accessInfo ? getCardHtml(`
        <h2 style="color: #2f2f2f; font-family: Inter, Arial, sans-serif; font-size: 18px; font-weight: 600; margin: 0 0 12px;">
          Informations d'accès
        </h2>
        <p style="margin: 0; color: #333; font-size: 15px; line-height: 1.6; white-space: pre-line;">${accessInfo}</p>
      `, "#f9f9f9") : ""}
      
      ${getButtonHtml("Contacter le praticien", chatUrl)}
      
      <div style="background-color: #f7f7f7; padding: 20px; border-radius: 24px; margin: 24px 0; border: 1px solid #e5e5e5;">
        <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
          <strong style="color: #333;">💡 Note importante :</strong> Votre facture sera disponible dans votre espace client une fois la séance terminée. Vous pourrez la télécharger depuis <a href="${appointmentsUrl}" style="color: #9bb49b; text-decoration: underline;">vos rendez-vous</a>.
        </p>
      </div>
    `;

    const htmlContent = getEmailTemplate(content);

    // Utiliser Resend si disponible, sinon fallback sur SMTP
    if (resend) {
      await resend.emails.send({
        from: `${getFromName()} <${getFromEmail()}>`,
        to: userEmail,
        subject: `Confirmation de votre rendez-vous avec ${practitionerName}`,
        html: htmlContent,
      });
    } else {
      await transporter.sendMail({
        from: `"${getFromName()}" <${getFromEmail()}>`,
        to: userEmail,
        subject: `Confirmation de votre rendez-vous avec ${practitionerName}`,
        html: htmlContent,
      });
    }
    await createLog("INFO", "Email envoyé: confirmation paiement patient", {
      to: userEmail,
      type: "payment_confirmation",
    });
  } catch (error) {
    await createLog("ERROR", "Échec envoi email: confirmation paiement", {
      to: userEmail,
      error: String(error),
      type: "payment_confirmation",
    });
    console.error("Error sending payment confirmation email:", error);
    throw error;
  }
}

interface PatientBookingConfirmationEmailProps {
  patientName: string;
  practitionerName: string;
  serviceName: string;
  startsAt: Date;
  patientEmail: string;
}

export async function sendPatientBookingConfirmationEmail({
  patientName,
  practitionerName,
  serviceName,
  startsAt,
  patientEmail,
}: PatientBookingConfirmationEmailProps) {
  if (!isEmailConfigured()) {
    console.warn("Email not configured, skipping email send. Configure RESEND_API_KEY or SMTP settings");
    return;
  }

  try {
    const formattedDate = format(startsAt, "EEEE d MMMM yyyy 'à' HH:mm", {
      locale: fr,
    });

    const content = `
      <h1 style="color: #2f2f2f; font-family: Inter, Arial, sans-serif; font-size: 28px; font-weight: 700; margin: 0 0 32px; line-height: 1.2;">
        Demande de rendez-vous transmise
      </h1>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Bonjour ${patientName},
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
        Votre demande de rendez-vous a bien été transmise et est en attente de confirmation du praticien.
      </p>
      
      ${getCardHtml(`
        <h2 style="color: #2f2f2f; font-family: Inter, Arial, sans-serif; font-size: 20px; font-weight: 600; margin: 0 0 16px;">
          Détails de votre demande
        </h2>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px; width: 140px;"><strong style="color: #333;">Praticien :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${practitionerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px;"><strong style="color: #333;">Service :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${serviceName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px;"><strong style="color: #333;">Date et heure :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${formattedDate}</td>
          </tr>
        </table>
      `)}
      
      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
        Vous recevrez une confirmation par email dès que le praticien aura validé votre rendez-vous.
      </p>
    `;

    const htmlContent = getEmailTemplate(content);

    // Utiliser Resend si disponible, sinon fallback sur SMTP
    if (resend) {
      await resend.emails.send({
        from: `${getFromName()} <${getFromEmail()}>`,
        to: patientEmail,
        subject: `Votre demande a bien été transmise, en attente de confirmation du praticien`,
        html: htmlContent,
      });
    } else {
      await transporter.sendMail({
        from: `"${getFromName()}" <${getFromEmail()}>`,
        to: patientEmail,
        subject: `Demande de rendez-vous transmise`,
        html: htmlContent,
      });
    }
  } catch (error) {
    console.error("Error sending patient booking confirmation email:", error);
    throw error;
  }
}

interface PractitionerVerificationEmailProps {
  practitionerName: string;
  practitionerEmail: string;
  profileUrl: string;
}

export async function sendPractitionerVerificationEmail({
  practitionerName,
  practitionerEmail,
  profileUrl,
}: PractitionerVerificationEmailProps) {
  if (!isEmailConfigured()) {
    console.warn("SMTP not configured, skipping email send. Configure SMTP_HOST and SMTP_PORT or SMTP_USER and SMTP_PASS");
    return;
  }

  try {
    const content = `
      <h1 style="color: #6B7F5A; font-family: Manrope, Arial, sans-serif; margin-top: 0;">
        Félicitations ! Votre profil a été validé
      </h1>
      
      <p>Bonjour ${practitionerName},</p>
      
      <p>Nous avons le plaisir de vous informer que votre profil praticien sur Holia a été validé par notre équipe.</p>
      
      <p>Votre profil est désormais visible sur la plateforme et les clients peuvent prendre rendez-vous avec vous.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${profileUrl}" style="background-color: #6B7F5A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          Voir mon profil
        </a>
      </div>
      
      <p style="margin-top: 30px; color: #666; font-size: 14px;">
        Si vous avez des questions, n'hésitez pas à nous contacter.
      </p>
      
      <p style="margin-top: 30px; color: #666; font-size: 14px;">
        À bientôt sur Holia !
      </p>
    `;
    await transporter.sendMail({
      from: `"${getFromName()}" <${getFromEmail()}>`,
      to: practitionerEmail,
      subject: `Votre profil praticien a été validé !`,
      html: getEmailTemplate(content),
    });
  } catch (error) {
    console.error("Error sending practitioner verification email:", error);
    throw error;
  }
}

interface PractitionerRejectionEmailProps {
  practitionerName: string;
  practitionerEmail: string;
  rejectionReason?: string;
  profileUrl: string;
}

export async function sendPractitionerRejectionEmail({
  practitionerName,
  practitionerEmail,
  rejectionReason,
  profileUrl,
}: PractitionerRejectionEmailProps) {
  if (!isEmailConfigured()) {
    console.warn("SMTP not configured, skipping email send. Configure SMTP_HOST and SMTP_PORT or SMTP_USER and SMTP_PASS");
    return;
  }

  try {
    const content = `
      <h1 style="color: #6B7F5A; font-family: Manrope, Arial, sans-serif; margin-top: 0;">
        Votre candidature nécessite des modifications
      </h1>
      
      <p>Bonjour ${practitionerName},</p>
      
      <p>Après étude de votre candidature pour devenir praticien sur Holia, nous avons identifié des éléments à modifier ou compléter dans votre profil.</p>
      
      ${rejectionReason ? `
        <div style="background-color: #f7f7f7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d97706;">
          <h2 style="color: #2C2C2C; font-family: Manrope, Arial, sans-serif; margin-top: 0;">
            Informations à modifier :
          </h2>
          <p>${rejectionReason}</p>
        </div>
      ` : `
        <p>Veuillez vérifier que toutes les informations de votre profil sont complètes et correctes :</p>
        <ul style="margin: 20px 0; padding-left: 20px;">
          <li>Photo de profil professionnelle</li>
          <li>Description complète de vos services</li>
          <li>Informations de contact à jour</li>
          <li>Localisation précise</li>
        </ul>
      `}
      
      <p>Vous pouvez modifier votre profil et le soumettre à nouveau pour une nouvelle validation.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${profileUrl}" style="background-color: #6B7F5A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          Modifier mon profil
        </a>
      </div>
      
      <p style="margin-top: 30px; color: #666; font-size: 14px;">
        Si vous avez des questions, n'hésitez pas à nous contacter.
      </p>
      
      <p style="margin-top: 30px; color: #666; font-size: 14px;">
        À bientôt sur Holia !
      </p>
    `;
    await transporter.sendMail({
      from: `"${getFromName()}" <${getFromEmail()}>`,
      to: practitionerEmail,
      subject: `Votre candidature de praticien nécessite des modifications`,
      html: getEmailTemplate(content),
    });
  } catch (error) {
    console.error("Error sending practitioner rejection email:", error);
    throw error;
  }
}

interface PasswordChangeEmailProps {
  userEmail: string;
  userName: string;
  resetUrl: string;
}

export async function sendPasswordChangeEmail({
  userEmail,
  userName,
  resetUrl,
}: PasswordChangeEmailProps) {
  if (!isEmailConfigured()) {
    console.warn("SMTP not configured, skipping email send. Configure SMTP_HOST and SMTP_PORT or SMTP_USER and SMTP_PASS");
    return;
  }

  try {
    await transporter.sendMail({
      from: `"${getFromName()}" <${getFromEmail()}>`,
      to: userEmail,
      subject: `Confirmez votre changement de mot de passe`,
      html: getEmailTemplate(`
      <h1 style="color: #6B7F5A; font-family: Manrope, Arial, sans-serif; margin-top: 0;">
        Confirmez votre changement de mot de passe
      </h1>
      
      <p>Bonjour ${userName},</p>
      
      <p>Vous avez demandé à changer votre mot de passe sur Holia.</p>
      
      <p>Pour confirmer ce changement, veuillez cliquer sur le lien ci-dessous :</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #6B7F5A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          Confirmer le changement de mot de passe
        </a>
      </div>
      
      <p style="color: #666; font-size: 14px;">
        Ce lien est valide pendant 24 heures. Si vous n'avez pas demandé ce changement, ignorez cet email.
      </p>
      
      <p style="margin-top: 30px; color: #666; font-size: 14px;">
        Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
        <a href="${resetUrl}" style="color: #6B7F5A; word-break: break-all;">${resetUrl}</a>
      </p>
      
      <p style="margin-top: 30px; color: #666; font-size: 14px;">
        L'équipe Holia
      </p>
    `),
    });
  } catch (error) {
    console.error("Error sending password change email:", error);
    throw error;
  }
}

interface InvoiceEmailProps {
  invoiceId: string;
  clientEmail: string;
  clientName: string | null;
  practitionerName: string;
}

export async function sendInvoiceEmail({
  invoiceId,
  clientEmail,
  clientName,
  practitionerName,
}: InvoiceEmailProps) {
  if (!isEmailConfigured()) {
    console.warn("SMTP not configured, skipping email send. Configure SMTP_HOST and SMTP_PORT or SMTP_USER and SMTP_PASS");
    return;
  }

  const invoiceUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3005"}/api/invoices/${invoiceId}/pdf`;

  try {
    const content = `
      <h1 style="color: #2f2f2f; font-family: Inter, Arial, sans-serif; font-size: 28px; font-weight: 700; margin: 0 0 32px; line-height: 1.2;">
        Votre facture
      </h1>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Bonjour ${clientName || "Client"},
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Voici la facture de votre séance avec ${practitionerName}.
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
        Vous pouvez la transmettre à votre mutuelle pour une prise en charge éventuelle.
      </p>
      
      ${getButtonHtml("Télécharger la facture", invoiceUrl)}
      
      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
        Prenez soin de vous,<br>
        <strong style="color: #333;">${practitionerName}</strong>
      </p>
    `;

    const htmlContent = getEmailTemplate(content);

    await transporter.sendMail({
      from: `"${getFromName()}" <${getFromEmail()}>`,
      to: clientEmail,
      subject: `Votre facture pour la séance avec ${practitionerName}`,
      html: htmlContent,
    });
  } catch (error) {
    console.error("Error sending invoice email:", error);
    throw error;
  }
}

interface FollowupReminderEmailProps {
  userName: string;
  practitionerName: string;
  practitionerSlug: string;
  lastAppointmentDate: Date | null | undefined;
  lastServiceName: string | null | undefined;
  userEmail: string;
  daysSince: number;
  bookingUrl: string;
}

export async function sendFollowupReminderEmail({
  userName,
  practitionerName,
  practitionerSlug,
  lastAppointmentDate,
  lastServiceName,
  userEmail,
  daysSince,
  bookingUrl,
}: FollowupReminderEmailProps) {
  if (!isEmailConfigured()) {
    console.warn("SMTP not configured, skipping email send. Configure SMTP_HOST and SMTP_PORT or SMTP_USER and SMTP_PASS");
    return;
  }

  try {
    const lastAppointmentText = lastAppointmentDate
      ? format(lastAppointmentDate, "d MMMM yyyy", { locale: fr })
      : "récemment";

    const daysText = daysSince >= 90
      ? "plus de 3 mois"
      : daysSince >= 60
      ? "plus de 2 mois"
      : "plus d'un mois";

    const content = `
      <h1 style="color: #6B7F5A; font-family: Manrope, Arial, sans-serif; margin-top: 0;">
        Bonjour ${userName},
      </h1>
      
      <p>Cela fait ${daysText} que nous ne nous sommes pas vus.</p>
      
      ${lastAppointmentDate && lastServiceName ? `
        <p>Je me souviens de notre dernière séance le ${lastAppointmentText} pour "${lastServiceName}".</p>
      ` : ""}
      
      <p>Ressentez-vous le besoin de faire un point ? Comment vous sentez-vous depuis notre dernier rendez-vous ?</p>
      
      <p>Je serais ravi${practitionerName.includes("e") ? "e" : ""} de vous revoir et de continuer à vous accompagner dans votre bien-être.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${bookingUrl}" style="background-color: #6B7F5A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          Voir mes disponibilités
        </a>
      </div>
      
      <p style="margin-top: 30px; color: #666; font-size: 14px;">
        Prenez soin de vous,<br>
        ${practitionerName}
      </p>
      
      <p style="margin-top: 30px; color: #999; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px;">
        Cet email vous a été envoyé automatiquement par ${getFromName()}. Si vous ne souhaitez plus recevoir ces rappels, vous pouvez le désactiver dans vos paramètres.
      </p>
    `;
    await transporter.sendMail({
      from: `"${practitionerName} via ${getFromName()}" <${getFromEmail()}>`,
      to: userEmail,
      subject: `Un petit mot de ${practitionerName}`,
      html: getEmailTemplate(content),
    });
  } catch (error) {
    console.error("Error sending followup reminder email:", error);
    throw error;
  }
}

interface SessionCompletedEmailProps {
  userName: string;
  practitionerName: string;
  serviceName: string;
  startsAt: Date;
  userEmail: string;
  appointmentId: string;
  invoiceId: string | null;
  practitionerSlug: string | null;
}

export async function sendSessionCompletedEmail({
  userName,
  practitionerName,
  serviceName,
  startsAt,
  userEmail,
  appointmentId,
  invoiceId,
  practitionerSlug,
}: SessionCompletedEmailProps) {
  if (!isEmailConfigured()) {
    console.warn("Email not configured, skipping email send. Configure RESEND_API_KEY or SMTP settings");
    return;
  }

  try {
    const formattedDate = format(startsAt, "EEEE d MMMM yyyy 'à' HH:mm", {
      locale: fr,
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3005";
    const reviewUrl = `${baseUrl}/account/reviews/new?appointmentId=${appointmentId}${practitionerSlug ? `&practitionerId=${practitionerSlug}` : ""}`;
    const invoiceUrl = invoiceId ? `${baseUrl}/api/invoices/${invoiceId}/pdf` : null;

    const content = `
      <h1 style="color: #2f2f2f; font-family: Inter, Arial, sans-serif; font-size: 28px; font-weight: 700; margin: 0 0 32px; line-height: 1.2;">
        Comment s'est passée votre séance ?
      </h1>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Bonjour ${userName},
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
        Votre séance avec ${practitionerName} pour "${serviceName}" le ${formattedDate} est maintenant terminée.
      </p>
      
      ${getCardHtml(`
        <h2 style="color: #2f2f2f; font-family: Inter, Arial, sans-serif; font-size: 20px; font-weight: 600; margin: 0 0 16px;">
          Détails de la séance
        </h2>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px; width: 140px;"><strong style="color: #333;">Praticien :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${practitionerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px;"><strong style="color: #333;">Service :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${serviceName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px;"><strong style="color: #333;">Date et heure :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${formattedDate}</td>
          </tr>
        </table>
      `)}
      
      ${getButtonHtml("Laisser un avis", reviewUrl)}
      
      ${invoiceUrl ? `
        <div style="text-align: center; margin: 16px 0;">
          <a href="${invoiceUrl}" style="color: #9bb49b; text-decoration: underline; font-size: 15px; font-weight: 500;">
            Télécharger ma facture
          </a>
        </div>
      ` : ""}
      
      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
        Votre avis nous aide à améliorer nos services et guide les futurs clients dans leur choix.
      </p>
    `;

    const htmlContent = getEmailTemplate(content);

    // Utiliser Resend si disponible, sinon fallback sur SMTP
    if (resend) {
      await resend.emails.send({
        from: `${getFromName()} <${getFromEmail()}>`,
        to: userEmail,
        subject: `Comment s'est passée votre séance avec ${practitionerName} ?`,
        html: htmlContent,
      });
    } else {
      await transporter.sendMail({
        from: `"${getFromName()}" <${getFromEmail()}>`,
        to: userEmail,
        subject: `Comment s'est passée votre séance avec ${practitionerName} ?`,
        html: htmlContent,
      });
    }
  } catch (error) {
    console.error("Error sending session completed email:", error);
    throw error;
  }
}

// Email pour praticien shadow (non réclamé) : un patient lui a envoyé un message
export async function sendShadowPractitionerMessageEmail({
  practitionerEmail,
  patientName,
  practitionerId,
}: {
  practitionerEmail: string;
  patientName: string;
  practitionerId: string;
}) {
  if (!isEmailConfigured()) {
    console.warn("SMTP not configured, skipping shadow practitioner message email");
    return;
  }

  try {
    const claimUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://holia.me"}/inscription?claim=${practitionerId}`;

    const content = `
      <h1 style="color: #2f2f2f; font-family: Inter, Arial, sans-serif; font-size: 28px; font-weight: 700; margin: 0 0 32px; line-height: 1.2;">
        Nouveau message sur Holia
      </h1>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Bonjour,
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        <strong>${patientName}</strong> vous a envoyé un message sur Holia.
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
        Réclamez votre profil pour consulter ce message et y répondre.
      </p>
      
      ${getButtonHtml("Réclamer mon profil", claimUrl)}
    `;

    const htmlContent = getEmailTemplate(content);

    if (resend) {
      await resend.emails.send({
        from: `${getFromName()} <${getFromEmail()}>`,
        to: practitionerEmail,
        subject: `${patientName} vous a envoyé un message sur Holia`,
        html: htmlContent,
      });
    } else {
      await transporter.sendMail({
        from: `"${getFromName()}" <${getFromEmail()}>`,
        to: practitionerEmail,
        subject: `${patientName} vous a envoyé un message sur Holia`,
        html: htmlContent,
      });
    }
  } catch (error) {
    console.error("Error sending shadow practitioner message email:", error);
    throw error;
  }
}

/**
 * Email patient : Votre billet pour {eventTitle}
 */
export async function sendPatientEventTicketEmail(params: {
  userName: string;
  userEmail: string;
  eventTitle: string;
  eventDate: Date;
  eventAddress: string | null;
  receiptUrl: string;
}) {
  const { userName, userEmail, eventTitle, eventDate, eventAddress, receiptUrl } = params;
  if (!isEmailConfigured()) {
    console.warn("Email not configured, skipping patient event ticket email");
    return;
  }

  try {
    const formattedDate = format(eventDate, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });

    const content = `
      <h1 style="color: #2f2f2f; font-family: Inter, Arial, sans-serif; font-size: 28px; font-weight: 700; margin: 0 0 32px; line-height: 1.2;">
        Votre billet pour ${eventTitle}
      </h1>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Bonjour ${userName},
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
        Votre place est réservée ! Voici le récapitulatif de votre billet.
      </p>
      
      ${getCardHtml(`
        <h2 style="color: #2f2f2f; font-family: Inter, Arial, sans-serif; font-size: 20px; font-weight: 600; margin: 0 0 16px;">
          Détails de l'événement
        </h2>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px; width: 140px;"><strong style="color: #333;">Événement :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${eventTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px;"><strong style="color: #333;">Date et heure :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${formattedDate}</td>
          </tr>
          ${eventAddress ? `
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px;"><strong style="color: #333;">Lieu :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${eventAddress}</td>
          </tr>
          ` : ""}
        </table>
      `)}
      
      ${getButtonHtml("Télécharger mon reçu", receiptUrl)}
    `;

    const htmlContent = getEmailTemplate(content);

    if (resend) {
      await resend.emails.send({
        from: `${getFromName()} <${getFromEmail()}>`,
        to: userEmail,
        subject: `Votre billet pour ${eventTitle}`,
        html: htmlContent,
      });
    } else {
      await transporter.sendMail({
        from: `"${getFromName()}" <${getFromEmail()}>`,
        to: userEmail,
        subject: `Votre billet pour ${eventTitle}`,
        html: htmlContent,
      });
    }
  } catch (error) {
    console.error("Error sending patient event ticket email:", error);
    throw error;
  }
}

/**
 * Email patient : Bonne nouvelle ! L'événement est confirmé, votre paiement a été validé
 */
export async function sendEventConfirmedPaymentEmail(params: {
  userName: string;
  userEmail: string;
  eventTitle: string;
  eventDate: Date;
  eventAddress: string | null;
  receiptUrl: string;
}) {
  const { userName, userEmail, eventTitle, eventDate, eventAddress, receiptUrl } = params;
  if (!isEmailConfigured()) {
    console.warn("Email not configured, skipping event confirmed payment email");
    return;
  }

  try {
    const formattedDate = format(eventDate, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });

    const content = `
      <h1 style="color: #2f2f2f; font-family: Inter, Arial, sans-serif; font-size: 28px; font-weight: 700; margin: 0 0 32px; line-height: 1.2;">
        Bonne nouvelle ! L'événement est confirmé
      </h1>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Bonjour ${userName},
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
        Votre paiement a été validé et l'événement <strong>${eventTitle}</strong> est désormais confirmé.
      </p>
      
      ${getCardHtml(`
        <h2 style="color: #2f2f2f; font-family: Inter, Arial, sans-serif; font-size: 20px; font-weight: 600; margin: 0 0 16px;">
          Détails de l'événement
        </h2>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px; width: 140px;"><strong style="color: #333;">Événement :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${eventTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px;"><strong style="color: #333;">Date et heure :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${formattedDate}</td>
          </tr>
          ${eventAddress ? `
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 15px;"><strong style="color: #333;">Lieu :</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${eventAddress}</td>
          </tr>
          ` : ""}
        </table>
      `)}
      
      ${getButtonHtml("Télécharger mon reçu", receiptUrl)}
      
      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
        Rendez-vous le jour J !
      </p>
    `;

    const htmlContent = getEmailTemplate(content);

    if (resend) {
      await resend.emails.send({
        from: `${getFromName()} <${getFromEmail()}>`,
        to: userEmail,
        subject: `Confirmé : ${eventTitle} - Votre paiement a été validé`,
        html: htmlContent,
      });
    } else {
      await transporter.sendMail({
        from: `"${getFromName()}" <${getFromEmail()}>`,
        to: userEmail,
        subject: `Confirmé : ${eventTitle} - Votre paiement a été validé`,
        html: htmlContent,
      });
    }
  } catch (error) {
    console.error("Error sending event confirmed payment email:", error);
    throw error;
  }
}

/**
 * Email praticien : Nouvelle inscription à votre conférence
 */
export async function sendPractitionerEventRegistrationEmail(params: {
  practitionerName: string;
  practitionerEmail: string;
  eventTitle: string;
  participantName: string;
  remainingPlaces: number;
  eventsUrl: string;
}) {
  const { practitionerName, practitionerEmail, eventTitle, participantName, remainingPlaces, eventsUrl } = params;
  if (!isEmailConfigured()) {
    console.warn("Email not configured, skipping practitioner event registration email");
    return;
  }

  try {
    const content = `
      <h1 style="color: #2f2f2f; font-family: Inter, Arial, sans-serif; font-size: 28px; font-weight: 700; margin: 0 0 32px; line-height: 1.2;">
        Nouvelle inscription à votre conférence !
      </h1>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Bonjour ${practitionerName},
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
        <strong>${participantName}</strong> vient de réserver sa place pour votre événement <strong>${eventTitle}</strong>.
      </p>
      
      ${getCardHtml(`
        <h2 style="color: #2f2f2f; font-family: Inter, Arial, sans-serif; font-size: 20px; font-weight: 600; margin: 0 0 16px;">
          Places restantes
        </h2>
        <p style="margin: 0; font-size: 24px; font-weight: 700; color: #9bb49b;">${remainingPlaces}</p>
      `)}
      
      ${getButtonHtml("Voir mes événements", eventsUrl)}
    `;

    const htmlContent = getEmailTemplate(content);

    if (resend) {
      await resend.emails.send({
        from: `${getFromName()} <${getFromEmail()}>`,
        to: practitionerEmail,
        subject: `Nouvelle inscription : ${participantName} pour ${eventTitle}`,
        html: htmlContent,
      });
    } else {
      await transporter.sendMail({
        from: `"${getFromName()}" <${getFromEmail()}>`,
        to: practitionerEmail,
        subject: `Nouvelle inscription : ${participantName} pour ${eventTitle}`,
        html: htmlContent,
      });
    }
  } catch (error) {
    console.error("Error sending practitioner event registration email:", error);
    throw error;
  }
}

/**
 * Email participant : Annulation d'événement et confirmation de remboursement
 */
export async function sendEventCancellationRefundEmail(params: {
  userName: string;
  userEmail: string;
  eventTitle: string;
  eventDate: Date;
  refundAmountCents: number;
}) {
  const { userName, userEmail, eventTitle, eventDate, refundAmountCents } = params;
  if (!isEmailConfigured()) {
    console.warn("Email not configured, skipping event cancellation refund email");
    return;
  }

  try {
    const formattedDate = format(eventDate, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
    const refundEuros = (refundAmountCents / 100).toFixed(2).replace(".", ",");

    const content = `
      <h1 style="color: #2f2f2f; font-family: Inter, Arial, sans-serif; font-size: 28px; font-weight: 700; margin: 0 0 32px; line-height: 1.2;">
        Annulation de l'événement « ${eventTitle} »
      </h1>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Bonjour ${userName},
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Nous avons le regret de vous informer que l'organisateur a annulé l'événement <strong>${eventTitle}</strong> prévu le ${formattedDate}.
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
        Nous vous présentons nos excuses pour ce désagrément.
      </p>
      
      ${getCardHtml(`
        <h2 style="color: #2f2f2f; font-family: Inter, Arial, sans-serif; font-size: 20px; font-weight: 600; margin: 0 0 16px;">
          Remboursement
        </h2>
        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #333;">
          Le montant de <strong>${refundEuros} €</strong> vous sera remboursé sous 5 à 10 jours ouvrés sur le moyen de paiement utilisé.
        </p>
      `)}
      
      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 32px 0 0;">
        Nous vous invitons à découvrir d'autres événements sur Holia.
      </p>
      
      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 16px 0 0;">
        L'équipe Holia
      </p>
    `;

    const htmlContent = getEmailTemplate(content);

    if (resend) {
      await resend.emails.send({
        from: `${getFromName()} <${getFromEmail()}>`,
        to: userEmail,
        subject: `Annulation : ${eventTitle} - Remboursement en cours`,
        html: htmlContent,
      });
    } else {
      await transporter.sendMail({
        from: `"${getFromName()}" <${getFromEmail()}>`,
        to: userEmail,
        subject: `Annulation : ${eventTitle} - Remboursement en cours`,
        html: htmlContent,
      });
    }
  } catch (error) {
    console.error("Error sending event cancellation refund email:", error);
    throw error;
  }
}

/**
 * Envoie un email d'invitation acquisition (Holia → praticien non réclamé)
 */
export async function sendAcquisitionInvitationEmail(params: {
  practitionerEmail: string;
  practitionerName: string;
  practitionerId: string;
  locationCity: string;
  practitionerSlug: string;
}) {
  const { practitionerEmail, practitionerName, practitionerId, locationCity, practitionerSlug } = params;
  if (!isEmailConfigured()) {
    throw new Error("Email non configuré");
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://holia.me";
  const claimUrl = `${baseUrl}/inscription?claim=${practitionerId}`;
  const profileUrl = `${baseUrl}/praticien/${practitionerSlug}`;

  const title = escapeHtml(practitionerName || "");
  const city = escapeHtml(locationCity || "");

  const content = `
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
      Bonjour${title ? ` ${title}` : ""},
    </p>
    
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
      Je suis Luc Michault, le fondateur de Holia.me. Je suis développeur basé à Idron (64) et je vous contacte aujourd'hui car j'ai conçu un outil spécialement pour les praticiens du bien-être comme vous.
    </p>
    
    <p style="color: #333; font-size: 16px; font-weight: 600; margin: 0 0 12px;">
      Pourquoi votre profil est-il déjà sur Holia ?
    </p>
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
      Pour lancer la plateforme, j'ai pris l'initiative de pré-remplir des fiches de travail pour les praticiens les plus qualifiés. Mon but : vous faire gagner du temps et booster votre SEO local dès le premier jour. Pour être tout à fait honnête, notre stratégie de référencement a été si efficace que Google a déjà commencé à indexer votre page avant même que j'aie pu vous envoyer ce message de présentation !
    </p>
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
      C'est une excellente nouvelle : votre profil travaille déjà pour votre visibilité gratuite à ${city}. Vous pouvez consulter le "brouillon" ici : <a href="${profileUrl}" style="color: #9bb49b; text-decoration: underline;">Voir ma fiche</a>
    </p>
    <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 24px; padding: 16px; background: #faf8f4; border-left: 4px solid #9bb49b; border-radius: 0 8px 8px 0;">
      <strong>⚠️ Un petit mot sur la précision des données :</strong><br>
      Pour créer ce pré-remplissage, j'ai utilisé des données publiques issues d'annuaires. L'automatisation n'étant pas parfaite, il se peut que certaines informations (profession exacte, horaires, photos ou adresse) soient obsolètes ou imprécises. Si c'est le cas, je m'en excuse par avance. C'est justement pour cela que je vous invite à en prendre le contrôle.
    </p>
    
    <p style="color: #333; font-size: 16px; font-weight: 600; margin: 0 0 12px;">
      Holia est bien plus qu'un simple annuaire.
    </p>
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
      C'est une application de travail complète conçue pour vous redonner du temps et simplifier votre gestion :
    </p>
    <ul style="color: #333; font-size: 15px; line-height: 1.8; margin: 0 0 24px; padding-left: 20px;">
      <li><strong>Gestion d'agenda :</strong> Un calendrier intelligent synchronisé avec votre Google Calendar pour éviter les doubles saisies.</li>
      <li><strong>Réservations simplifiées :</strong> Un tunnel de prise de rendez-vous fluide et moderne pour vos patients.</li>
      <li><strong>Messagerie ultra-sécurisée :</strong> Tous vos échanges sont chiffrés (norme AES-256) pour garantir une confidentialité totale.</li>
      <li><strong>Outils métier :</strong> Prise de notes de séances privées, gestion de votre réputation et outils de promotion (offres spéciales).</li>
      <li><strong>Optimisation fiscale :</strong> Un système de facturation unique en France qui déduit automatiquement les frais de service. Vous déclarez ainsi uniquement ce que vous gagnez réellement.</li>
    </ul>
    
    <p style="color: #333; font-size: 16px; font-weight: 600; margin: 0 0 12px;">
      Zéro frais, zéro risque.
    </p>
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
      Holia propose un modèle Freemium : l'accès à tous les outils est totalement gratuit. Nous ne nous rémunérons que par une petite commission de 8% sur les réservations. Notre offre Premium est simplement là pour supprimer cette commission si votre volume d'activité le justifie.
    </p>
    
    <p style="color: #333; font-size: 16px; font-weight: 600; margin: 0 0 12px;">
      C'est votre profil, reprenez-en les clés.
    </p>
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
      Je vous invite à réclamer votre fiche gratuitement en quelques clics pour la personnaliser avec vos photos, ajuster vos tarifs ou activer votre calendrier :
    </p>
    
    ${getButtonHtml("Réclamer et activer mon profil gratuitement", claimUrl)}
    
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 24px 0 0;">
      Je suis à votre entière disposition pour échanger de vive voix ou recevoir vos suggestions pour améliorer l'outil selon vos besoins réels.
    </p>
    
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 24px 0 0;">
      Prenez soin de vous,<br>
      <strong>Luc Michault</strong><br>
      Fondateur de Holia.me
    </p>
    
    <p style="color: #999; font-size: 12px; line-height: 1.5; margin: 32px 0 0;">
      Holia est un produit de Websual - 64320 Idron
    </p>
  `;

  const htmlContent = getEmailTemplate(content);
  const subject = `Une vitrine professionnelle pour votre activité à ${city}`;

  if (resend) {
    await resend.emails.send({
      from: `${getFromName()} <${getFromEmail()}>`,
      to: practitionerEmail,
      subject,
      html: htmlContent,
    });
  } else {
    await transporter.sendMail({
      from: `"${getFromName()}" <${getFromEmail()}>`,
      to: practitionerEmail,
      subject,
      html: htmlContent,
    });
  }
}

/**
 * Envoie un email de formulaire de contact (Holia → équipe)
 */
export async function sendContactFormEmail(params: {
  profile: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}) {
  const { profile, name, email, phone, subject, message } = params;
  const toEmail =
    process.env.CONTACT_EMAIL || process.env.RESEND_FROM_EMAIL || "contact@holia.me";
  const phoneLine = phone
    ? `<p><strong>Téléphone :</strong> ${escapeHtml(phone)}</p>`
    : "";
  const htmlContent = `
    <p><strong>Nouveau message depuis le formulaire de contact Holia</strong></p>
    <p><strong>Profil :</strong> ${escapeHtml(profile)}</p>
    <p><strong>Nom :</strong> ${escapeHtml(name)}</p>
    <p><strong>Email :</strong> ${escapeHtml(email)}</p>
    ${phoneLine}
    <p><strong>Sujet :</strong> ${escapeHtml(subject)}</p>
    <p><strong>Message :</strong></p>
    <div style="white-space: pre-wrap; background: #f5f5f5; padding: 16px; border-radius: 8px;">${escapeHtml(message)}</div>
    <p style="margin-top: 24px; color: #666; font-size: 12px;">Envoyé depuis holia.me/contact</p>
  `;

  try {
    if (resend) {
      await resend.emails.send({
        from: `${getFromName()} <${getFromEmail()}>`,
        to: toEmail,
        reply_to: email,
        subject: `[Contact] ${subject}`,
        html: getEmailTemplate(htmlContent),
      });
    } else {
      await transporter.sendMail({
        from: `"${getFromName()}" <${getFromEmail()}>`,
        to: toEmail,
        replyTo: email,
        subject: `[Contact] ${subject}`,
        html: getEmailTemplate(htmlContent),
      });
    }
    await createLog("INFO", "Email envoyé: formulaire contact", {
      to: toEmail,
      subject: `[Contact] ${subject}`,
      type: "contact_form",
    });
  } catch (error) {
    await createLog("ERROR", "Échec envoi email: formulaire contact", {
      to: toEmail,
      error: String(error),
      type: "contact_form",
    });
    throw error;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
