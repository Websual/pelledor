
import { prisma } from "./prisma";
import { createId } from "@paralleldrive/cuid2";
import { sendInvoiceEmail as sendEmail } from "./emails";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { calculateHoliaCommission } from "./stripe-fees";

interface InvoiceData {
  practitioner: {
    id: string;
    title: string;
    first_name: string | null;
    last_name: string | null;
    siret: string | null;
    address: string | null;
    location_city: string;
    phone: string | null;
    users: {
      email: string;
    };
  };
  client?: {
    name: string | null;
    email: string;
    phone: string | null;
  };
  appointment?: {
    id: string;
    starts_at: Date;
    services: {
      name: string;
      duration_min: number;
      price_cents: number;
    };
  };
  amountCents: number;
  description?: string;
  paymentMethod?: string;
  platformFeeCents?: number; // Commission Holia
  practitionerAmountCents?: number; // Montant net versé au praticien (après commission et frais Stripe)
  stripeFeeCents?: number; // Frais Stripe réels
}

/**
 * Génère un numéro de facture unique au format FAC-YYYY-NNNN
 */
export async function generateInvoiceNumber(practitionerId: string): Promise<string> {
  const year = new Date().getFullYear();
  
  // Trouver le dernier numéro de facture de l'année pour ce praticien
  const lastInvoice = await prisma.invoices.findFirst({
    where: {
      practitioner_id: practitionerId,
      invoice_number: {
        startsWith: `FAC-${year}-`,
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });

  let sequence = 1;
  if (lastInvoice) {
    // Extraire le numéro de séquence du dernier numéro
    const match = lastInvoice.invoice_number.match(/FAC-\d{4}-(\d+)/);
    if (match) {
      sequence = parseInt(match[1], 10) + 1;
    }
  }

  return `FAC-${year}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Crée une facture dans la base de données
 */
export async function createInvoice(data: {
  practitionerId: string;
  appointmentId?: string;
  ticketId?: string; // Achat place événement
  userId?: string;
  amountCents: number;
  taxCents?: number;
  paymentMethod?: string;
  description?: string;
  status?: string;
  platformFeeCents?: number; // Optionnel : si fourni, utilisé directement
  practitionerAmountCents?: number; // Optionnel : si fourni, utilisé directement (doit être calculé avec frais Stripe)
  stripeFeeCents?: number; // Optionnel : frais Stripe réels
}): Promise<string> {
  const invoiceNumber = await generateInvoiceNumber(data.practitionerId);
  const totalCents = data.amountCents + (data.taxCents || 0);

  // Récupérer le praticien pour connaître son plan d'abonnement
  const practitioner = await prisma.practitioners.findUnique({
    where: { id: data.practitionerId },
    select: { subscription_status: true },
  });

  const subscriptionStatus = practitioner?.subscription_status || "free";

  // Calculer la commission Holia et le montant net du praticien
  // Si les valeurs sont déjà fournies (depuis le webhook), les utiliser
  // Sinon, les calculer selon le plan
  const platformFeeCents = data.platformFeeCents !== undefined 
    ? data.platformFeeCents 
    : calculateHoliaCommission(data.amountCents, subscriptionStatus);
  
  // Les frais Stripe réels (récupérés depuis balance_transaction)
  const stripeFeeCents = data.stripeFeeCents || 0;
  
  // Calculer le montant net du praticien : total - commission Holia - frais Stripe
  const practitionerAmountCents = data.practitionerAmountCents !== undefined
    ? data.practitionerAmountCents
    : data.amountCents - platformFeeCents - stripeFeeCents;

  const invoice = await prisma.invoices.create({
    data: {
      id: createId(),
      practitioner_id: data.practitionerId,
      appointment_id: data.appointmentId || null,
      ticket_id: data.ticketId || null,
      user_id: data.userId || null,
      invoice_number: invoiceNumber,
      amount_cents: data.amountCents,
      tax_cents: data.taxCents || 0,
      total_cents: totalCents,
      status: data.status || "sent",
      payment_method: data.paymentMethod || null,
      description: data.description || null,
      platform_fee_cents: platformFeeCents,
      practitioner_amount_cents: practitionerAmountCents,
      stripe_processing_fee_cents: stripeFeeCents > 0 ? stripeFeeCents : null,
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
      updated_at: new Date(),
    },
  });

  return invoice.id;
}

/**
 * Génère le contenu HTML de la facture (pour conversion en PDF)
 */
export function generateInvoiceHTML(data: InvoiceData, invoiceNumber?: string): string {
  const practitionerName = data.practitioner.first_name && data.practitioner.last_name
    ? `${data.practitioner.first_name} ${data.practitioner.last_name}`
    : data.practitioner.title;

  const practitionerAddress = data.practitioner.address
    ? `${data.practitioner.address}, ${data.practitioner.location_city}`
    : data.practitioner.location_city;

  const serviceName = data.appointment
    ? data.appointment.services.name
    : data.description || "Prestation";

  const serviceDate = data.appointment
    ? format(new Date(data.appointment.starts_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })
    : format(new Date(), "d MMMM yyyy", { locale: fr });

  // Calculer les montants pour l'affichage
  // Toujours afficher 3 lignes : Prestation, Frais Holia, Frais Stripe
  // IMPORTANT : Utiliser UNIQUEMENT les valeurs depuis la base de données (source de vérité Stripe)
  // Ne JAMAIS calculer avec des formules théoriques - tous les montants doivent venir de Stripe via balance_transaction
  const platformFeeCents = data.platformFeeCents ?? 0;
  const stripeFeeCents = data.stripeFeeCents ?? 0; // Doit être depuis stripe_processing_fee_cents (balance_transaction)
  const practitionerAmountCents = data.practitionerAmountCents ?? (data.amountCents - platformFeeCents - stripeFeeCents);
  
  // Vérifier que stripeFeeCents n'est pas 0 si c'est une facture Stripe (doit venir de balance_transaction)
  if (stripeFeeCents === 0 && data.paymentMethod === "stripe") {
    console.warn(`[Invoice Generator] stripeFeeCents is 0 for Stripe payment. Should be retrieved from balance_transaction.`);
  }
  
  // Le total doit être la somme des 3 lignes pour éviter les erreurs d'arrondi
  // Total = Prestation + Frais plateforme + Frais Stripe
  const calculatedTotalCents = practitionerAmountCents + platformFeeCents + stripeFeeCents;
  
  // Montants formatés
  const serviceAmount = (practitionerAmountCents / 100).toFixed(2);
  const platformFeeAmount = (platformFeeCents / 100).toFixed(2);
  const stripeFeeAmount = (stripeFeeCents / 100).toFixed(2);
  // Utiliser le total calculé pour éviter les erreurs d'arrondi
  const total = (calculatedTotalCents / 100).toFixed(2);
  
  // Récupérer le nom de la profession pour l'affichage
  const professionName = data.appointment?.services?.name || serviceName;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 40px;
            color: #333;
          }
          .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #6B7F5A;
          }
          .header-left h1 {
            margin: 0;
            color: #6B7F5A;
            font-size: 24px;
          }
          .header-right {
            text-align: right;
          }
          .info-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
          }
          .info-box {
            flex: 1;
            margin: 0 20px;
          }
          .info-box h3 {
            margin-top: 0;
            color: #6B7F5A;
            font-size: 14px;
            text-transform: uppercase;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
          }
          .info-box p {
            margin: 5px 0;
            font-size: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          th {
            background-color: #f5f5f0;
            font-weight: bold;
            color: #2C2C2C;
          }
          .text-right {
            text-align: right;
          }
          .total-section {
            margin-top: 20px;
            text-align: right;
          }
          .total-line {
            display: flex;
            justify-content: flex-end;
            margin: 5px 0;
          }
          .total-line-label {
            width: 150px;
            text-align: right;
            padding-right: 20px;
          }
          .total-line-amount {
            width: 100px;
            text-align: right;
          }
          .total-final {
            font-size: 18px;
            font-weight: bold;
            border-top: 2px solid #6B7F5A;
            padding-top: 10px;
            margin-top: 10px;
          }
          .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 11px;
            color: #666;
            text-align: center;
          }
          .vat-notice {
            margin-top: 20px;
            padding: 10px;
            background-color: #f5f5f0;
            font-size: 11px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <h1>FACTURE</h1>
          </div>
        <div class="header-right">
          ${invoiceNumber ? `<p><strong>Numéro:</strong> ${invoiceNumber}</p>` : ""}
          <p><strong>Date:</strong> ${format(new Date(), "d MMMM yyyy", { locale: fr })}</p>
        </div>
        </div>

        <div class="info-section">
          <div class="info-box">
            <h3>Praticien</h3>
            <p><strong>${practitionerName}</strong></p>
            <p>${practitionerAddress}</p>
            ${data.practitioner.phone ? `<p>Tél: ${data.practitioner.phone}</p>` : ""}
            ${data.practitioner.siret ? `<p>SIRET: ${data.practitioner.siret}</p>` : ""}
            <p>Email: ${data.practitioner.users.email}</p>
          </div>
          ${data.client ? `
          <div class="info-box">
            <h3>Client</h3>
            <p><strong>${data.client.name || "Client"}</strong></p>
            <p>${data.client.email}</p>
            ${data.client.phone ? `<p>Tél: ${data.client.phone}</p>` : ""}
          </div>
          ` : ""}
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Date</th>
              <th class="text-right">Montant HT</th>
              <th class="text-right">TVA</th>
              <th class="text-right">Total TTC</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Prestation ${professionName}</td>
              <td>${serviceDate}</td>
              <td class="text-right">${serviceAmount} €</td>
              <td class="text-right">0,00 €</td>
              <td class="text-right">${serviceAmount} €</td>
            </tr>
            <tr>
              <td>Frais de service plateforme</td>
              <td>-</td>
              <td class="text-right">${platformFeeAmount} €</td>
              <td class="text-right">0,00 €</td>
              <td class="text-right">${platformFeeAmount} €</td>
            </tr>
            ${data.paymentMethod === "stripe" ? `
            <tr>
              <td>Frais de traitement sécurisé</td>
              <td>-</td>
              <td class="text-right">${stripeFeeAmount} €</td>
              <td class="text-right">0,00 €</td>
              <td class="text-right">${stripeFeeAmount} €</td>
            </tr>
            ` : ""}
          </tbody>
        </table>

        <div class="total-section">
          <div class="total-line">
            <div class="total-line-label">Total HT:</div>
            <div class="total-line-amount">${total} €</div>
          </div>
          <div class="total-line">
            <div class="total-line-label">TVA (0%):</div>
            <div class="total-line-amount">0,00 €</div>
          </div>
          <div class="total-line total-final">
            <div class="total-line-label">Total TTC:</div>
            <div class="total-line-amount">${total} €</div>
          </div>
        </div>

        <div class="vat-notice">
          <p><strong>TVA non applicable, art. 293 B du CGI</strong></p>
          <p>Exonération de TVA pour les prestations de services relevant de l'activité de bien-être</p>
        </div>

        <div class="footer">
          <p>Cette facture a été générée automatiquement par Holia.</p>
          <p>En cas de question, contactez votre praticien.</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Envoie la facture par email au client
 */
export async function sendInvoiceEmail(
  invoiceId: string,
  clientEmail: string,
  clientName: string | null,
  practitionerName: string
): Promise<void> {

  await sendEmail({
    invoiceId,
    clientEmail,
    clientName,
    practitionerName,
  });
}

