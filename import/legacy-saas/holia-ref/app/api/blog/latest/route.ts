import { NextRequest, NextResponse } from "next/server";
import { getLatestPosts } from "@/lib/blog";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(Number(searchParams.get("limit")) || 6, 20);
    const category = searchParams.get("category") ?? undefined;

    const posts = getLatestPosts(limit, category);
    return NextResponse.json({ posts });
  } catch (e) {
    console.error("GET /api/blog/latest:", e);
    return NextResponse.json(
      { error: "Failed to load latest posts" },
      { status: 500 }
    );
  }
}
