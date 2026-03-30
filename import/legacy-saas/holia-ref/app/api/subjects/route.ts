import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const subjectsData = await prisma.subjects.findMany({
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      subjects: subjectsData
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des sujets:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}