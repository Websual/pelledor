import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { createId } from "@paralleldrive/cuid2";
import { createInvoice } from "@/lib/invoice-generator";
import { sendInvoiceEmail } from "@/lib/emails";

import { z } from "zod";

const createInvoiceSchema = z.object({
  appointmentId: z.string().optional(),
  userId: z.string().optional(),
  amountCents: z.number().min(1, "Montant requis"),
  description: z.string().min(1, "Description requise"),
  paymentMethod: z.enum(["stripe", "cash", "check", "bank_transfer", "other"]).optional(),
  sendEmail: z.boolean().optional().default(false),
  // Pour factures libres avec nouveau client
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional(),
  clientPhone: z.string().optional(),
});

// GET: Récupérer les factures du praticien
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

    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get("month"); // Format: YYYY-MM
    const status = searchParams.get("status");

    const where: any = {
      practitioner_id: practitioner.id,
    };

    if (month) {
      const [year, monthNum] = month.split("-");
      const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59);
      where.created_at = {
        gte: startDate,
        lte: endDate,
      };
    }

    if (status) {
      where.status = status;
    }

    const invoices = await prisma.invoices.findMany({
      where,
      include: {
        appointments: {
          include: {
            services: {
              select: {
                name: true,
                duration_min: true,
              },
            },
            users: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        users: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

// POST: Créer une facture (manuelle ou automatique)
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validatedData = createInvoiceSchema.parse(body);

    // Si appointmentId est fourni, récupérer les infos du rendez-vous
    let appointment = null;
    let userId = validatedData.userId;

    if (validatedData.appointmentId) {
      appointment = await prisma.appointments.findFirst({
        where: {
          id: validatedData.appointmentId,
          practitioner_id: practitioner.id,
        },
        include: {
          services: true,
          users: true,
        },
      });

      if (!appointment) {
        return NextResponse.json(
          { error: "Appointment not found" },
          { status: 404 }
        );
      }

      userId = appointment.user_id;
    } else if (!userId && validatedData.clientEmail) {
      // Créer un nouveau client si nécessaire (facture libre)

      const existingUser = await prisma.users.findFirst({
        where: { email: validatedData.clientEmail },
      });

      if (existingUser) {
        userId = existingUser.id;
        // Mettre à jour les infos si fournies
        if (validatedData.clientName || validatedData.clientPhone) {
          await prisma.users.update({
            where: { id: userId },
            data: {
              ...(validatedData.clientName && { name: validatedData.clientName }),
              ...(validatedData.clientPhone && { phone: validatedData.clientPhone }),
            },
          });
        }
      } else {
        // Créer un nouvel utilisateur client
        const newUser = await prisma.users.create({
          data: {
            id: createId(),
            name: validatedData.clientName || null,
            email: validatedData.clientEmail,
            phone: validatedData.clientPhone || null,
            hashed_password: "",
            role: "CLIENT" as any,
          } as any,
        });
        userId = newUser.id;
      }
    }

    // Créer la facture
    const invoiceId = await createInvoice({
      practitionerId: practitioner.id,
      appointmentId: validatedData.appointmentId,
      userId: userId,
      amountCents: validatedData.amountCents,
      paymentMethod: validatedData.paymentMethod || "cash",
      description: validatedData.description,
      status: validatedData.paymentMethod === "stripe" ? "paid" : "sent",
    });

    // Si sendEmail est true, envoyer la facture par email
    if (validatedData.sendEmail) {
      let clientEmail: string;
      let clientName: string | null;

      if (appointment) {
        clientEmail = appointment.users.email;
        clientName = appointment.users.name;
      } else if (userId) {
        const user = await prisma.users.findUnique({
          where: { id: userId },
          select: { email: true, name: true },
        });
        clientEmail = user?.email || validatedData.clientEmail || "";
        clientName = user?.name || validatedData.clientName || null;
      } else {
        clientEmail = validatedData.clientEmail || "";
        clientName = validatedData.clientName || null;
      }

      if (clientEmail) {
        const practitionerName = (practitioner as any).title || (practitioner as any).practitioners?.title || "Praticien";
        await sendInvoiceEmail({
          invoiceId,
          clientEmail,
          clientName,
          practitionerName,
        });
      }
    }

    // Récupérer la facture créée
    const invoice = await prisma.invoices.findUnique({
      where: { id: invoiceId },
      include: {
        appointments: {
          include: {
            services: true,
            users: true,
          },
        },
        users: true,
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}

