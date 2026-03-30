import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateInvoiceHTML } from "@/lib/invoice-generator";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync, readFileSync } from "fs";

/**
 * GET: Génère et retourne le PDF d'une facture
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    // Récupérer la facture
    const invoice = await prisma.invoices.findUnique({
      where: { id },
      include: {
        practitioners: {
          include: {
            users: {
              select: {
                email: true,
              },
            },
          },
        },
        appointments: {
          include: {
            services: {
              select: {
                name: true,
                duration_min: true,
                price_cents: true,
              },
            },
            users: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        users: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Exiger une session : seul le praticien propriétaire ou un admin peut voir la facture
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isPractitioner = session.user.role === "PRACTITIONER" &&
      invoice.practitioners.user_id === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    if (!isPractitioner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Si le PDF existe déjà, le retourner
    if (invoice.pdf_url) {
      let pdfPath: string | null = null;
      
      // Vérifier d'abord dans le nouveau chemin (/uploads/invoices/)
      if (invoice.pdf_url.startsWith("/uploads/invoices/")) {
        pdfPath = join("/var/www/holia-assets/public", invoice.pdf_url);
      }
      // Fallback pour les anciens PDFs dans /invoices/ (public/invoices)
      else if (invoice.pdf_url.startsWith("/invoices/")) {
        // Ancien chemin dans /holia-assets/public/uploads/ (pas dans holia.me/public/)
        const oldPath = join("/var/www/holia-assets/public/uploads", invoice.pdf_url.replace(/^\//, ""));
        const newPath = join("/var/www/holia-assets/public/uploads", invoice.pdf_url);
        
        // Si le fichier existe dans l'ancien emplacement, le migrer
        if (existsSync(oldPath)) {
          try {
            const pdfBuffer = readFileSync(oldPath);
            await mkdir("/var/www/holia-assets/public/uploads/invoices", { recursive: true });
            await writeFile(newPath, pdfBuffer);
            // Mettre à jour l'URL dans la DB
            await prisma.invoices.update({
              where: { id },
              data: { pdf_url: `/uploads${invoice.pdf_url}` },
            });
            pdfPath = newPath;
          } catch (error) {
            console.error("Error migrating PDF:", error);
            pdfPath = oldPath; // Fallback sur l'ancien chemin
          }
        } else if (existsSync(newPath)) {
          pdfPath = newPath;
        }
      }
      
      if (pdfPath && existsSync(pdfPath)) {
        const pdfBuffer = readFileSync(pdfPath);
        return new NextResponse(new Uint8Array(pdfBuffer), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="facture-${invoice.invoice_number}.pdf"`,
          },
        });
      }
    }

    // Préparer les données pour la génération HTML
    const invoiceData = {
      practitioner: {
        id: invoice.practitioners.id,
        title: invoice.practitioners.title,
        first_name: invoice.practitioners.first_name,
        last_name: invoice.practitioners.last_name,
        siret: invoice.practitioners.siret,
        address: invoice.practitioners.address,
        location_city: invoice.practitioners.location_city,
        phone: invoice.practitioners.phone,
        users: {
          email: invoice.practitioners.users.email,
        },
      },
      client: invoice.appointments?.users || invoice.users ? {
        name: invoice.appointments?.users.name || invoice.users?.name || null,
        email: invoice.appointments?.users.email || invoice.users?.email || "",
        phone: invoice.appointments?.users.phone || invoice.users?.phone || null,
      } : undefined,
      appointment: invoice.appointments ? {
        id: invoice.appointments.id,
        starts_at: invoice.appointments.starts_at,
        services: invoice.appointments.services,
      } : undefined,
      amountCents: invoice.amount_cents,
      description: invoice.description || undefined,
      paymentMethod: invoice.payment_method || undefined,
      // Utiliser UNIQUEMENT les valeurs depuis la base de données (source de vérité Stripe)
      // stripe_processing_fee_cents doit toujours venir de balance_transaction, jamais calculé théoriquement
      platformFeeCents: invoice.platform_fee_cents ?? undefined,
      practitionerAmountCents: invoice.practitioner_amount_cents ?? undefined,
      stripeFeeCents: invoice.stripe_processing_fee_cents ?? undefined, // Doit être depuis balance_transaction
    };

    // Générer le HTML avec le numéro de facture
    const html = generateInvoiceHTML(invoiceData, invoice.invoice_number);

    // Générer le PDF avec Puppeteer
    let pdfBuffer: Buffer;
    
    try {
      // Importer puppeteer de manière synchrone d'abord pour vérifier qu'il est disponible
      const puppeteer = require("puppeteer");
      
      if (!puppeteer) {
        throw new Error("Puppeteer module not found. Please install it: npm install puppeteer");
      }

      console.log("[PDF Generation] Launching browser...");
      
      // Configuration du lancement du navigateur
      const launchOptions: any = {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--single-process", // Important pour certains environnements
          "--disable-gpu",
        ],
        // Essayer d'utiliser le Chrome installé par puppeteer
        // Si les dépendances système manquent, cela échouera avec une erreur claire
      };

      // Vérifier si PUPPETEER_EXECUTABLE_PATH est défini (pour utiliser un Chrome système)
      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      }

      const browser = await puppeteer.launch(launchOptions);

      try {
        console.log("[PDF Generation] Creating new page...");
        const page = await browser.newPage();
        
        console.log("[PDF Generation] Setting content...");
        await page.setContent(html, { 
          waitUntil: "networkidle0",
          timeout: 30000,
        });
        
        console.log("[PDF Generation] Generating PDF...");
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
        
        console.log("[PDF Generation] PDF generated successfully, size:", pdfBuffer.length, "bytes");
      } finally {
        await browser.close();
      }
    } catch (error: any) {
      console.error("[PDF Generation] Error details:", {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
      });
      
      // Vérifier si c'est une erreur de dépendances système
      const isSystemDependencyError = error?.message?.includes("shared libraries") || 
                                      error?.message?.includes("libatk") ||
                                      error?.message?.includes("Could not find Chrome");
      
      if (isSystemDependencyError) {
        console.error("[PDF Generation] Missing system dependencies for Chrome. Install with:");
        console.error("  sudo apt-get update && sudo apt-get install -y \\");
        console.error("    ca-certificates \\");
        console.error("    fonts-liberation \\");
        console.error("    libappindicator3-1 \\");
        console.error("    libasound2 \\");
        console.error("    libatk-bridge2.0-0 \\");
        console.error("    libatk1.0-0 \\");
        console.error("    libc6 \\");
        console.error("    libcairo2 \\");
        console.error("    libcups2 \\");
        console.error("    libdbus-1-3 \\");
        console.error("    libexpat1 \\");
        console.error("    libfontconfig1 \\");
        console.error("    libgbm1 \\");
        console.error("    libgcc1 \\");
        console.error("    libglib2.0-0 \\");
        console.error("    libgtk-3-0 \\");
        console.error("    libnspr4 \\");
        console.error("    libnss3 \\");
        console.error("    libpango-1.0-0 \\");
        console.error("    libpangocairo-1.0-0 \\");
        console.error("    libstdc++6 \\");
        console.error("    libx11-6 \\");
        console.error("    libx11-xcb1 \\");
        console.error("    libxcb1 \\");
        console.error("    libxcomposite1 \\");
        console.error("    libxcursor1 \\");
        console.error("    libxdamage1 \\");
        console.error("    libxext6 \\");
        console.error("    libxfixes3 \\");
        console.error("    libxi6 \\");
        console.error("    libxrandr2 \\");
        console.error("    libxrender1 \\");
        console.error("    libxss1 \\");
        console.error("    libxtst6 \\");
        console.error("    lsb-release \\");
        console.error("    wget \\");
        console.error("    xdg-utils");
      }
      
      // Retourner une erreur plus détaillée pour le débogage
      const errorMessage = isSystemDependencyError
        ? "Les dépendances système Chrome sont manquantes. Exécutez le script install-puppeteer-deps.sh sur le serveur pour les installer."
        : error?.message || "Erreur inconnue lors de la génération du PDF";
      
      return NextResponse.json(
        { 
          error: "PDF generation failed",
          details: errorMessage,
          hint: isSystemDependencyError 
            ? "Exécutez sur le serveur: bash /var/www/holia.me/install-puppeteer-deps.sh"
            : "Vérifiez les logs serveur pour plus de détails. Assurez-vous que puppeteer est installé: npm install puppeteer"
        },
        { status: 500 }
      );
    }

    // Sauvegarder le PDF dans /holia-assets/public/uploads/invoices/
    const invoicesDir = "/var/www/holia-assets/public/uploads/invoices";
    if (!existsSync(invoicesDir)) {
      await mkdir(invoicesDir, { recursive: true });
    }

    const pdfPath = join(invoicesDir, `facture-${invoice.invoice_number}.pdf`);
    await writeFile(pdfPath, pdfBuffer);

    // Mettre à jour l'URL du PDF dans la base de données
    const pdfUrl = `/uploads/invoices/facture-${invoice.invoice_number}.pdf`;
    await prisma.invoices.update({
      where: { id },
      data: {
        pdf_url: pdfUrl,
      },
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="facture-${invoice.invoice_number}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

