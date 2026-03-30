import Stripe from "stripe";

if (!process.env.NEXT_STRIPE_PRIVATE_KEY) {
  throw new Error("NEXT_STRIPE_PRIVATE_KEY is not set");
}

export const stripe = new Stripe(process.env.NEXT_STRIPE_PRIVATE_KEY, {
  apiVersion: "2024-12-18.acacia" as any,
  typescript: true,
});

// Types pour les webhooks
export type StripeWebhookEvent = Stripe.Event;
export type StripeCheckoutSession = Stripe.Checkout.Session;
export type StripeCustomer = Stripe.Customer;
export type StripeSubscription = Stripe.Subscription;
export type StripeAccount = Stripe.Account;


