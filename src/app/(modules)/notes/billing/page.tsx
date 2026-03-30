import { StripeUnlockPanel } from "@/components/billing/stripe-unlock-panel";

export default function NotesBillingPage() {
  return <StripeUnlockPanel backHref="/notes" backLabel="Retour aux notes" />;
}
