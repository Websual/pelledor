import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lastDigit: string; practitionerId: string; filename: string }> }
) {
  try {
    const { lastDigit, practitionerId, filename } = await params;

    // Path traversal : rejeter .. et \ dans les segments
    if ([lastDigit, practitionerId, filename].some((s) => !s || s.includes("..") || s.includes("\\") || s.includes("/"))) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const baseDir = "/var/www/holia-assets/public/uploads/p";
    const filePath = path.join(baseDir, lastDigit, practitionerId, filename);
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(baseDir))) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    try {
      await fs.access(filePath);
      console.log(`File found: ${filePath}`);
    } catch (error: any) {
      console.error(`File not found: ${filePath}, error: ${error.message}`);
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = await fs.readFile(filePath);
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".webp": "image/webp",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving image file:", error);
    return NextResponse.json(
      { error: "Failed to serve image" },
      { status: 500 }
    );
  }
}