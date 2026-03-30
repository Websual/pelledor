import { NextRequest, NextResponse } from 'next/server';
import { startOfDay, endOfDay } from "date-fns";
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: practitionerId } = await params;

    if (!practitionerId) {
      return NextResponse.json(
        { error: 'Practitioner ID is required' },
        { status: 400 }
      );
    }

    console.log('Fetching practitioner details for:', practitionerId);

    // Récupérer les détails complets du praticien
    const practitioner = await prisma.practitioners.findUnique({
      where: { id: practitionerId },
      select: {
        id: true,
        slug: true,
        title: true,
        address: true,
        location_city: true,
        rating_avg: true,
        is_verified: true,
        services: {
          select: {
            id: true,
            name: true,
            price_cents: true,
            duration_min: true
          }
        }
      }
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: 'Practitioner not found' },
        { status: 404 }
      );
    }

    // Promotions actives par service (marketing_posts type PROMOTION)
    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);
    const servicePromotions: Record<string, { discountPercentage: number; discountedPriceCents: number; endDate: string }> = {};
    const serviceIds = practitioner.services.map((s) => s.id);
    const marketingPosts = await prisma.marketing_posts.findMany({
      where: {
        practitioner_id: practitionerId,
        discount_percentage: { not: null },
        start_date: { lte: dayEnd },
        end_date: { gte: dayStart },
        OR: [{ service_id: null }, { service_id: { in: serviceIds } }],
      },
      orderBy: { discount_percentage: "desc" },
    });
    for (const mp of marketingPosts) {
      if (!mp.discount_percentage || mp.discount_percentage <= 0) continue;
      const discount = Math.min(100, Math.max(0, mp.discount_percentage));
      const targetIds = mp.service_id ? [mp.service_id] : serviceIds;
      for (const sid of targetIds) {
        const svc = practitioner.services.find((s) => s.id === sid);
        if (svc?.price_cents) {
          const discounted = Math.round(svc.price_cents * (1 - discount / 100));
          if (!servicePromotions[sid] || discount > (servicePromotions[sid]?.discountPercentage ?? 0)) {
            servicePromotions[sid] = {
              discountPercentage: discount,
              discountedPriceCents: discounted,
              endDate: mp.end_date.toISOString(),
            };
          }
        }
      }
    }

    return NextResponse.json({
      ...practitioner,
      servicePromotions,
    });

  } catch (error) {
    console.error('Error fetching practitioner details:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}