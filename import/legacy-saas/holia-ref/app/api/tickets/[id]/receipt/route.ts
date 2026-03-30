import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { jsPDF } from "jspdf";

const HOLIA_GREEN = "#9bb49b";
const HOLIA_GREEN_DARK = "#7a947a";
const ANTHRACITE = "#2f2f2f";
const GRAY = "#666666";
const LIGHT_GRAY = "#f7f7f7";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Non autorisé", { status: 401 });
    }

    const { id: ticketId } = await params;

    const ticket = await prisma.tickets.findUnique({
      where: { id: ticketId, status: "confirmed" },
      include: {
        events: {
          include: {
            practitioners: {
              select: {
                location_city: true,
                address: true,
                user_id: true,
              },
            },
          },
        },
        users: { select: { name: true } },
      },
    });

    if (!ticket) {
      return new NextResponse("Billet introuvable", { status: 404 });
    }

    const isOwner = ticket.user_id === session.user.id;
    const isPractitioner =
      ticket.events?.practitioners?.user_id === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    if (!isOwner && !isPractitioner && !isAdmin) {
      return new NextResponse("Accès refusé", { status: 403 });
    }

    const event = ticket.events;
    const practitioner = event.practitioners;
    const address =
      event.address ||
      practitioner?.address ||
      practitioner?.location_city ||
      "Lieu à préciser";

    const formattedDate = format(event.date, "EEEE d MMMM yyyy 'à' HH:mm", {
      locale: fr,
    });
    const priceStr =
      event.price_cents === 0 ? "Gratuit" : `${(event.price_cents / 100).toFixed(2)} €`;

    // Code de réservation unique (8 derniers caractères du ticket id en majuscules)
    const reservationCode = `HL-${ticketId.slice(-8).toUpperCase()}`;

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 0;

    // --- Header vert Holia.me ---
    doc.setFillColor(155, 180, 155); // #9bb49b
    doc.rect(0, 0, pageWidth, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Holia.me", margin, 18);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Reçu de réservation", margin, 26);

    y = 45;

    // --- Code de réservation en gros ---
    doc.setTextColor(ANTHRACITE);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Code de réservation", margin, y);
    y += 4;
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(HOLIA_GREEN_DARK);
    doc.text(reservationCode, margin, y);
    y += 14;

    // --- Titre événement ---
    doc.setTextColor(ANTHRACITE);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(event.title, margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(GRAY);
    doc.text("Billet confirmé", margin, y);
    y += 12;

    // --- Cadre détails ---
    const detailsY = y;
    doc.setFillColor(LIGHT_GRAY);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 50, 3, 3, "F");
    y += 10;
    doc.setTextColor(ANTHRACITE);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Détails", margin + 5, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const row = (label: string, value: string) => {
      doc.setTextColor(GRAY);
      doc.text(label, margin + 5, y);
      doc.setTextColor(ANTHRACITE);
      doc.text(value, margin + 55, y);
      y += 6;
    };

    row("Participant", ticket.users?.name || "—");
    row("Date et heure", formattedDate);
    row("Lieu", address.length > 50 ? address.slice(0, 47) + "…" : address);
    row("Quantité", `${ticket.quantity} place(s)`);
    row("Montant", priceStr);

    y += 18;

    // --- Footer ---
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
    doc.setFontSize(9);
    doc.setTextColor(GRAY);
    doc.text(
      "Ce billet est valable pour l'événement indiqué. Présentez ce document à l'entrée.",
      margin,
      y
    );
    y += 5;
    doc.text("Holia - Plateforme bien-être • holia.me", margin, y);

    const pdfBuffer = doc.output("arraybuffer");
    const filename = `billet-${event.title.replace(/[^a-z0-9]/gi, "-").toLowerCase().slice(0, 40)}-${reservationCode}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error("Error generating ticket receipt PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate receipt" },
      { status: 500 }
    );
  }
}
