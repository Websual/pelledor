/**
 * Charge une seule fois cote serveur : enregistre filtres / actions du core.
 * Les modules futurs importeront leur register() ici apres rebuild.
 */
import { buildAdminMenuForBlueprint } from "@/core/blueprint/admin-menu";
import { Hooks } from "@/core/events/hooks";
import { registerStripeModule } from "@/modules/stripe/register";

type SidebarLink = { title: string; url: string };

let bootstrapped = false;

export function bootstrapServer(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  registerStripeModule();

  Hooks.addFilter<SidebarLink[]>("admin_sidebar_menu", async () => {
    return buildAdminMenuForBlueprint();
  });

  Hooks.addAction<{ userId: string; email: string }>(
    "user_created",
    async () => {
      // Exemple : module Stripe fera stripe.customers.create ici
    }
  );
}
