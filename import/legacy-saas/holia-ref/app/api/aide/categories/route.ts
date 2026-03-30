import { NextRequest, NextResponse } from "next/server";
import { listArticlesByProfile } from "@/lib/mdx";

export async function GET(req: NextRequest) {
  const profile = req.nextUrl.searchParams.get("profile") as "pro" | "patient" | null;
  if (!profile || !["pro", "patient"].includes(profile)) {
    return NextResponse.json({ error: "Invalid profile" }, { status: 400 });
  }

  const categories = listArticlesByProfile(profile);
  return NextResponse.json(categories);
}
