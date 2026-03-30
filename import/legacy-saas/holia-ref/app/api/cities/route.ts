import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";

    if (query.length < 2) {
      return NextResponse.json([]);
    }

    // Get distinct cities from practitioners
    const cities = await prisma.practitioners.findMany({
      where: {
        is_verified: true,
        is_active: true,
        location_city: {
          contains: query,
          mode: "insensitive",
        },
      },
      select: {
        location_city: true,
      },
      distinct: ["location_city"],
      take: 10,
      orderBy: {
        location_city: "asc",
      },
    });

    const cityNames = cities
      .map((c) => c.location_city)
      .filter((city): city is string => city !== null && city !== undefined)
      .filter((city, index, self) => self.indexOf(city) === index); // Remove duplicates

    return NextResponse.json(cityNames);
  } catch (error) {
    console.error("Error fetching cities:", error);
    return NextResponse.json([], { status: 500 });
  }
}

