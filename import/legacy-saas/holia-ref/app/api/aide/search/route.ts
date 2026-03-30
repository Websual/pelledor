import { NextRequest, NextResponse } from "next/server";
import { searchArticles } from "@/lib/mdx";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const profile = req.nextUrl.searchParams.get("profile") as "pro" | "patient" | undefined;
  if (profile && !["pro", "patient"].includes(profile)) {
    return NextResponse.json({ error: "Invalid profile" }, { status: 400 });
  }

  const results = searchArticles(q, profile).slice(0, 8).map(({ profile: p, category, article }) => ({
    profile: p,
    category: { id: category.id, label: category.label },
    article: { slug: article.slug, title: article.frontmatter.title, target: article.frontmatter.target },
  }));

  return NextResponse.json(results);
}
