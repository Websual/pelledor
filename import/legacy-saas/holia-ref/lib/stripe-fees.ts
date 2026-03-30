/**
 * Calcul des frais Stripe Connect
 * 
 * Les frais de transaction Stripe (processing fees) sont automatiquement déduits
 * du montant transféré au compte connecté. Holia ne les absorbe jamais.
 * 
 * Frais Stripe standard pour les cartes européennes : 1.4% + 0.25€
 */

/**
 * Calcule les frais de transaction Stripe pour un montant donné
 * @param amountCents Montant en centimes
 * @returns Frais de transaction en centimes
 */
export function calculateStripeProcessingFees(amountCents: number): number {
  // Frais Stripe standard pour les cartes européennes : 1.4% + 0.25€
  const percentageFee = Math.round(amountCents * 0.014); // 1.4%
  const fixedFee = 25; // 0.25€ en centimes
  return percentageFee + fixedFee;
}

/**
 * Calcule la commission Holia selon le plan du praticien
 * @param amountCents Montant en centimes
 * @param subscriptionStatus Statut d'abonnement ('active' = Essentiel, autre = Découverte)
 * @returns Commission Holia en centimes
 */
export function calculateHoliaCommission(
  amountCents: number,
  subscriptionStatus: string
): number {
  const isPremium = subscriptionStatus === "active";
  // Plan DÉCOUVERTE : 8% de commission
  // Plan ESSENTIEL : 0% de commission
  return isPremium ? 0 : Math.round(amountCents * 0.08);
}

/**
 * Calcule le montant net versé au praticien après tous les frais
 * @param amountCents Montant total en centimes
 * @param subscriptionStatus Statut d'abonnement
 * @returns Montant net en centimes
 */
export function calculateNetAmount(
  amountCents: number,
  subscriptionStatus: string
): number {
  const stripeFees = calculateStripeProcessingFees(amountCents);
  const holiaCommission = calculateHoliaCommission(amountCents, subscriptionStatus);
  return amountCents - stripeFees - holiaCommission;
}

/**
 * Décompose un montant en ses différents frais
 */
export interface FeeBreakdown {
  totalAmountCents: number;
  stripeProcessingFeesCents: number;
  holiaCommissionCents: number;
  netAmountCents: number;
}

export function getFeeBreakdown(
  amountCents: number,
  subscriptionStatus: string
): FeeBreakdown {
  const stripeFees = calculateStripeProcessingFees(amountCents);
  const holiaCommission = calculateHoliaCommission(amountCents, subscriptionStatus);
  const netAmount = calculateNetAmount(amountCents, subscriptionStatus);

  return {
    totalAmountCents: amountCents,
    stripeProcessingFeesCents: stripeFees,
    holiaCommissionCents: holiaCommission,
    netAmountCents: netAmount,
  };
}
