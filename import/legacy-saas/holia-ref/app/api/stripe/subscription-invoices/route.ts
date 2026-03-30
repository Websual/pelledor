import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
      select: { stripe_customer_id: true },
    });

    if (!practitioner?.stripe_customer_id) {
      return NextResponse.json({ invoices: [] });
    }

    const invoices = await stripe.invoices.list({
      customer: practitioner.stripe_customer_id,
      limit: 24,
      status: "paid",
    });

    const formatted = invoices.data
      .filter(
        (invoice) =>
          invoice.status === "paid" &&
          invoice.billing_reason &&
          invoice.billing_reason.toLowerCase().startsWith("subscription")
      )
      .map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
        status: invoice.status,
        billingReason: invoice.billing_reason,
        created: invoice.created,
        periodStart: invoice.period_start,
        periodEnd: invoice.period_end,
      }));

    return NextResponse.json({ invoices: formatted });
  } catch (error) {
    console.error("Error fetching Stripe subscription invoices:", error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}
