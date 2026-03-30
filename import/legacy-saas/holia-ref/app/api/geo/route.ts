import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";


export async function GET() {
  try {
    const [professionsData, citiesData] = await Promise.all([
      prisma.professions.findMany({
        select: { name: true },
        orderBy: { name: 'asc' }
      }),
      prisma.cities.findMany({
        select: { name: true },
        orderBy: { name: 'asc' }
      })
    ]);

    const professions = professionsData.map(p => p.name);
    const cities = citiesData.map(c => c.name);

    return NextResponse.json({
      professions,
      cities
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des données geo:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}