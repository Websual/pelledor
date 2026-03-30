import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import FinancePageClient from './finance-client';

export const dynamic = 'force-dynamic';

export default async function FinancePage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'PRACTITIONER') {
    redirect('/connexion?callbackUrl=/pro/finance');
  }

  const practitioner = await prisma.practitioners.findFirst({
    where: { user_id: session.user.id },
    select: { subscription_status: true },
  });

  if (!practitioner) {
    redirect('/');
  }

  const subscriptionStatus = practitioner.subscription_status ?? 'free';
  const planType = subscriptionStatus === 'active' ? 'premium' : 'freemium';

  return (
    <FinancePageClient
      initialSubscriptionStatus={subscriptionStatus}
      initialPlanType={planType}
    />
  );
}
