import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface FeeStatementData {
  practitioner: {
    title: string;
    first_name: string | null;
    last_name: string | null;
    siret: string | null;
    address: string | null;
    location_city: string;
    email: string;
  };
  month: string;
  feeDetails: Array<{
    date: Date;
    service: string;
    client: string;
    totalCents: number;
    platformFeeCents: number;
    stripeFeeCents: number;
    netCents: number;
  }>;
  totalRevenue: number;
  totalFees: number;
  totalNet: number;
  rowCount: number;
}

/**
 * Génère le contenu HTML du Récapitulatif Mensuel d'Activité et de Frais
 */
export function generateFeeStatementHTML(data: FeeStatementData): string {
  const practitionerName = data.practitioner.first_name && data.practitioner.last_name
    ? `${data.practitioner.first_name} ${data.practitioner.last_name}`
    : data.practitioner.title;

  const practitionerAddress = data.practitioner.address
    ? `${data.practitioner.address}, ${data.practitioner.location_city}`
    : data.practitioner.location_city;

  const volumeCollecte = (data.totalRevenue / 100).toFixed(2).replace(".", ",");
  const fraisTiers = (data.totalFees / 100).toFixed(2).replace(".", ",");
  const caNet = (data.totalNet / 100).toFixed(2).replace(".", ",");

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
          .header-right p { margin: 4px 0; font-size: 14px; }
          .info-section {
            margin-bottom: 40px;
          }
          .info-box {
            margin-bottom: 20px;
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
          .summary-box {
            background-color: #f5f5f0;
            padding: 24px;
            border-radius: 1.5rem;
            margin-bottom: 30px;
          }
          .summary-box h3 {
            margin-top: 0;
            margin-bottom: 16px;
            color: #6B7F5A;
            font-size: 14px;
            text-transform: uppercase;
          }
          .summary-line {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            font-size: 14px;
          }
          .summary-line.net {
            font-weight: bold;
            font-size: 16px;
            margin-top: 8px;
            padding-top: 12px;
            border-top: 2px solid #6B7F5A;
          }
          .table-wrapper {
            border-radius: 1.5rem;
            overflow: hidden;
            border: 1px solid #e5e5e0;
            margin-bottom: 30px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e5e0;
          }
          th {
            background-color: #f5f5f0;
            font-weight: bold;
            color: #2C2C2C;
            font-size: 12px;
          }
          .text-right {
            text-align: right;
          }
          .footer {
            margin-top: 48px;
            padding: 24px;
            border-radius: 1.5rem;
            border: 1px solid #e5e5e0;
            font-size: 11px;
            color: #555;
            line-height: 1.5;
          }
          .footer p { margin: 8px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <h1>Récapitulatif Mensuel d'Activité et de Frais</h1>
          </div>
          <div class="header-right">
            <p><strong>Période:</strong> ${data.month}</p>
            <p><strong>Date d'émission:</strong> ${format(new Date(), "d MMMM yyyy", { locale: fr })}</p>
          </div>
        </div>

        <div class="info-section">
          <div class="info-box">
            <h3>Praticien</h3>
            <p><strong>${practitionerName}</strong></p>
            <p>${practitionerAddress}</p>
            ${data.practitioner.siret ? `<p>SIRET: ${data.practitioner.siret}</p>` : ""}
            <p>Email: ${data.practitioner.email}</p>
          </div>
        </div>

        <div class="summary-box">
          <h3>Résumé</h3>
          <div class="summary-line">
            <span>Volume d'affaires collecté</span>
            <span>${volumeCollecte} €</span>
          </div>
          <div class="summary-line">
            <span>Frais de service tiers (Holia + Stripe)</span>
            <span>${fraisTiers} €</span>
          </div>
          <div class="summary-line net">
            <span>Chiffre d'Affaires Net à déclarer</span>
            <span>${caNet} €</span>
          </div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Client</th>
                <th>Prestation</th>
                <th class="text-right">Frais Holia</th>
                <th class="text-right">Frais Stripe</th>
                <th class="text-right">CA Net Praticien</th>
              </tr>
            </thead>
            <tbody>
              ${data.feeDetails.map((detail) => `
                <tr>
                  <td>${format(new Date(detail.date), "d MMM yyyy", { locale: fr })}</td>
                  <td>${detail.client}</td>
                  <td>${detail.service}</td>
                  <td class="text-right">${(detail.platformFeeCents / 100).toFixed(2).replace(".", ",")} €</td>
                  <td class="text-right">${(detail.stripeFeeCents / 100).toFixed(2).replace(".", ",")} €</td>
                  <td class="text-right">${(detail.netCents / 100).toFixed(2).replace(".", ",")} €</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p><strong>Note légale</strong></p>
          <p>Conformément à nos CGU et au mandat de facturation, Holia et Stripe perçoivent leurs frais de service directement auprès de l'utilisateur final. Le montant « CA Net » correspond à votre prestation réelle à déclarer.</p>
        </div>
      </body>
    </html>
  `;
}
