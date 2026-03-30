import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import SettingsPageClient from './settings-client';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'PRACTITIONER') {
    redirect('/connexion?callbackUrl=/pro/settings');
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
    <SettingsPageClient
      initialSubscriptionStatus={subscriptionStatus}
      initialPlanType={planType}
    />
  );
}
