import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFeeBreakdown, calculateHoliaCommission, calculateStripeProcessingFees } from "@/lib/stripe-fees";
import { stripe } from "@/lib/stripe";


export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Trouver le praticien associé à l'utilisateur avec le statut d'abonnement
    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
      select: {
        id: true,
        subscription_status: true,
        stripe_account_id: true,
      },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    // Calculer les dates pour les statistiques
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Récupérer uniquement les rendez-vous PAYÉS (payment_status === 'PAID')
    // Exclure les rendez-vous annulés ou en attente de paiement
    const paidAppointments = await prisma.appointments.findMany({
      where: {
        practitioner_id: practitioner.id,
        payment_status: "PAID",
        status: {
          not: "CANCELED", // Exclure les rendez-vous annulés
        },
      } as any,
      include: {
        services: {
          select: {
            id: true,
            name: true,
            price_cents: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }) as any;

    // Récupérer les factures pour obtenir les montants réels depuis Stripe (source de vérité)
    // Calcul : total_amount - platform_fee - stripe_fee (depuis balance_transaction)
    const appointmentInvoicesForRevenue = await prisma.invoices.findMany({
      where: {
        appointment_id: {
          in: paidAppointments.map(apt => apt.id),
        },
        payment_method: "stripe",
        status: "paid",
      },
      select: {
        appointment_id: true,
        amount_cents: true, // total_amount
        platform_fee_cents: true, // commission Holia
        stripe_processing_fee_cents: true, // frais Stripe réels depuis balance_transaction
        practitioner_amount_cents: true, // montant net (pour fallback si les autres champs manquent)
      },
    });
    
    // Créer une map pour accéder rapidement aux montants depuis les factures
    // Source de vérité : UNIQUEMENT les factures avec TOUS les champs remplis depuis Stripe
    // Ne JAMAIS utiliser de calcul théorique
    const invoiceRevenueMap = new Map<string, number>();
    appointmentInvoicesForRevenue.forEach(inv => {
      if (inv.appointment_id && 
          inv.practitioner_amount_cents !== null &&
          inv.platform_fee_cents !== null &&
          inv.stripe_processing_fee_cents !== null) {
        // Utiliser UNIQUEMENT practitioner_amount_cents depuis la DB (source de vérité)
        invoiceRevenueMap.set(inv.appointment_id, inv.practitioner_amount_cents);
        console.log(`[Finance] Invoice for appointment ${inv.appointment_id}: practitioner_amount_cents = ${inv.practitioner_amount_cents} cents`);
      } else if (inv.appointment_id) {
        console.warn(`[Finance] Invoice for appointment ${inv.appointment_id} missing required fields - excluding from revenue calculation`);
      }
    });
    
    // Revenus consultations (RDV uniquement)
    const consultationsRevenueCents = paidAppointments.reduce((sum, apt) => {
      const revenue = invoiceRevenueMap.get(apt.id);
      return revenue !== undefined ? sum + revenue : sum;
    }, 0);

    // Revenus événements (factures liées aux tickets)
    const eventInvoicesForRevenue = await prisma.invoices.findMany({
      where: {
        practitioner_id: practitioner.id,
        ticket_id: { not: null },
        payment_method: "stripe",
        status: "paid",
      },
      select: {
        ticket_id: true,
        practitioner_amount_cents: true,
        platform_fee_cents: true,
        stripe_processing_fee_cents: true,
        paid_at: true,
        created_at: true,
      },
    });

    const eventsRevenueCents = eventInvoicesForRevenue
      .filter((inv) => inv.practitioner_amount_cents != null)
      .reduce((sum, inv) => sum + (inv.practitioner_amount_cents ?? 0), 0);

    const monthEventRevenueCents = eventInvoicesForRevenue
      .filter((inv) => {
        const date = inv.paid_at ?? inv.created_at;
        return date && new Date(date) >= startOfMonth && new Date(date) <= endOfMonth;
      })
      .reduce((sum, inv) => sum + (inv.practitioner_amount_cents ?? 0), 0);

    // Revenus totaux = consultations + événements (avant cartes cadeaux)
    const totalRevenueCents = consultationsRevenueCents + eventsRevenueCents;

    // Revenus du mois = consultations du mois + événements du mois
    const monthAppointments = paidAppointments.filter((apt) => {
      const aptDate = new Date(apt.starts_at);
      return aptDate >= startOfMonth && aptDate <= endOfMonth;
    });
    const monthConsultationsCents = monthAppointments.reduce((sum, apt) => {
      const revenue = invoiceRevenueMap.get(apt.id);
      return revenue !== undefined ? sum + revenue : sum;
    }, 0);
    const monthRevenueCents = monthConsultationsCents + monthEventRevenueCents;

    // Les revenus payés = tous les revenus (car on filtre déjà par payment_status === 'PAID')
    const paidRevenueCents = totalRevenueCents;

    // Les revenus en attente = 0 (car on ne compte que les payés)
    const pendingRevenueCents = 0;

    // Récupérer les factures du praticien (RDV + événements + libres)
    const allInvoices = await prisma.invoices.findMany({
      where: {
        practitioner_id: practitioner.id,
      },
      include: {
        appointments: {
          include: {
            services: {
              select: {
                name: true,
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
        tickets: {
          include: {
            events: {
              select: {
                title: true,
                date: true,
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

    // Filtrer les factures : RDV payés, événements (ticket), ou factures libres
    const invoices = allInvoices.filter((inv) => {
      if (inv.ticket_id) return true; // Facture événement
      if (!inv.appointment_id) return true; // Facture libre
      const appointment = paidAppointments.find((apt) => apt.id === inv.appointment_id);
      return !!appointment;
    });

    // Marquer comme annulées les factures liées à des rendez-vous non payés
    const unpaidAppointmentInvoices = allInvoices.filter((inv) => {
      if (!inv.appointment_id) return false;
      const appointment = paidAppointments.find((apt) => apt.id === inv.appointment_id);
      return !appointment && inv.status !== "CANCELED";
    });

    if (unpaidAppointmentInvoices.length > 0) {
      await prisma.invoices.updateMany({
        where: {
          id: {
            in: unpaidAppointmentInvoices.map((inv) => inv.id),
          },
        },
        data: {
          status: "CANCELED",
          updated_at: new Date(),
        },
      });
      console.log(
        `[Finance API] Marked ${unpaidAppointmentInvoices.length} invoices as CANCELED (linked to unpaid appointments)`
      );
    }

    // Récupérer les cartes cadeaux vendues (payées) AVANT de calculer le solde
    const giftCards = await prisma.gift_cards.findMany({
      where: {
        practitioner_id: practitioner.id,
        status: {
          in: ["active", "redeemed"],
        },
      },
      orderBy: {
        purchased_at: "desc",
      },
    });

    // Récupérer les virements (payouts) AVANT de calculer le solde
    const payouts = await prisma.payouts.findMany({
      where: {
        practitioner_id: practitioner.id,
      },
      orderBy: {
        requested_at: "desc",
      },
    });

    // Solde = montants nets (consultations + événements + cartes cadeaux) - virements
    const totalNetRevenueCents =
      Array.from(invoiceRevenueMap.values()).reduce((sum, revenue) => sum + revenue, 0) +
      eventsRevenueCents;

    // Ajouter les montants nets des cartes cadeaux
    const totalNetGiftCardsCents = giftCards.reduce((sum, gc) => {
      const breakdown = getFeeBreakdown(gc.amount_cents, practitioner.subscription_status || "free");
      return sum + breakdown.netAmountCents;
    }, 0);

    // Calculer la somme des virements déjà effectués (seulement ceux qui sont COMPLETED)
    const completedPayoutsCents = payouts
      .filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + p.amount_cents, 0);

    // Solde disponible = Revenus nets totaux - Virements effectués
    // Si Stripe Connect est configuré, récupérer le solde réel depuis Stripe
    let balanceCents = totalNetRevenueCents + totalNetGiftCardsCents - completedPayoutsCents;
    
    // Si stripe_account_id est présent, récupérer le solde disponible depuis Stripe Connect
    if (practitioner.stripe_account_id) {
      try {
        const balance = await stripe.balance.retrieve({
          stripeAccount: practitioner.stripe_account_id,
        });
        // Utiliser available[0].amount (en centimes) si disponible
        if (balance.available && balance.available.length > 0) {
          balanceCents = balance.available[0].amount;
          console.log(`[Finance API] Using Stripe balance for practitioner ${practitioner.id}: ${balanceCents} cents`);
        }
      } catch (error) {
        console.error("[Finance API] Error fetching Stripe balance, using calculated balance:", error);
        // Continuer avec le calcul manuel si l'API Stripe échoue
      }
    }

    // Calculer les revenus des cartes cadeaux (montant net après commission et frais Stripe)
    // Utiliser getFeeBreakdown pour avoir le calcul exact avec frais Stripe inclus
    const giftCardsRevenueCents = giftCards.reduce((sum, gc) => {
      const breakdown = getFeeBreakdown(gc.amount_cents, practitioner.subscription_status || "free");
      return sum + breakdown.netAmountCents;
    }, 0);

    // Les revenus totaux = revenus nets des rendez-vous + revenus nets des cartes cadeaux
    const totalRevenueWithGiftCards = totalRevenueCents + giftCardsRevenueCents;


    // Récupérer les factures liées aux rendez-vous pour obtenir les frais Stripe réels
    const appointmentInvoices = await prisma.invoices.findMany({
      where: {
        appointment_id: {
          in: paidAppointments.map(apt => apt.id),
        },
        payment_method: "stripe",
      },
      select: {
        appointment_id: true,
        stripe_processing_fee_cents: true,
      },
    });
    
    const invoiceFeesMap = new Map<string, number>(
      appointmentInvoices
        .filter(inv => inv.appointment_id && inv.stripe_processing_fee_cents !== null)
        .map(inv => [inv.appointment_id!, inv.stripe_processing_fee_cents!] as [string, number])
    );

    // Récupérer les factures complètes pour obtenir TOUS les champs nécessaires
    const appointmentInvoicesComplete = await prisma.invoices.findMany({
      where: {
        appointment_id: {
          in: paidAppointments.map(apt => apt.id),
        },
        payment_method: "stripe",
        status: "paid",
      },
      select: {
        appointment_id: true,
        stripe_processing_fee_cents: true,
        platform_fee_cents: true,
        practitioner_amount_cents: true,
        amount_cents: true,
      },
    });
    
    // Créer une map complète avec tous les champs depuis la DB
    const invoiceCompleteMap = new Map<string, {
      stripe_processing_fee_cents: number;
      platform_fee_cents: number;
      practitioner_amount_cents: number;
      amount_cents: number;
    }>();
    
    appointmentInvoicesComplete.forEach(inv => {
      if (inv.appointment_id && 
          inv.stripe_processing_fee_cents !== null && 
          inv.platform_fee_cents !== null && 
          inv.practitioner_amount_cents !== null) {
        invoiceCompleteMap.set(inv.appointment_id, {
          stripe_processing_fee_cents: inv.stripe_processing_fee_cents,
          platform_fee_cents: inv.platform_fee_cents,
          practitioner_amount_cents: inv.practitioner_amount_cents,
          amount_cents: inv.amount_cents,
        });
      }
    });
    
    // Formater les rendez-vous payés UNIQUEMENT s'ils ont une facture avec TOUS les champs remplis
    // Ne JAMAIS utiliser de calcul théorique - source de vérité = DB uniquement
    const formattedAppointments = paidAppointments
      .filter((apt) => {
        const invoiceData = invoiceCompleteMap.get(apt.id);
        if (!invoiceData) {
          console.warn(`[Finance] Appointment ${apt.id} has no complete invoice data - excluding from display`);
          return false;
        }
        return true;
      })
      .map((apt) => {
        const invoiceData = invoiceCompleteMap.get(apt.id)!;
        // Montant réellement payé (avec promotions) = net + commission + frais Stripe
        // (amount_cents peut être faux sur anciennes factures, ce calcul est fiable)
        const totalPaidCents = invoiceData.practitioner_amount_cents + invoiceData.platform_fee_cents + invoiceData.stripe_processing_fee_cents;
        const stripeFees = invoiceData.stripe_processing_fee_cents;
        const holiaCommission = invoiceData.platform_fee_cents;
        const netAmount = invoiceData.practitioner_amount_cents;
        
        console.log(`[Finance] Appointment ${apt.id} breakdown from DB:`, {
          total: totalPaidCents,
          stripeFees,
          holiaCommission,
          netAmount,
        });
        
        const breakdown = {
          totalAmountCents: totalPaidCents,
          stripeProcessingFeesCents: stripeFees,
          holiaCommissionCents: holiaCommission,
          netAmountCents: netAmount,
          usesRealFees: true, // Toujours vrai car on filtre ceux sans facture
        };
        
        return {
          id: apt.id,
          type: "Consultation" as const,
          date: apt.starts_at.toISOString(),
          service: {
            name: apt.services?.name || "Service",
            priceCents: totalPaidCents, // Montant réel payé (promo incluse)
          },
          user: {
            name: apt.users?.name || null,
            email: apt.users?.email || "",
          },
          feeBreakdown: breakdown,
        };
      });

    // Extraire les transactions événements (invoices avec ticket_id) pour fusion avec appointments
    const ticketInvoices = invoices.filter((inv) => inv.ticket_id != null);
    const formattedTicketTransactions = ticketInvoices
      .filter((inv) => inv.platform_fee_cents !== null && inv.stripe_processing_fee_cents !== null && inv.practitioner_amount_cents !== null)
      .map((inv) => {
        const platformFeeCents = inv.platform_fee_cents!;
        const stripeFees = inv.stripe_processing_fee_cents!;
        const practitionerAmountCents = inv.practitioner_amount_cents!;
        const breakdown = {
          totalAmountCents: inv.amount_cents,
          stripeProcessingFeesCents: stripeFees,
          holiaCommissionCents: platformFeeCents,
          netAmountCents: practitionerAmountCents,
          usesRealFees: true,
        };
        const dateStr = inv.paid_at?.toISOString() ?? inv.created_at.toISOString();
        return {
          id: inv.id,
          type: "Événement" as const,
          date: dateStr,
          eventTitle: inv.tickets?.events?.title ?? "Événement",
          eventDate: inv.tickets?.events?.date?.toISOString() ?? null,
          user: inv.tickets?.users
            ? { name: inv.tickets.users.name, email: inv.tickets.users.email }
            : { name: null, email: "" },
          feeBreakdown: breakdown,
        };
      });

    // Fusionner appointments + ticket transactions, trier par date décroissante
    const mergedTransactions = [
      ...formattedAppointments.map((apt) => ({
        id: apt.id,
        type: "Consultation" as const,
        date: apt.date,
        label: apt.service.name,
        sublabel: apt.user.name || apt.user.email,
        dateFormatted: apt.date,
        user: apt.user,
        feeBreakdown: apt.feeBreakdown,
      })),
      ...formattedTicketTransactions.map((t) => ({
        id: t.id,
        type: "Événement" as const,
        date: t.date,
        label: t.eventTitle,
        sublabel: t.user.name || t.user.email,
        dateFormatted: t.date,
        eventDate: t.eventDate,
        user: t.user,
        feeBreakdown: t.feeBreakdown,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Formater les factures pour l'API avec décomposition des frais
    // Utiliser UNIQUEMENT les valeurs stockées dans la DB (source de vérité Stripe)
    // Ne JAMAIS utiliser de calcul théorique
    const formattedInvoices = invoices
      .filter((inv) => {
        // Filtrer uniquement les factures avec TOUS les champs remplis depuis Stripe
        const hasAllFields = inv.platform_fee_cents !== null && 
                            inv.stripe_processing_fee_cents !== null && 
                            inv.practitioner_amount_cents !== null;
        if (!hasAllFields) {
          console.warn(`[Finance] Invoice ${inv.id} missing required fields - platform_fee_cents: ${inv.platform_fee_cents}, stripe_processing_fee_cents: ${inv.stripe_processing_fee_cents}, practitioner_amount_cents: ${inv.practitioner_amount_cents}`);
        }
        return hasAllFields;
      })
      .map((inv) => {
        // Utiliser UNIQUEMENT les valeurs depuis la DB (source de vérité)
        const platformFeeCents = inv.platform_fee_cents!;
        const stripeFees = inv.stripe_processing_fee_cents!;
        const practitionerAmountCents = inv.practitioner_amount_cents!;
        // Total TTC réel = net + commission + frais Stripe (montant réellement payé, avec promos)
        // Préférer ce calcul car amount_cents peut être faux sur les anciennes factures (prix non soldé)
        const totalAmountCents = practitionerAmountCents + platformFeeCents + stripeFees;
        
        console.log(`[Finance] Invoice ${inv.id} breakdown from DB:`, {
          total: totalAmountCents,
          stripeFees,
          holiaCommission: platformFeeCents,
          netAmount: practitionerAmountCents,
        });
        
        const breakdown = {
          totalAmountCents, // Montant réellement payé (avec promotions)
          stripeProcessingFeesCents: stripeFees,
          holiaCommissionCents: platformFeeCents,
          netAmountCents: practitionerAmountCents,
          usesRealFees: true, // Toujours vrai car on filtre ceux sans valeurs complètes
          usesStoredValues: true, // Toujours vrai car on filtre ceux sans valeurs complètes
        };
      
      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        amountCents: totalAmountCents, // Montant réel payé (avec promos)
        taxCents: inv.tax_cents,
        totalCents: totalAmountCents, // Montant réel payé (avec promos)
        status: inv.status.toUpperCase() as "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELED",
        dueDate: inv.due_date?.toISOString() || null,
        paidAt: inv.paid_at?.toISOString() || null,
        pdfUrl: inv.pdf_url,
        createdAt: inv.created_at.toISOString(),
        feeBreakdown: breakdown,
        appointment: inv.appointments
          ? {
              id: inv.appointments.id,
              user: {
                name: inv.appointments.users.name,
                email: inv.appointments.users.email,
              },
              service: {
                name: inv.appointments.services.name,
              },
            }
          : undefined,
        ticket: inv.tickets
          ? {
              id: inv.tickets.id,
              eventTitle: inv.tickets.events?.title ?? null,
              eventDate: inv.tickets.events?.date?.toISOString() ?? null,
              user: inv.tickets.users
                ? { name: inv.tickets.users.name, email: inv.tickets.users.email }
                : undefined,
            }
          : undefined,
        user: inv.users
          ? {
              name: inv.users.name,
              email: inv.users.email,
            }
          : undefined,
      };
    });

    return NextResponse.json({
      totalRevenueCents: totalRevenueWithGiftCards,
      monthRevenueCents,
      pendingRevenueCents,
      paidRevenueCents,
      balanceCents,
      consultationsRevenueCents,
      eventsRevenueCents,
      giftCardsRevenueCents,
      giftCards: giftCards.map((gc) => {
        // Pour les cartes cadeaux, on utilise le calcul théorique pour l'instant
        // (les frais réels ne sont pas encore stockés dans la DB pour les cartes cadeaux)
        const holiaCommission = calculateHoliaCommission(gc.amount_cents, practitioner.subscription_status || "free");
        const stripeFees = calculateStripeProcessingFees(gc.amount_cents); // Théorique pour l'instant
        const netAmount = gc.amount_cents - stripeFees - holiaCommission;
        
        const breakdown = {
          totalAmountCents: gc.amount_cents,
          stripeProcessingFeesCents: stripeFees,
          holiaCommissionCents: holiaCommission,
          netAmountCents: netAmount,
          usesRealFees: false, // Pas encore implémenté pour les cartes cadeaux
        };
        
        return {
          id: gc.id,
          code: gc.code,
          amountCents: gc.amount_cents,
          netAmountCents: breakdown.netAmountCents,
          stripeProcessingFeesCents: breakdown.stripeProcessingFeesCents,
          holiaCommissionCents: breakdown.holiaCommissionCents,
          status: gc.status,
          purchasedAt: gc.purchased_at.toISOString(),
          redeemedAt: gc.redeemed_at?.toISOString() || null,
          feeBreakdown: breakdown,
        };
      }),
      appointments: formattedAppointments,
      transactions: mergedTransactions,
      invoices: formattedInvoices,
      payouts: payouts.map((p) => ({
        id: p.id,
        amountCents: p.amount_cents,
        status: p.status.toUpperCase() as "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED",
        requestedAt: p.requested_at.toISOString(),
        processedAt: p.processed_at?.toISOString() || null,
      })),
    });
  } catch (error) {
    console.error("Error fetching finance data:", error);
    return NextResponse.json(
      { error: "Failed to fetch finance data" },
      { status: 500 }
    );
  }
}

