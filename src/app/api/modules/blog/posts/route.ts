import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { blogPosts } from "@/core/db/schema.modules";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug");
  const db = getDb();
  if (slug) {
    const row = await db.query.blogPosts.findFirst({
      where: eq(blogPosts.slug, slug),
    });
    if (!row || !row.published)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ post: row });
  }
  const rows = await db
    .select({
      slug: blogPosts.slug,
      title: blogPosts.title,
      createdAt: blogPosts.createdAt,
    })
    .from(blogPosts)
    .where(eq(blogPosts.published, true))
    .orderBy(desc(blogPosts.createdAt));
  return NextResponse.json({ posts: rows });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin requis" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .slice(0, 160);
  const title = String(body.title || "").slice(0, 512);
  const postBody = String(body.body || "");
  const published = Boolean(body.published);
  if (!slug || !title) return NextResponse.json({ error: "slug, title" }, { status: 400 });
  const db = getDb();
  const [row] = await db
    .insert(blogPosts)
    .values({
      slug,
      title,
      body: postBody,
      published,
      authorUserId: session.user.id,
    })
    .returning();
  return NextResponse.json({ post: row });
}
