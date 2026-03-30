import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function requireAdmin() {
  return async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    if (session.user.role !== "ADMIN") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    return { session: session.user };
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}

export async function GET() {
  try {
    const auth = await (requireAdmin())();
    if (auth.error) return auth.error;

    const professions = await prisma.professions.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { practitioners: true } } },
    });

    return NextResponse.json(professions);
  } catch (error) {
    console.error("Error fetching professions:", error);
    return NextResponse.json({ error: "Failed to fetch professions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await (requireAdmin())();
    if (auth.error) return auth.error;

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    let slug = typeof body.slug === "string" ? body.slug.trim() : slugify(name);
    const descriptionPseo = typeof body.description_pseo === "string" ? body.description_pseo.trim() || null : null;

    if (!name) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    slug = slug || slugify(name);
    if (!slug) return NextResponse.json({ error: "Slug invalide" }, { status: 400 });

    const existing = await prisma.professions.findFirst({
      where: { OR: [{ slug }, { name }] },
    });
    if (existing) {
      return NextResponse.json(
        { error: existing.slug === slug ? "Ce slug existe déjà" : "Ce nom existe déjà" },
        { status: 409 }
      );
    }

    const profession = await prisma.professions.create({
      data: { id: slug, name, slug, description_pseo: descriptionPseo },
    });

    return NextResponse.json(profession);
  } catch (error) {
    console.error("Error creating profession:", error);
    return NextResponse.json({ error: "Failed to create profession" }, { status: 500 });
  }
}