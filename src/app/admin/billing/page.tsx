import { StripeUnlockPanel } from "@/components/billing/stripe-unlock-panel";

export default function AdminBillingPage() {
  return <StripeUnlockPanel backHref="/admin" backLabel="Retour au tableau de bord" />;
}
