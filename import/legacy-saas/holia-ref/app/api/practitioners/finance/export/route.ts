import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from "date-fns";

/** Échappe un champ CSV : entoure de guillemets si contient virgule ou guillemet. */
function escapeCsvField(value: string): string {
  const s = String(value ?? "").trim();
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Montant en euros avec point décimal (pour CSV). */
function centsToEuro(cents: number | null | undefined): string {
  if (cents == null) return "0.00";
  return (cents / 100).toFixed(2);
}

/**
 * GET: Export comptable des factures (CSV) – modèle fiscal type Airbnb.
 * Query: period=current_month | last_month | full_year
 * Uniquement les factures status === 'PAID'.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
      select: { id: true },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "full_year";

    const now = new Date();
    let dateFrom: Date | null = null;
    let dateTo: Date | null = null;

    switch (period) {
      case "current_month":
        dateFrom = startOfMonth(now);
        dateTo = endOfMonth(now);
        break;
      case "last_month":
        const lastMonth = subMonths(now, 1);
        dateFrom = startOfMonth(lastMonth);
        dateTo = endOfMonth(lastMonth);
        break;
      case "full_year":
        dateFrom = startOfYear(now);
        dateTo = endOfYear(now);
        break;
      default:
        dateFrom = startOfYear(now);
        dateTo = endOfYear(now);
    }

    const invoices = await prisma.invoices.findMany({
      where: {
        practitioner_id: practitioner.id,
        status: "paid",
        ...(dateFrom && dateTo
          ? {
              OR: [
                {
                  paid_at: {
                    gte: dateFrom,
                    lte: dateTo,
                  },
                },
                {
                  paid_at: null,
                  created_at: {
                    gte: dateFrom,
                    lte: dateTo,
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        appointments: {
          include: {
            services: { select: { name: true } },
            users: { select: { name: true, email: true } },
          },
        },
        tickets: {
          include: {
            events: { select: { title: true } },
            users: { select: { name: true, email: true } },
          },
        },
        users: { select: { name: true, email: true } },
      },
      orderBy: { created_at: "asc" },
    });

    const csvHeader = [
      "Numéro de facture",
      "Date",
      "Type",
      "Client",
      "Prestation (Net Professionnel)",
      "Frais Holia",
      "Frais Stripe",
      "Total Payé par Client",
      "Statut",
    ].join(",");

    const csvRows = invoices.map((inv) => {
      const typeLabel = inv.ticket_id ? "Événement" : "Consultation";
      const clientName =
        inv.appointments?.users?.name ??
        inv.tickets?.users?.name ??
        inv.users?.name ??
        "Client";
      const dateStr = inv.paid_at
        ? format(new Date(inv.paid_at), "dd/MM/yyyy")
        : format(new Date(inv.created_at), "dd/MM/yyyy");

      const netPro = inv.practitioner_amount_cents ?? 0;
      const platformFee = inv.platform_fee_cents ?? 0;
      const stripeFee = inv.stripe_processing_fee_cents ?? 0;
      const total = inv.total_cents ?? 0;

      return [
        escapeCsvField(inv.invoice_number),
        dateStr,
        typeLabel,
        escapeCsvField(clientName),
        centsToEuro(netPro),
        centsToEuro(platformFee),
        centsToEuro(stripeFee),
        centsToEuro(total),
        inv.status,
      ].join(",");
    });

    const csvContent = [csvHeader, ...csvRows].join("\n");
    const filename = `export-comptable-${period}-${format(now, "yyyy-MM-dd")}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting finance data:", error);
    return NextResponse.json(
      { error: "Failed to export finance data" },
      { status: 500 }
    );
  }
}
