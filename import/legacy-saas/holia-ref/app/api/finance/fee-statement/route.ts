import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateFeeStatementHTML } from "@/lib/fee-statement-generator";


import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync, readFileSync } from "fs";

/**
 * GET: Génère un relevé de commissions mensuel pour les praticiens Freemium
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
      select: {
        id: true,
        subscription_status: true,
        title: true,
        first_name: true,
        last_name: true,
        siret: true,
        address: true,
        location_city: true,
        users: {
          select: {
            email: true,
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

    // Vérifier que c'est un praticien Freemium
    if (practitioner.subscription_status === "active") {
      return NextResponse.json(
        { error: "Premium practitioners don't have fee statements. Use Stripe Customer Portal for invoices." },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const monthParam = searchParams.get("month"); // Format: YYYY-MM

    // Si aucun mois n'est spécifié, utiliser le mois en cours
    const now = new Date();
    const [year, month] = monthParam
      ? monthParam.split("-").map(Number)
      : [now.getFullYear(), now.getMonth() + 1];

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Récupérer les factures PAID du praticien pour ce mois (logique fiscale type Airbnb)
    const invoices = await prisma.invoices.findMany({
      where: {
        practitioner_id: practitioner.id,
        status: { equals: "PAID", mode: "insensitive" },
        OR: [
          {
            paid_at: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            paid_at: null,
            created_at: {
              gte: startDate,
              lte: endDate,
            },
          },
        ],
      },
      include: {
        appointments: {
          include: {
            services: { select: { name: true } },
            users: { select: { name: true, email: true } },
          },
        },
        users: { select: { name: true, email: true } },
      },
      orderBy: { created_at: "asc" },
    });

    console.log(`[Fee Statement] ${invoices.length} facture(s) trouvée(s) pour ${format(startDate, "MMMM yyyy", { locale: fr })} (practitioner ${practitioner.id})`);

    const feeDetails = invoices.map((inv) => {
      const date = inv.paid_at ? new Date(inv.paid_at) : new Date(inv.created_at);
      const clientName = inv.appointments?.users?.name ?? inv.users?.name ?? inv.appointments?.users?.email ?? inv.users?.email ?? "Client";
      const serviceName = inv.appointments?.services?.name ?? inv.description ?? "Prestation";
      const totalCents = inv.total_cents ?? 0;
      // Fallback 8% si platform_fee_cents non renseigné (factures anciennes)
      const platformFeeCents = inv.platform_fee_cents ?? Math.round(totalCents * 0.08);
      const stripeFeeCents = inv.stripe_processing_fee_cents ?? 0;
      const netCents = inv.practitioner_amount_cents ?? totalCents - platformFeeCents - stripeFeeCents;
      return {
        date,
        service: serviceName,
        client: clientName,
        totalCents,
        platformFeeCents,
        stripeFeeCents,
        netCents,
      };
    });

    const totalRevenue = feeDetails.reduce((sum, d) => sum + d.totalCents, 0);
    const totalPlatformFees = feeDetails.reduce((sum, d) => sum + d.platformFeeCents, 0);
    const totalStripeFees = feeDetails.reduce((sum, d) => sum + d.stripeFeeCents, 0);
    const totalFees = totalPlatformFees + totalStripeFees;
    const totalNet = feeDetails.reduce((sum, d) => sum + d.netCents, 0);

    if (invoices.length === 0) {
      return NextResponse.json(
        { error: `Aucune facture payée pour ${format(startDate, "MMMM yyyy", { locale: fr })}` },
        { status: 404 }
      );
    }

    const html = generateFeeStatementHTML({
      practitioner: {
        title: practitioner.title,
        first_name: practitioner.first_name,
        last_name: practitioner.last_name,
        siret: practitioner.siret,
        address: practitioner.address,
        location_city: practitioner.location_city,
        email: practitioner.users.email,
      },
      month: format(startDate, "MMMM yyyy", { locale: fr }),
      feeDetails,
      totalRevenue,
      totalFees,
      totalNet,
      rowCount: feeDetails.length,
    });

    // Générer le PDF (même logique que pour les factures)
    let pdfBuffer: Buffer;
    
    try {
      const puppeteer = await import("puppeteer").catch(() => null);
      
      if (puppeteer) {
        const browser = await puppeteer.default.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        try {
          const page = await browser.newPage();
          await page.setContent(html, { waitUntil: "networkidle0" });
          
          pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
              top: "20mm",
              right: "15mm",
              bottom: "20mm",
              left: "15mm",
            },
          });
        } finally {
          await browser.close();
        }
      } else {
        return NextResponse.json(
          { error: "PDF generation requires puppeteer. Please install it: npm install puppeteer" },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      return NextResponse.json(
        { error: "Failed to generate PDF" },
        { status: 500 }
      );
    }

    // Sauvegarder le PDF dans /holia-assets/public/uploads/fee-statements/
    const statementsDir = "/var/www/holia-assets/public/uploads/fee-statements";
    if (!existsSync(statementsDir)) {
      await mkdir(statementsDir, { recursive: true });
    }

    const fileName = `releve-commissions-${year}-${String(month).padStart(2, "0")}-${practitioner.id}.pdf`;
    const pdfPath = join(statementsDir, fileName);
    await writeFile(pdfPath, pdfBuffer);

    const pdfUrl = `/uploads/fee-statements/${fileName}`;

    // Retourner le PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Error generating fee statement:", error);
    return NextResponse.json(
      { error: "Failed to generate fee statement" },
      { status: 500 }
    );
  }
}

