import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (session.user.role !== "ADMIN") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { session: session.user };
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    const profession = await prisma.professions.findUnique({ where: { id } });
    if (!profession) return NextResponse.json({ error: "Profession introuvable" }, { status: 404 });

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : profession.name;
    let slug = typeof body.slug === "string" ? body.slug.trim() : profession.slug;
    const descriptionPseo = body.description_pseo !== undefined
      ? (typeof body.description_pseo === "string" ? body.description_pseo.trim() || null : null)
      : profession.description_pseo;
    const syncUnclaimedJobTitles = body.sync_unclaimed_job_titles === true;

    slug = slug || slugify(name);
    if (!name) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    if (!slug) return NextResponse.json({ error: "Slug invalide" }, { status: 400 });

    const existing = await prisma.professions.findFirst({
      where: {
        OR: [{ slug }, { name }],
        NOT: { id },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: existing.slug === slug ? "Ce slug existe déjà" : "Ce nom existe déjà" },
        { status: 409 }
      );
    }

    const newName = name;
    const updated = await prisma.professions.update({
      where: { id },
      data: { name: newName, slug, description_pseo: descriptionPseo },
    });

    if (syncUnclaimedJobTitles && (profession.name !== newName || profession.slug !== slug)) {
      await prisma.practitioners.updateMany({
        where: { profession_id: id, is_claimed: false },
        data: { title: newName },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating profession:", error);
    return NextResponse.json({ error: "Failed to update profession" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    const profession = await prisma.professions.findUnique({
      where: { id },
      include: { _count: { select: { practitioners: true } } },
    });

    if (!profession) return NextResponse.json({ error: "Profession introuvable" }, { status: 404 });
    if (profession._count.practitioners > 0) {
      return NextResponse.json(
        { error: `Impossible de supprimer : ${profession._count.practitioners} praticien(s) associé(s). Désassociez-les ou supprimez-les d'abord.` },
        { status: 400 }
      );
    }

    await prisma.profession_mutuelles.deleteMany({ where: { profession_id: id } });
    await prisma.subject_professions.deleteMany({ where: { profession_id: id } });
    await prisma.professions.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting profession:", error);
    return NextResponse.json({ error: "Failed to delete profession" }, { status: 500 });
  }
}
