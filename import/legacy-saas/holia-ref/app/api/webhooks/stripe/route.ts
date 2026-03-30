import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { createLog } from "@/lib/log";
import { notifyPaymentReceived, notifySubscriptionIssue, notifyNewBooking } from "@/lib/notifications";
import { createInvoice } from "@/lib/invoice-generator";
import { sendInvoiceEmail, sendPractitionerNotificationEmail, sendPatientBookingConfirmationEmail, sendPaymentConfirmationEmail, sendPractitionerPaidAppointmentEmail, sendPatientEventTicketEmail, sendPractitionerEventRegistrationEmail } from "@/lib/emails";
import { calculateHoliaCommission } from "@/lib/stripe-fees";
import { createGoogleEvent } from "@/lib/google-calendar";
import { captureEventPayments } from "@/lib/event-capture";

import Stripe from "stripe";

export async function POST(req: NextRequest) {
  console.log(`[Webhook] ===== WEBHOOK CALLED =====`);
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");
  const stripeAccountHeader = headersList.get("stripe-account"); // Pour les comptes connectés

  console.log(`[Webhook] Incoming webhook request - signature: ${!!signature}, stripe-account header: ${stripeAccountHeader || 'none'}`);

  if (!signature) {
    console.error("[Webhook] No signature found in request");
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  // Stripe peut envoyer à la même URL depuis deux endpoints (Connect et Account), chacun avec son secret.
  // Les événements Connect (réservations) ne mettent pas toujours le header stripe-account → essayer les deux secrets.
  const connectSecret = process.env.NEXT_STRIPE_WEBHOOK_SECRET?.trim();
  const premiumSecret = process.env.NEXT_STRIPE_PREMIUM_SECRET?.trim();

  if (!connectSecret && !premiumSecret) {
    console.error("[Webhook] Aucun secret webhook configuré (NEXT_STRIPE_WEBHOOK_SECRET ou NEXT_STRIPE_PREMIUM_SECRET)");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  // Diagnostic (sans exposer les secrets) : aide à vérifier source du webhook vs mode des clés
  console.log("[Webhook] bodyLength=%d, connectSecretSet=%s (len=%d), premiumSecretSet=%s (len=%d)", body.length, !!connectSecret, connectSecret?.length ?? 0, !!premiumSecret, premiumSecret?.length ?? 0);

  let event: Stripe.Event | null = null;
  let usedConnectSecret = false;

  // 1) Essayer le secret Connect (réservations / paiements sur compte connecté)
  if (connectSecret) {
    try {
      event = stripe.webhooks.constructEvent(body, signature, connectSecret);
      usedConnectSecret = true;
    } catch (_) {
      // signature ne correspond pas à ce secret, essayer l'autre
    }
  }

  // 2) Si échec, essayer le secret Premium (abonnements plateforme)
  if (!event && premiumSecret) {
    try {
      event = stripe.webhooks.constructEvent(body, signature, premiumSecret);
    } catch (_) {
      // signature ne correspond pas
    }
  }

  if (!event) {
    await createLog("WARN", "Stripe webhook: signature invalide", {
      hasSignature: !!signature,
      stripeAccountHeader: stripeAccountHeader ?? undefined,
    });
    console.error(
      "[Webhook] Signature invalide avec les deux secrets (Connect et Premium). Pistes : " +
        "1) L'appel vient-il du mode Live ? (Send test webhook = mode Test, secret différent). " +
        "2) Les whsec_ dans .env sont bien ceux des endpoints en mode Live (Dashboard → Developers → Webhooks, basculer en Live). " +
        "3) Essayer d'inverser NEXT_STRIPE_WEBHOOK_SECRET et NEXT_STRIPE_PREMIUM_SECRET si vous avez 2 endpoints vers la même URL."
    );
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  console.log(
    `[Webhook] Validation réussie avec le secret ${usedConnectSecret ? "Connect" : "Premium"}.`
  );

  try {
    // Récupérer le compte connecté depuis l'événement (pour Direct Charges)
    // Peut être dans event.account ou dans le header Stripe-Account
    const connectedAccountId = (event as any).account || stripeAccountHeader || null;
    console.log(`[Webhook] Received Stripe event: ${event.type}, id: ${event.id}, account: ${connectedAccountId || 'platform account'}, header account: ${stripeAccountHeader || 'none'}`);

    await createLog("INFO", "Stripe webhook reçu", {
      eventType: event.type,
      eventId: event.id,
      account: connectedAccountId ?? undefined,
    });

    // Gérer les différents types d'événements
    switch (event.type) {
      case "checkout.session.completed": {
        console.log(`[Webhook] Processing checkout.session.completed event`);
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Pour Direct Charges, le compte connecté est dans event.account
        // Si c'est un événement depuis un compte connecté, on doit utiliser ce compte pour récupérer les détails
        const accountId = connectedAccountId || (session as any).account;
        console.log(`[Webhook] checkout.session.completed - Connected account ID: ${accountId}`);

        // Vérifier si c'est un abonnement ou un paiement de réservation
        if (session.mode === "subscription") {
          // C'est un abonnement Premium (flux plateforme, pas Connect)
          const subscriptionId = session.subscription as string;
          const customerId = session.customer as string;
          const practitionerIdFromMeta = session.metadata?.practitionerId;

          const subscription = await stripe.subscriptions.retrieve(subscriptionId);

          // Privilégier practitionerId des metadata, sinon trouver par stripe_customer_id
          let practitioner = practitionerIdFromMeta
            ? await prisma.practitioners.findUnique({
                where: { id: practitionerIdFromMeta },
              })
            : await prisma.practitioners.findFirst({
                where: { stripe_customer_id: customerId },
              });

          if (practitioner) {
            await prisma.practitioners.update({
              where: { id: practitioner.id },
              data: {
                subscription_status: subscription.status === "active" ? "active" : "past_due",
                stripe_subscription_id: subscriptionId,
              },
            });
            console.log(
              `[Webhook] Abonnement Premium activé pour le praticien ${practitioner.id} (subscription ${subscriptionId})`
            );
          }
        } else if (session.mode === "payment") {
          // Vérifier si c'est un paiement de carte cadeau
          const giftCardId = session.metadata?.giftCardId;
          
          if (giftCardId) {
            // C'est un paiement de carte cadeau
            const giftCard = await prisma.gift_cards.findUnique({
              where: { id: giftCardId },
            });

            if (giftCard && giftCard.status === "pending") {
              // Mettre à jour le statut de la carte cadeau
              await prisma.gift_cards.update({
                where: { id: giftCardId },
                data: {
                  status: "active",
                },
              });

              console.log(`[Webhook] Gift card ${giftCardId} activated after payment`);
            }
            break;
          }

          // C'est un paiement de produits (boutique)
          const productsType = session.metadata?.type;
          if (productsType === "products") {
            const productItemsStr = session.metadata?.productItems;
            if (productItemsStr) {
              try {
                const productItems = JSON.parse(productItemsStr) as { id: string; qty: string }[];
                for (const item of productItems) {
                  const qty = parseInt(item.qty || "1", 10);
                  if (qty > 0) {
                    await prisma.products.update({
                      where: { id: item.id },
                      data: { stock: { decrement: qty } },
                    });
                  }
                }
                console.log(`[Webhook] Products stock updated for: ${productItems.map((p) => p.id).join(",")}`);
              } catch (e) {
                console.error("[Webhook] Error parsing productItems:", e);
              }
            }
            break;
          }

          // C'est un paiement de billet d'événement
          const eventId = session.metadata?.eventId;
          if (eventId) {
            const ticketId = session.metadata?.ticketId;
            const quantity = parseInt(session.metadata?.quantity || "1", 10);
            const patientId = session.metadata?.patientId || "";
            const paymentIntentId =
              typeof session.payment_intent === "string" ? session.payment_intent : null;
            const event = await prisma.events.findUnique({
              where: { id: eventId },
              select: { price_cents: true, min_participants: true, auto_confirm_on_min: true },
            });
            const amountCents = event ? event.price_cents * quantity : null;
            const minParticipants = event?.min_participants ?? 1;
            const ticketStatus = minParticipants > 1 ? "reserved_hold" : "confirmed";
            if (ticketId && quantity >= 1) {
              await prisma.tickets.create({
                data: {
                  id: ticketId,
                  event_id: eventId,
                  user_id: patientId,
                  quantity,
                  amount_cents: amountCents ?? undefined,
                  stripe_payment_intent_id: paymentIntentId ?? undefined,
                  status: ticketStatus,
                },
              });
              const updatedEvent = await prisma.events.update({
                where: { id: eventId },
                data: {
                  remaining_places: { decrement: quantity },
                  updated_at: new Date(),
                },
                include: {
                  practitioners: {
                    select: {
                      title: true,
                      address: true,
                      location_city: true,
                      users: { select: { email: true } },
                    },
                  },
                },
              });
              const user = await prisma.users.findUnique({
                where: { id: patientId },
                select: { name: true, email: true },
              });
              const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://holia.me";
              const receiptUrl = `${baseUrl}/api/tickets/${ticketId}/receipt`;
              const eventsUrl = `${baseUrl}/pro/events`;
              const eventAddress =
                updatedEvent.address ||
                (updatedEvent.practitioners as any)?.address ||
                (updatedEvent.practitioners as any)?.location_city ||
                null;

              try {
                if (user?.email) {
                  await sendPatientEventTicketEmail({
                    userName: user.name || "Client",
                    userEmail: user.email,
                    eventTitle: updatedEvent.title,
                    eventDate: updatedEvent.date,
                    eventAddress,
                    receiptUrl,
                  });
                  console.log(`[Webhook] Patient event ticket email sent to ${user.email}`);
                }
              } catch (emailErr) {
                console.error("[Webhook] Error sending patient event ticket email:", emailErr);
              }

              try {
                const practitionerEmail = (updatedEvent.practitioners as any)?.users?.email;
                if (practitionerEmail) {
                  await sendPractitionerEventRegistrationEmail({
                    practitionerName: (updatedEvent.practitioners as any)?.title || "Praticien",
                    practitionerEmail,
                    eventTitle: updatedEvent.title,
                    participantName: user?.name || user?.email || "Un participant",
                    remainingPlaces: updatedEvent.remaining_places,
                    eventsUrl,
                  });
                  console.log(`[Webhook] Practitioner event registration email sent to ${practitionerEmail}`);
                }
              } catch (emailErr) {
                console.error("[Webhook] Error sending practitioner event registration email:", emailErr);
              }

              console.log(`[Webhook] Ticket ${ticketId} created for event ${eventId}`);

              // Facture événement : même décomposition que RDV (Net Pro / Commission Holia 8% / Frais Stripe)
              if (ticketStatus === "confirmed" && amountCents != null && amountCents > 0) {
                const practitionerId = updatedEvent.practitioner_id;
                const practitionerForEvent = await prisma.practitioners.findUnique({
                  where: { id: practitionerId },
                  select: { stripe_account_id: true, subscription_status: true },
                });
                const stripeAccountIdEvent = accountId || practitionerForEvent?.stripe_account_id;
                const subscriptionStatus = practitionerForEvent?.subscription_status || "free";
                const theoreticalPlatformFeeCents = calculateHoliaCommission(amountCents, subscriptionStatus);
                let stripeProcessingFeeCents: number | null = null;
                let applicationFeeAmount: number | null = null;
                const paymentIntentIdEvent = paymentIntentId;

                if (paymentIntentIdEvent && stripeAccountIdEvent) {
                  try {
                    const paymentIntent = await stripe.paymentIntents.retrieve(
                      paymentIntentIdEvent,
                      { expand: ["latest_charge.balance_transaction"] },
                      { stripeAccount: stripeAccountIdEvent }
                    );
                    applicationFeeAmount = (paymentIntent as any).application_fee_amount ?? null;
                    const charge = paymentIntent.latest_charge;
                    if (charge) {
                      const chargeId = typeof charge === "string" ? charge : (charge as any).id;
                      const chargeObj = typeof charge === "object" ? charge : await stripe.charges.retrieve(
                        chargeId,
                        { expand: ["balance_transaction"] },
                        { stripeAccount: stripeAccountIdEvent }
                      );
                      let balanceTransactionId: string | null = typeof (chargeObj as any).balance_transaction === "string"
                        ? (chargeObj as any).balance_transaction
                        : (chargeObj as any).balance_transaction?.id;
                      if (!balanceTransactionId) {
                        for (let attempt = 1; attempt <= 3; attempt++) {
                          await new Promise((r) => setTimeout(r, 1000 * attempt));
                          const refreshed = await stripe.charges.retrieve(chargeId, { expand: ["balance_transaction"] }, { stripeAccount: stripeAccountIdEvent });
                          balanceTransactionId = typeof refreshed.balance_transaction === "string" ? refreshed.balance_transaction : (refreshed.balance_transaction as any)?.id;
                          if (balanceTransactionId) break;
                        }
                      }
                      if (balanceTransactionId) {
                        const balanceTransaction = await stripe.balanceTransactions.retrieve(
                          balanceTransactionId,
                          {},
                          { stripeAccount: stripeAccountIdEvent }
                        );
                        const feeDetails = (balanceTransaction as any).fee_details || [];
                        const stripeFeeDetail = feeDetails.find((fd: any) => fd.type === "stripe_fee");
                        stripeProcessingFeeCents = stripeFeeDetail?.amount ?? Math.max(0, (balanceTransaction.fee || 0) - (applicationFeeAmount || 0));
                      }
                    }
                  } catch (feeErr) {
                    console.error("[Webhook] Error fetching event payment fees:", feeErr);
                  }
                }

                const existingEventInvoice = await prisma.invoices.findFirst({
                  where: { ticket_id: ticketId, payment_method: "stripe" },
                });
                if (!existingEventInvoice && stripeProcessingFeeCents !== null) {
                  const finalPlatformFeeCents = applicationFeeAmount ?? theoreticalPlatformFeeCents;
                  const practitionerAmountCents = amountCents - finalPlatformFeeCents - stripeProcessingFeeCents;
                  try {
                    const invoiceId = await createInvoice({
                      practitionerId,
                      ticketId,
                      userId: patientId || undefined,
                      amountCents,
                      paymentMethod: "stripe",
                      status: "paid",
                      platformFeeCents: finalPlatformFeeCents,
                      practitionerAmountCents,
                      stripeFeeCents: stripeProcessingFeeCents,
                      description: `Participation à ${updatedEvent.title}`,
                    });
                    await prisma.invoices.update({
                      where: { id: invoiceId },
                      data: {
                        paid_at: new Date(),
                        stripe_processing_fee_cents: stripeProcessingFeeCents,
                        platform_fee_cents: finalPlatformFeeCents,
                        stripe_payment_intent_id: paymentIntentIdEvent,
                        practitioner_amount_cents: practitionerAmountCents,
                      },
                    });
                    console.log(`[Webhook] Event invoice created: ${invoiceId} for ticket ${ticketId}`);
                  } catch (invoiceErr) {
                    console.error("[Webhook] Error creating event invoice:", invoiceErr);
                  }
                }
              }

              // Confirmation automatique : si auto_confirm_on_min et min_participants atteint, capturer
              if (ticketStatus === "reserved_hold" && event?.auto_confirm_on_min) {
                const totalReserved = await prisma.tickets.aggregate({
                  where: {
                    event_id: eventId,
                    status: { in: ["confirmed", "reserved_hold"] },
                  },
                  _sum: { quantity: true },
                });
                const totalQty = totalReserved._sum.quantity ?? 0;
                const minP = event.min_participants ?? 1;
                if (totalQty >= minP) {
                  try {
                    const captureResult = await captureEventPayments(eventId);
                    if (captureResult.success) {
                      console.log(`[Webhook] Auto-confirmed event ${eventId}, captured ${captureResult.capturedCount} payments`);
                    }
                  } catch (captureErr) {
                    console.error("[Webhook] Auto-confirm capture failed:", captureErr);
                  }
                }
              }
            }
            break;
          }

          // C'est un paiement de réservation
          const appointmentId = session.metadata?.appointmentId;

          console.log(`[Webhook] checkout.session.completed - appointmentId: ${appointmentId}`);

          if (appointmentId) {
            // Récupérer le rendez-vous avec toutes les infos nécessaires (y compris access_info)
            const appointment = await prisma.appointments.findFirst({
              where: { id: appointmentId },
              include: {
                practitioners: {
                  select: {
                    id: true,
                    user_id: true,
                    title: true,
                    access_info: true,
                    google_calendar_sync_out: true,
                  },
                },
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
            });

            console.log(`[Webhook] checkout.session.completed - appointment found: ${!!appointment}`);

            if (appointment) {
              // Montant réellement payé (après promo) : session.amount_total = source de vérité Stripe
              const bookingAmount = (session.amount_total != null && session.amount_total > 0)
                ? session.amount_total
                : appointment.services.price_cents;
              console.log(`[Webhook] checkout.session.completed - Amount paid: ${bookingAmount} cents (${session.amount_total != null ? "from session.amount_total" : "fallback service price"})`);

              // Si le rendez-vous était en PENDING ou si le paiement vient d'être effectué, envoyer notifications et emails
              const wasPending = appointment.status === "PENDING";
              const paymentJustCompleted = appointment.payment_status !== "PAID";
              
              if (wasPending || paymentJustCompleted) {
                // Récupérer les informations du praticien pour l'email
                const practitioner = await prisma.practitioners.findFirst({
                  where: { id: appointment.practitioner_id },
                  include: {
                    users: {
                      select: {
                        email: true,
                      },
                    },
                  },
                });

                // Créer une notification pour le praticien (seulement si le rendez-vous était en PENDING)
                if (wasPending) {
                  try {
                    await notifyNewBooking({
                      practitionerUserId: appointment.practitioners.user_id,
                      clientName: appointment.users.name || appointment.users.email || "Un client",
                      appointmentId: appointmentId,
                      serviceName: appointment.services.name,
                      startsAt: appointment.starts_at,
                    });
                  } catch (notifError) {
                    console.error("Error creating booking notification:", notifError);
                  }
                }

                // Envoyer un email au praticien (seulement si le rendez-vous était en PENDING)
                if (wasPending && practitioner?.users?.email) {
                  try {
                    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005"}/pro/appointments`;
                    await sendPractitionerNotificationEmail({
                      practitionerName: appointment.practitioners.title || "Praticien",
                      clientName: appointment.users.name || appointment.users.email || "Un client",
                      serviceName: appointment.services.name,
                      startsAt: appointment.starts_at,
                      practitionerEmail: practitioner.users.email,
                      dashboardUrl,
                      clientPhone: null, // TODO: récupérer le téléphone si disponible
                    });
                  } catch (emailError) {
                    console.error("Error sending practitioner notification email:", emailError);
                  }
                }

              }

              // Marquer le rendez-vous comme payé et confirmé
              await prisma.appointments.update({
                where: { id: appointmentId },
                data: {
                  status: "CONFIRMED",
                  payment_status: "PAID",
                  updated_at: new Date(),
                },
              });

              // Décrementer le stock des produits (cross-sell dans la réservation)
              const productItemsStr = session.metadata?.productItems;
              if (productItemsStr) {
                try {
                  const productItems = JSON.parse(productItemsStr) as { id: string; qty: string }[];
                  for (const item of productItems) {
                    const qty = parseInt(item.qty || "1", 10);
                    if (qty > 0) {
                      await prisma.products.update({
                        where: { id: item.id },
                        data: { stock: { decrement: qty } },
                      });
                    }
                  }
                } catch (e) {
                  console.error("[Webhook] Error decrementing product stock:", e);
                }
              }

              // Sync Google Calendar : créer l'événement si option activée et praticien a lié Google
              try {
                console.log(`[Webhook] [Sync Google] Début synchronisation pour appointment ${appointmentId}`);
                const syncOut = appointment.practitioners?.google_calendar_sync_out !== false;
                const practitionerUserId = appointment.practitioners?.user_id;
                
                if (!syncOut) {
                  console.log(`[Webhook] [Sync Google] Synchronisation désactivée pour appointment ${appointmentId}`);
                } else if (!practitionerUserId) {
                  console.log(`[Webhook] [Sync Google] Pas de user_id pour le praticien, appointment ${appointmentId}`);
                } else {
                  const apt = await prisma.appointments.findUnique({
                    where: { id: appointmentId },
                    select: { google_event_id: true },
                  });
                  
                  if (apt?.google_event_id) {
                    console.log(`[Webhook] [Sync Google] Événement Google déjà créé (${apt.google_event_id}) pour appointment ${appointmentId}`);
                  } else {
                    console.log(`[Webhook] [Sync Google] Création événement Google pour appointment ${appointmentId}`);
                    const event = await createGoogleEvent(appointmentId);
                    if (event?.id) {
                      // google_event_id est déjà enregistré dans createGoogleEvent
                      console.log(`[Webhook] [Sync Google] Succès - Événement créé: ${event.id} pour appointment ${appointmentId}`);
                    } else if (event === null) {
                      console.log(`[Webhook] [Sync Google] Événement déjà existant pour appointment ${appointmentId}, création ignorée`);
                    } else {
                      console.error(`[Webhook] [Sync Google] Erreur - Événement créé mais sans ID pour appointment ${appointmentId}`);
                    }
                  }
                }
              } catch (gcErr: any) {
                console.error(`[Webhook] [Sync Google] Erreur - Échec synchronisation pour appointment ${appointmentId}:`, gcErr?.message || gcErr);
                // Ne pas faire échouer le webhook
              }

              // Envoyer l'email de confirmation de réservation après paiement validé
              try {
                // Récupérer le location_choice et video_link
                const appointmentWithDetails = await prisma.appointments.findUnique({
                  where: { id: appointmentId },
                  select: {
                    location_choice: true,
                    practitioners: {
                      select: {
                        video_link: true,
                      },
                    },
                  },
                });

                await sendPaymentConfirmationEmail({
                  userName: appointment.users.name || "Client",
                  practitionerName: appointment.practitioners.title || "Praticien",
                  serviceName: appointment.services.name,
                  startsAt: appointment.starts_at,
                  userEmail: appointment.users.email,
                  accessInfo: appointment.practitioners.access_info,
                  practitionerId: appointment.practitioner_id,
                  appointmentId: appointmentId,
                  locationChoice: appointmentWithDetails?.location_choice || null,
                  videoLink: appointmentWithDetails?.practitioners?.video_link || null,
                  amountCents: bookingAmount,
                });
                console.log(`[Webhook] checkout.session.completed - Payment confirmation email sent to ${appointment.users.email}`);
              } catch (emailError) {
                console.error(`[Webhook] Error sending payment confirmation email:`, emailError);
                // Ne pas faire échouer le webhook si l'email échoue
              }

              // Envoyer un email au praticien pour lui informer du nouveau rendez-vous payé
              try {
                const practitionerUser = await prisma.users.findFirst({
                  where: { id: appointment.practitioners.user_id },
                  select: { email: true },
                });
                
                if (practitionerUser?.email) {
                  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005"}/pro/appointments/${appointmentId}`;
                  await sendPractitionerPaidAppointmentEmail({
                    practitionerName: appointment.practitioners.title || "Praticien",
                    clientName: appointment.users.name || appointment.users.email || "Un client",
                    serviceName: appointment.services.name,
                    startsAt: appointment.starts_at,
                    practitionerEmail: practitionerUser.email,
                    dashboardUrl,
                    amountCents: bookingAmount,
                  });
                  console.log(`[Webhook] checkout.session.completed - Practitioner paid appointment email sent to ${practitionerUser.email}`);
                }
              } catch (emailError) {
                console.error(`[Webhook] Error sending practitioner paid appointment email:`, emailError);
                // Ne pas faire échouer le webhook si l'email échoue
              }

              // Récupérer le PaymentIntent pour obtenir les frais Stripe réels depuis balance_transaction
              let stripeProcessingFeeCents: number | null = null;
              let paymentIntentId: string | null = null;
              let applicationFeeAmount: number | null = null;
              
              // Récupérer le praticien pour connaître son plan d'abonnement et son compte Stripe
              const practitionerForInvoice = await prisma.practitioners.findFirst({
                where: { id: appointment.practitioner_id },
                select: { 
                  subscription_status: true,
                  stripe_account_id: true,
                },
              });

              const subscriptionStatus = practitionerForInvoice?.subscription_status || "free";
              // bookingAmount déjà défini plus haut (session.amount_total ou fallback)
              
              console.log(`[Webhook] checkout.session.completed - Appointment ${appointmentId}:`);
              console.log(`[Webhook] - Booking amount: ${bookingAmount} cents (${bookingAmount / 100}€)`);
              console.log(`[Webhook] - Subscription status: ${subscriptionStatus}`);
              
              // Calculer la commission Holia théorique (sera remplacée par application_fee_amount si disponible)
              const theoreticalPlatformFeeCents = calculateHoliaCommission(bookingAmount, subscriptionStatus);
              console.log(`[Webhook] - Theoretical platform fee (${subscriptionStatus === "active" ? "0%" : "8%"}): ${theoreticalPlatformFeeCents} cents`);
              
              try {
                // Récupérer le PaymentIntent depuis la session
                if (session.payment_intent && typeof session.payment_intent === 'string') {
                  paymentIntentId = session.payment_intent;
                  
                  // Utiliser le compte connecté depuis l'événement (Direct Charges) ou depuis le praticien
                  const stripeAccountId = accountId || practitionerForInvoice?.stripe_account_id;
                  
                  console.log(`[Webhook] checkout.session.completed - Using Stripe account: ${stripeAccountId} for PaymentIntent ${paymentIntentId}`);
                  
                  if (stripeAccountId) {
                    const paymentIntent = await stripe.paymentIntents.retrieve(
                      paymentIntentId,
                      {
                        expand: ['latest_charge.balance_transaction'],
                      },
                      {
                        stripeAccount: stripeAccountId,
                      }
                    );
                    
                    // LOGS DÉTAILLÉS : Structure complète du PaymentIntent
                    console.log(`[Webhook] PaymentIntent structure:`, {
                      id: paymentIntent.id,
                      amount: paymentIntent.amount,
                      application_fee_amount: (paymentIntent as any).application_fee_amount,
                      latest_charge: paymentIntent.latest_charge,
                      charges: (paymentIntent as any).charges,
                    });
                    
                    // Récupérer l'application_fee_amount depuis le PaymentIntent (commission Holia)
                    // Avec Direct Charges, l'application_fee est dans application_fee_amount
                    applicationFeeAmount = (paymentIntent as any).application_fee_amount || null;
                    console.log(`[Webhook] Application fee (platform fee) from PaymentIntent: ${applicationFeeAmount} cents`);
                    
                    // Récupérer les frais réels depuis balance_transaction
                    // Source de vérité : stripe.balanceTransactions.retrieve depuis le payment_intent
                    if (paymentIntent.latest_charge) {
                      const chargeId = typeof paymentIntent.latest_charge === 'string' 
                        ? paymentIntent.latest_charge 
                        : (paymentIntent.latest_charge as any).id;
                      
                      console.log(`[Webhook] Retrieving charge ${chargeId} from account ${stripeAccountId}`);
                      
                      const charge = typeof paymentIntent.latest_charge === 'object' && paymentIntent.latest_charge
                        ? paymentIntent.latest_charge
                        : await stripe.charges.retrieve(
                            chargeId,
                            {
                              expand: ['balance_transaction'],
                            },
                            {
                              stripeAccount: stripeAccountId,
                            }
                          );
                      
                      // LOGS DÉTAILLÉS : Structure complète du Charge
                      console.log(`[Webhook] Charge structure:`, {
                        id: charge.id,
                        amount: charge.amount,
                        balance_transaction: charge.balance_transaction,
                        application_fee_amount: (charge as any).application_fee_amount,
                      });
                      
                      // Récupérer le balance_transaction (source de vérité pour les frais Stripe)
                      // Le balance_transaction peut ne pas être disponible immédiatement, donc on fait un retry avec délai
                      let balanceTransactionId: string | null = typeof charge.balance_transaction === 'string'
                        ? charge.balance_transaction
                        : (charge.balance_transaction as any)?.id;
                      
                      // Si balance_transaction n'est pas disponible, réessayer avec délai (max 3 tentatives)
                      if (!balanceTransactionId) {
                        console.log(`[Webhook] checkout.session.completed - balance_transaction not immediately available for charge ${chargeId}, retrying...`);
                        for (let attempt = 1; attempt <= 3; attempt++) {
                          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // 1s, 2s, 3s
                          
                          // Récupérer le charge à nouveau pour voir si balance_transaction est maintenant disponible
                          const refreshedCharge = await stripe.charges.retrieve(
                            chargeId,
                            {
                              expand: ['balance_transaction'],
                            },
                            {
                              stripeAccount: stripeAccountId,
                            }
                          );
                          
                          balanceTransactionId = typeof refreshedCharge.balance_transaction === 'string'
                            ? refreshedCharge.balance_transaction
                            : (refreshedCharge.balance_transaction as any)?.id;
                          
                          if (balanceTransactionId) {
                            console.log(`[Webhook] checkout.session.completed - balance_transaction found on attempt ${attempt}`);
                            break;
                          }
                        }
                      }
                      
                      if (balanceTransactionId) {
                        console.log(`[Webhook] Retrieving balance_transaction ${balanceTransactionId} from account ${stripeAccountId}`);
                        
                        // Récupérer le balance_transaction depuis Stripe (source de vérité)
                        const balanceTransaction = await stripe.balanceTransactions.retrieve(
                          balanceTransactionId,
                          {},
                          {
                            stripeAccount: stripeAccountId,
                          }
                        );
                        
                        // LOGS DÉTAILLÉS : Structure complète du BalanceTransaction
                        console.log(`[Webhook] BalanceTransaction structure:`, {
                          id: balanceTransaction.id,
                          amount: balanceTransaction.amount,
                          fee: balanceTransaction.fee,
                          net: balanceTransaction.net,
                          fee_details: (balanceTransaction as any).fee_details,
                          type: balanceTransaction.type,
                        });
                        
                        // IMPORTANT : balance_transaction.fee contient TOUS les frais (Holia + Stripe)
                        // Il faut isoler uniquement les frais Stripe depuis fee_details
                        const feeDetails = (balanceTransaction as any).fee_details || [];
                        const stripeFeeDetail = feeDetails.find((fd: any) => fd.type === 'stripe_fee');
                        
                        let calculatedStripeFees: number;
                        if (stripeFeeDetail && stripeFeeDetail.amount) {
                          // Utiliser directement le montant depuis fee_details (source de vérité)
                          calculatedStripeFees = stripeFeeDetail.amount;
                          console.log(`[Webhook] Using stripe_fee from fee_details: ${calculatedStripeFees} cents (${calculatedStripeFees / 100}€)`);
                        } else {
                          // Fallback : soustraire application_fee_amount de balance_transaction.fee
                          const totalFees = balanceTransaction.fee || 0;
                          calculatedStripeFees = totalFees - (applicationFeeAmount || 0);
                          console.log(`[Webhook] Calculated Stripe fees by subtracting application_fee: ${calculatedStripeFees} cents (total fees: ${totalFees} - platform fee: ${applicationFeeAmount || 0})`);
                        }
                        
                        // Enregistrer les frais Stripe réels (uniquement les frais Stripe, pas Holia)
                        stripeProcessingFeeCents = calculatedStripeFees;
                        
                        // Utiliser application_fee_amount si disponible, sinon calcul théorique
                        const finalPlatformFeeCents = applicationFeeAmount !== null && applicationFeeAmount !== undefined
                          ? applicationFeeAmount
                          : theoreticalPlatformFeeCents;
                        
                        console.log(`[Webhook] FINAL FEE BREAKDOWN:`);
                        console.log(`[Webhook] - Total amount: ${bookingAmount} cents (${bookingAmount / 100}€)`);
                        console.log(`[Webhook] - Platform fee (Holia): ${finalPlatformFeeCents} cents (${finalPlatformFeeCents / 100}€) - Source: ${applicationFeeAmount !== null ? 'application_fee_amount' : 'calculated'}`);
                        console.log(`[Webhook] - Stripe processing fees: ${calculatedStripeFees} cents (${calculatedStripeFees / 100}€) - Source: balance_transaction.fee`);
                        console.log(`[Webhook] - Practitioner amount: ${bookingAmount - finalPlatformFeeCents - calculatedStripeFees} cents (${(bookingAmount - finalPlatformFeeCents - calculatedStripeFees) / 100}€)`);
                      } else {
                        console.warn(`[Webhook] checkout.session.completed - No balance_transaction found for charge ${chargeId} after retries - will not create invoice`);
                        // Ne pas créer la facture sans balance_transaction
                        stripeProcessingFeeCents = null;
                      }
                    } else {
                      console.warn(`[Webhook] No latest_charge found for PaymentIntent ${paymentIntentId}`);
                    }
                  }
                }
              } catch (feeError) {
                console.error("[Webhook] Error fetching real Stripe fees from balance_transaction:", feeError);
                // Ne pas continuer sans les frais réels - c'est la source de vérité
                // Si on ne peut pas récupérer les frais depuis balance_transaction, on ne crée pas la facture
                // Elle sera créée plus tard lors de payment_intent.succeeded quand les frais seront disponibles
                console.warn(`[Webhook] Cannot create invoice without real Stripe fees from balance_transaction. Will retry on payment_intent.succeeded event.`);
                stripeProcessingFeeCents = null;
              }
              
              // Vérifier si une facture existe déjà pour ce rendez-vous
              const existingInvoice = await prisma.invoices.findFirst({
                where: {
                  appointment_id: appointmentId,
                  payment_method: "stripe",
                },
              });

              // Créer la facture UNIQUEMENT si les frais Stripe réels sont disponibles (source de vérité)
              // ET si elle n'existe pas déjà
              if (!existingInvoice && stripeProcessingFeeCents !== null && stripeProcessingFeeCents !== undefined) {
                console.log(`[Webhook] checkout.session.completed - Creating invoice for appointment ${appointmentId} with real Stripe fees`);
                
                // Utiliser les frais Stripe réels depuis balance_transaction (source de vérité)
                const stripeFeeCents = stripeProcessingFeeCents;
                
                // Utiliser application_fee_amount si disponible, sinon calcul théorique
                const finalPlatformFeeCents = applicationFeeAmount !== null && applicationFeeAmount !== undefined
                  ? applicationFeeAmount
                  : theoreticalPlatformFeeCents;
                
                // Calculer le montant net du praticien : total - commission Holia - frais Stripe réels
                const practitionerAmountCents = bookingAmount - finalPlatformFeeCents - stripeFeeCents;
                
                console.log(`[Webhook] Creating invoice with:`);
                console.log(`[Webhook] - amountCents: ${bookingAmount}`);
                console.log(`[Webhook] - platformFeeCents: ${finalPlatformFeeCents} (${applicationFeeAmount !== null ? 'from application_fee_amount' : 'calculated'})`);
                console.log(`[Webhook] - stripeFeeCents: ${stripeFeeCents} (from balance_transaction.fee)`);
                console.log(`[Webhook] - practitionerAmountCents: ${practitionerAmountCents}`);
                
                try {
                  const invoiceId = await createInvoice({
                    practitionerId: appointment.practitioner_id,
                    appointmentId: appointmentId,
                    userId: appointment.user_id,
                    amountCents: bookingAmount,
                    paymentMethod: "stripe",
                    status: "paid",
                    platformFeeCents: finalPlatformFeeCents,
                    practitionerAmountCents: practitionerAmountCents,
                    stripeFeeCents: stripeFeeCents,
                  });
                  console.log(`[Webhook] checkout.session.completed - Invoice created successfully: ${invoiceId}`);

                  // Marquer la facture comme payée et enregistrer TOUS les frais réels depuis Stripe
                  await prisma.invoices.update({
                    where: { id: invoiceId },
                    data: {
                      paid_at: new Date(),
                      stripe_processing_fee_cents: stripeProcessingFeeCents, // Frais réels depuis balance_transaction
                      platform_fee_cents: finalPlatformFeeCents, // Commission Holia depuis application_fee_amount ou calculée
                      stripe_payment_intent_id: paymentIntentId,
                      practitioner_amount_cents: practitionerAmountCents, // Recalculé avec frais réels
                    },
                  });
                  console.log(`[Webhook] checkout.session.completed - Invoice ${invoiceId} updated with ALL real fees:`);
                  console.log(`[Webhook] - stripe_processing_fee_cents: ${stripeProcessingFeeCents}`);
                  console.log(`[Webhook] - platform_fee_cents: ${finalPlatformFeeCents}`);
                  console.log(`[Webhook] - practitioner_amount_cents: ${practitionerAmountCents}`);

                  // La facture sera envoyée uniquement lors de "Marquer comme terminé"
                  console.log(`[Webhook] checkout.session.completed - Invoice ${invoiceId} created, will be sent when appointment is marked as DONE`);
                } catch (invoiceError) {
                  console.error(`[Webhook] Error creating invoice for appointment ${appointmentId}:`, invoiceError);
                  // Ne pas faire échouer le webhook si la création de facture échoue
                }
              } else if (stripeProcessingFeeCents !== null && paymentIntentId) {
                // Mettre à jour la facture existante avec les frais réels si disponibles
                // Recalculer aussi practitioner_amount_cents avec les frais Stripe réels
                const platformFeeCents = existingInvoice.platform_fee_cents || calculateHoliaCommission(bookingAmount, subscriptionStatus);
                await prisma.invoices.update({
                  where: { id: existingInvoice.id },
                  data: {
                    stripe_processing_fee_cents: stripeProcessingFeeCents,
                    stripe_payment_intent_id: paymentIntentId,
                    practitioner_amount_cents: bookingAmount - platformFeeCents - stripeProcessingFeeCents,
                  },
                });
              }

            }
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const practitioner = await prisma.practitioners.findFirst({
          where: { stripe_customer_id: customerId },
          include: {
            users: {
              select: {
                id: true,
              },
            },
          },
        });

        if (practitioner) {
          const oldStatus = practitioner.subscription_status;
          const newStatus =
            subscription.status === "active"
              ? "active"
              : subscription.status === "past_due"
              ? "past_due"
              : "canceled";

          await prisma.practitioners.update({
            where: { id: practitioner.id },
            data: {
              subscription_status: newStatus,
              stripe_subscription_id: subscription.id,
            },
          });

          // Notifier si l'abonnement passe en past_due ou canceled
          if (oldStatus === "active" && (newStatus === "past_due" || newStatus === "canceled")) {
            try {
              await notifySubscriptionIssue({
                practitionerUserId: practitioner.user_id,
                reason:
                  newStatus === "past_due"
                    ? "Échec du prélèvement"
                    : "Abonnement annulé",
              });
            } catch (notifError) {
              console.error("Error creating subscription issue notification:", notifError);
            }
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const practitioner = await prisma.practitioners.findFirst({
          where: { stripe_customer_id: customerId },
        });

        if (practitioner) {
          await prisma.practitioners.update({
            where: { id: practitioner.id },
            data: {
              subscription_status: "free",
              stripe_subscription_id: null,
            },
          });
        }
        break;
      }

      case "account.updated": {
        // Mise à jour du compte Stripe Connect (onboarding)
        const account = event.data.object as Stripe.Account;
        
        // Trouver le praticien par account ID
        const practitioner = await prisma.practitioners.findFirst({
          where: { stripe_account_id: account.id },
        });

        if (practitioner) {
          // Vérifier si l'onboarding est complet
          const isComplete =
            account.details_submitted &&
            account.charges_enabled &&
            account.payouts_enabled;

          // Mettre à jour le statut d'onboarding
          await prisma.practitioners.update({
            where: { id: practitioner.id },
            data: {
              stripe_onboarding_complete: isComplete,
            },
          });

          console.log(
            `[Webhook] Account ${account.id} updated. Onboarding complete: ${isComplete}`
          );
        }
        break;
      }

      case "payment_intent.succeeded": {
        // Le paiement a réussi
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const appointmentId = paymentIntent.metadata?.appointmentId;

        if (appointmentId) {
          // Récupérer le rendez-vous avec les informations du praticien (access_info)
          const appointment = await prisma.appointments.findFirst({
            where: { id: appointmentId },
            include: {
              practitioners: {
                select: {
                  id: true,
                  user_id: true,
                  title: true,
                  access_info: true,
                  google_calendar_sync_out: true,
                },
              },
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
          });

          if (appointment) {
            // Marquer le rendez-vous comme payé et confirmé
            await prisma.appointments.update({
              where: { id: appointmentId },
              data: {
                status: "CONFIRMED",
                payment_status: "PAID",
                updated_at: new Date(),
              },
            });

            // Sync Google Calendar (idempotent : skip si déjà créé via checkout.session.completed)
            try {
              console.log(`[Webhook] [Sync Google] Début synchronisation (payment_intent) pour appointment ${appointmentId}`);
              const syncOut = appointment.practitioners?.google_calendar_sync_out !== false;
              const practitionerUserId = appointment.practitioners?.user_id;
              
              if (!syncOut) {
                console.log(`[Webhook] [Sync Google] Synchronisation désactivée pour appointment ${appointmentId}`);
              } else if (!practitionerUserId) {
                console.log(`[Webhook] [Sync Google] Pas de user_id pour le praticien, appointment ${appointmentId}`);
              } else {
                const apt = await prisma.appointments.findUnique({
                  where: { id: appointmentId },
                  select: { google_event_id: true },
                });
                
                if (apt?.google_event_id) {
                  console.log(`[Webhook] [Sync Google] Événement Google déjà créé (${apt.google_event_id}) pour appointment ${appointmentId}`);
                } else {
                  console.log(`[Webhook] [Sync Google] Création événement Google pour appointment ${appointmentId}`);
                  const event = await createGoogleEvent(appointmentId);
                  if (event?.id) {
                    // google_event_id est déjà enregistré dans createGoogleEvent
                    console.log(`[Webhook] [Sync Google] Succès - Événement créé: ${event.id} pour appointment ${appointmentId}`);
                  } else if (event === null) {
                    console.log(`[Webhook] [Sync Google] Événement déjà existant pour appointment ${appointmentId}, création ignorée`);
                  } else {
                    console.error(`[Webhook] [Sync Google] Erreur - Événement créé mais sans ID pour appointment ${appointmentId}`);
                  }
                }
              }
            } catch (gcErr: any) {
              console.error(`[Webhook] [Sync Google] Erreur - Échec synchronisation (payment_intent) pour appointment ${appointmentId}:`, gcErr?.message || gcErr);
              // Ne pas faire échouer le webhook
            }

            // L'email de confirmation est déjà envoyé dans checkout.session.completed, pas besoin de le renvoyer ici
            console.log(`[Webhook] payment_intent.succeeded - Payment confirmed, confirmation email already sent in checkout.session.completed`);

            // Récupérer les frais Stripe réels depuis balance_transaction (source de vérité)
            let stripeProcessingFeeCents: number | null = null;
            let applicationFeeAmount: number | null = null;
            
            console.log(`[Webhook] payment_intent.succeeded - Processing appointment ${appointmentId}`);
            console.log(`[Webhook] - PaymentIntent ID: ${paymentIntent.id}`);
            console.log(`[Webhook] - Amount: ${paymentIntent.amount} cents`);
            
            try {
              const practitioner = await prisma.practitioners.findFirst({
                where: { id: appointment.practitioner_id },
                select: { 
                  stripe_account_id: true,
                  subscription_status: true,
                },
              });
              
              const subscriptionStatus = practitioner?.subscription_status || "free";
              // Montant réellement payé (après promo) : paymentIntent.amount = source de vérité Stripe
              const bookingAmount = paymentIntent.amount;
              const theoreticalPlatformFeeCents = calculateHoliaCommission(bookingAmount, subscriptionStatus);
              
              console.log(`[Webhook] payment_intent.succeeded - Booking amount: ${bookingAmount} cents (${bookingAmount / 100}€) from paymentIntent.amount`);
              console.log(`[Webhook] - Subscription status: ${subscriptionStatus}`);
              console.log(`[Webhook] - Theoretical platform fee: ${theoreticalPlatformFeeCents} cents`);
              
              // Récupérer application_fee_amount depuis le PaymentIntent
              applicationFeeAmount = (paymentIntent as any).application_fee_amount || null;
              console.log(`[Webhook] - Application fee from PaymentIntent: ${applicationFeeAmount} cents`);
              
              if (practitioner?.stripe_account_id && paymentIntent.latest_charge) {
                const chargeId = typeof paymentIntent.latest_charge === 'string' 
                  ? paymentIntent.latest_charge 
                  : (paymentIntent.latest_charge as any).id;
                
                console.log(`[Webhook] Retrieving charge ${chargeId} from account ${practitioner.stripe_account_id}`);
                
                const charge = await stripe.charges.retrieve(
                  chargeId,
                  {
                    expand: ['balance_transaction'],
                  },
                  {
                    stripeAccount: practitioner.stripe_account_id,
                  }
                );
                
                // LOGS DÉTAILLÉS : Structure complète du Charge
                console.log(`[Webhook] Charge structure:`, {
                  id: charge.id,
                  amount: charge.amount,
                  balance_transaction: charge.balance_transaction,
                  application_fee_amount: (charge as any).application_fee_amount,
                });
                
                // Récupérer le balance_transaction depuis Stripe (source de vérité)
                // Le balance_transaction peut ne pas être disponible immédiatement, donc on fait un retry avec délai
                let balanceTransactionId: string | null = typeof charge.balance_transaction === 'string'
                  ? charge.balance_transaction
                  : (charge.balance_transaction as any)?.id;
                
                // Si balance_transaction n'est pas disponible, réessayer avec délai (max 3 tentatives)
                if (!balanceTransactionId) {
                  console.log(`[Webhook] payment_intent.succeeded - balance_transaction not immediately available for charge ${chargeId}, retrying...`);
                  for (let attempt = 1; attempt <= 3; attempt++) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // 1s, 2s, 3s
                    
                    // Récupérer le charge à nouveau pour voir si balance_transaction est maintenant disponible
                    const refreshedCharge = await stripe.charges.retrieve(
                      chargeId,
                      {
                        expand: ['balance_transaction'],
                      },
                      {
                        stripeAccount: practitioner.stripe_account_id,
                      }
                    );
                    
                    balanceTransactionId = typeof refreshedCharge.balance_transaction === 'string'
                      ? refreshedCharge.balance_transaction
                      : (refreshedCharge.balance_transaction as any)?.id;
                    
                    if (balanceTransactionId) {
                      console.log(`[Webhook] payment_intent.succeeded - balance_transaction found on attempt ${attempt}`);
                      break;
                    }
                  }
                }
                
                if (balanceTransactionId) {
                  console.log(`[Webhook] Retrieving balance_transaction ${balanceTransactionId} from account ${practitioner.stripe_account_id}`);
                  
                  const balanceTransaction = await stripe.balanceTransactions.retrieve(
                    balanceTransactionId,
                    {},
                    {
                      stripeAccount: practitioner.stripe_account_id,
                    }
                  );
                  
                  // LOGS DÉTAILLÉS : Structure complète du BalanceTransaction
                  console.log(`[Webhook] BalanceTransaction structure:`, {
                    id: balanceTransaction.id,
                    amount: balanceTransaction.amount,
                    fee: balanceTransaction.fee,
                    net: balanceTransaction.net,
                    fee_details: (balanceTransaction as any).fee_details,
                    type: balanceTransaction.type,
                  });
                  
                  // IMPORTANT : balance_transaction.fee contient TOUS les frais (Holia + Stripe)
                  // Il faut isoler uniquement les frais Stripe depuis fee_details
                  const feeDetails = (balanceTransaction as any).fee_details || [];
                  const stripeFeeDetail = feeDetails.find((fd: any) => fd.type === 'stripe_fee');
                  
                  if (stripeFeeDetail && stripeFeeDetail.amount) {
                    // Utiliser directement le montant depuis fee_details (source de vérité)
                    stripeProcessingFeeCents = stripeFeeDetail.amount;
                    console.log(`[Webhook] payment_intent.succeeded - Using stripe_fee from fee_details: ${stripeProcessingFeeCents} cents (${stripeProcessingFeeCents / 100}€)`);
                  } else {
                    // Fallback : soustraire application_fee_amount de balance_transaction.fee
                    const totalFees = balanceTransaction.fee || 0;
                    stripeProcessingFeeCents = totalFees - (applicationFeeAmount || 0);
                    console.log(`[Webhook] payment_intent.succeeded - Calculated Stripe fees by subtracting application_fee: ${stripeProcessingFeeCents} cents (total fees: ${totalFees} - platform fee: ${applicationFeeAmount || 0})`);
                  }
                  
                  // Utiliser application_fee_amount si disponible, sinon calcul théorique
                  const finalPlatformFeeCents = applicationFeeAmount !== null && applicationFeeAmount !== undefined
                    ? applicationFeeAmount
                    : theoreticalPlatformFeeCents;
                  
                  console.log(`[Webhook] payment_intent.succeeded - FINAL FEE BREAKDOWN:`);
                  console.log(`[Webhook] - Total amount: ${bookingAmount} cents (${bookingAmount / 100}€)`);
                  console.log(`[Webhook] - Platform fee (Holia): ${finalPlatformFeeCents} cents (${finalPlatformFeeCents / 100}€) - Source: ${applicationFeeAmount !== null ? 'application_fee_amount' : 'calculated'}`);
                  console.log(`[Webhook] - Stripe processing fees: ${stripeProcessingFeeCents} cents (${stripeProcessingFeeCents / 100}€) - Source: balance_transaction.fee`);
                  console.log(`[Webhook] - Practitioner amount: ${bookingAmount - finalPlatformFeeCents - stripeProcessingFeeCents} cents (${(bookingAmount - finalPlatformFeeCents - stripeProcessingFeeCents) / 100}€)`);
                } else {
                  console.warn(`[Webhook] payment_intent.succeeded - No balance_transaction found for charge ${chargeId} after retries - will not create invoice`);
                  // Ne pas créer la facture sans balance_transaction
                  stripeProcessingFeeCents = null;
                }
              }
            } catch (feeError) {
              console.error("[Webhook] Error fetching Stripe fees from balance_transaction in payment_intent.succeeded:", feeError);
              // Ne pas créer de facture sans les frais réels - source de vérité
            }

            // Vérifier si une facture existe déjà pour ce rendez-vous
            const existingInvoice = await prisma.invoices.findFirst({
              where: {
                appointment_id: appointmentId,
                payment_method: "stripe",
              },
            });

            // Récupérer le praticien pour connaître son plan d'abonnement
            const practitionerForInvoice = await prisma.practitioners.findFirst({
              where: { id: appointment.practitioner_id },
              select: { subscription_status: true },
            });

            const subscriptionStatus = practitionerForInvoice?.subscription_status || "free";
            const bookingAmount = appointment.services.price_cents;
            const theoreticalPlatformFeeCents = calculateHoliaCommission(bookingAmount, subscriptionStatus);
            
            // Utiliser application_fee_amount si disponible, sinon calcul théorique
            const finalPlatformFeeCents = applicationFeeAmount !== null && applicationFeeAmount !== undefined
              ? applicationFeeAmount
              : theoreticalPlatformFeeCents;
            
            // Créer la facture UNIQUEMENT si les frais Stripe réels sont disponibles (source de vérité)
            // ET si elle n'existe pas déjà
            if (!existingInvoice && stripeProcessingFeeCents !== null && stripeProcessingFeeCents !== undefined) {
              // Utiliser les frais Stripe réels depuis balance_transaction (source de vérité)
              const stripeFeeCents = stripeProcessingFeeCents;
              
              // Calculer le montant net du praticien : total - commission Holia - frais Stripe réels
              const practitionerAmountCents = bookingAmount - finalPlatformFeeCents - stripeFeeCents;
              
              console.log(`[Webhook] payment_intent.succeeded - Creating invoice with:`);
              console.log(`[Webhook] - amountCents: ${bookingAmount}`);
              console.log(`[Webhook] - platformFeeCents: ${finalPlatformFeeCents} (${applicationFeeAmount !== null ? 'from application_fee_amount' : 'calculated'})`);
              console.log(`[Webhook] - stripeFeeCents: ${stripeFeeCents} (from balance_transaction.fee)`);
              console.log(`[Webhook] - practitionerAmountCents: ${practitionerAmountCents}`);

              const invoiceId = await createInvoice({
                practitionerId: appointment.practitioner_id,
                appointmentId: appointmentId,
                userId: appointment.user_id,
                amountCents: bookingAmount,
                paymentMethod: "stripe",
                status: "paid",
                platformFeeCents: finalPlatformFeeCents,
                practitionerAmountCents: practitionerAmountCents,
                stripeFeeCents: stripeFeeCents,
              });

              // Marquer la facture comme payée et enregistrer TOUS les frais réels depuis Stripe
              await prisma.invoices.update({
                where: { id: invoiceId },
                data: {
                  paid_at: new Date(),
                  stripe_processing_fee_cents: stripeProcessingFeeCents, // Frais réels depuis balance_transaction
                  platform_fee_cents: finalPlatformFeeCents, // Commission Holia depuis application_fee_amount ou calculée
                  stripe_payment_intent_id: paymentIntent.id,
                  practitioner_amount_cents: practitionerAmountCents, // Recalculé avec frais réels
                },
              });
              
              console.log(`[Webhook] payment_intent.succeeded - Invoice ${invoiceId} updated with ALL real fees:`);
              console.log(`[Webhook] - stripe_processing_fee_cents: ${stripeProcessingFeeCents}`);
              console.log(`[Webhook] - platform_fee_cents: ${finalPlatformFeeCents}`);
              console.log(`[Webhook] - practitioner_amount_cents: ${practitionerAmountCents}`);

              // La facture sera envoyée uniquement lors de "Marquer comme terminé"
              console.log(`[Webhook] payment_intent.succeeded - Invoice ${invoiceId} created, will be sent when appointment is marked as DONE`);

              // Créer une notification de paiement reçu pour le praticien
              try {
                await notifyPaymentReceived({
                  practitionerUserId: appointment.practitioners.user_id,
                  clientName: appointment.users.name || appointment.users.email || "Un client",
                  amountCents: appointment.services.price_cents,
                  appointmentId: appointmentId,
                  serviceName: appointment.services.name,
                });
              } catch (notifError) {
                console.error("Error creating payment notification:", notifError);
              }
            }
          }
        }
        break;
      }

      case "charge.dispute.created":
      case "charge.dispute.updated": {
        // Gérer les chargebacks (litiges)
        const dispute = event.data.object as Stripe.Dispute;
        // Récupérer le compte connecté depuis l'événement (pour Direct Charges)
        const disputeAccountId = (event as any).account || stripeAccountHeader || null;
        console.log(`[Webhook] Chargeback dispute: ${dispute.id}, status: ${dispute.status}, account: ${disputeAccountId || 'platform'}`);
        
        // Récupérer le charge pour trouver le rendez-vous
        try {
          // Pour Direct Charges, le charge est sur le compte connecté
          const charge = await stripe.charges.retrieve(
            dispute.charge as string,
            disputeAccountId ? { stripeAccount: disputeAccountId } : {}
          );
          const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
          
          if (paymentIntentId) {
            // Trouver la facture par payment_intent_id
            const invoice = await prisma.invoices.findFirst({
              where: {
                stripe_payment_intent_id: paymentIntentId,
              },
              include: {
                appointments: {
                  select: {
                    id: true,
                    practitioner_id: true,
                  },
                },
              },
            });
            
            if (invoice && invoice.appointments) {
              const disputeRefundId = `dispute_${dispute.id}`;
              
              // Vérifier si le remboursement existe déjà
              const existingRefund = await prisma.refunds.findUnique({
                where: { id: disputeRefundId },
              });
              
              if (existingRefund) {
                // Mettre à jour l'enregistrement existant
                await prisma.refunds.update({
                  where: { id: disputeRefundId },
                  data: {
                    chargeback_dispute: true,
                    status: dispute.status === 'won' ? 'completed' : dispute.status === 'lost' ? 'failed' : 'pending',
                    error_message: dispute.reason || null,
                    updated_at: new Date(),
                  },
                });
              } else {
                // Créer un nouvel enregistrement pour le chargeback
                await prisma.refunds.create({
                  data: {
                    id: disputeRefundId,
                    appointment_id: invoice.appointments.id,
                    practitioner_id: invoice.appointments.practitioner_id,
                    amount_cents: dispute.amount,
                    stripe_refund_id: disputeRefundId,
                    status: dispute.status === 'won' ? 'completed' : dispute.status === 'lost' ? 'failed' : 'pending',
                    reason: 'chargeback',
                    chargeback_dispute: true,
                    error_message: dispute.reason || null,
                    created_at: new Date(),
                    updated_at: new Date(),
                  } as any,
                });
              }
              
              console.log(`[Webhook] Chargeback recorded for appointment ${invoice.appointments.id}`);
            }
          }
        } catch (disputeError) {
          console.error("[Webhook] Error processing chargeback:", disputeError);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    await createLog("ERROR", "Stripe webhook: erreur de traitement", {
      eventType: event?.type,
      eventId: event?.id,
      error: error?.message ?? String(error),
    });
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed", details: error.message },
      { status: 500 }
    );
  }
}

// Désactiver le body parsing pour les webhooks Stripe
export const runtime = "nodejs";

