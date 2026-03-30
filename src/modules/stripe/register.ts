import { Hooks } from "@/core/events/hooks";
import { getDb } from "@/core/db/server";
import { stripeCustomers } from "@/core/db/schema";
import { getStripe } from "@/core/stripe";
import { eq } from "drizzle-orm";

export function registerStripeModule(): void {
  Hooks.addAction<{ userId: string; email: string }>(
    "user_created",
    async ({ userId, email }) => {
      const stripe = getStripe();
      if (!stripe) return;
      const existing = await getDb().query.stripeCustomers.findFirst({
        where: eq(stripeCustomers.userId, userId),
      });
      if (existing) return;
      const customer = await stripe.customers.create({
        email,
        metadata: { userId },
      });
      await getDb().insert(stripeCustomers).values({
        userId,
        stripeCustomerId: customer.id,
      });
    },
    5
  );
}
