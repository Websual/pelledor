import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;

    if (!pathSegments || pathSegments.length === 0) {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }

    // Reconstruire le chemin complet
    const imagePath = pathSegments.join('/');

    // Sécurité : vérifier que le chemin commence par uploads/p/
    if (!imagePath.startsWith("uploads/p/") || imagePath.includes("..") || imagePath.includes("\\")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    // Construire le chemin complet vers le fichier dans /holia-assets/
    const fullPath = path.join(
      "/var/www/holia-assets/public",
      imagePath
    );

    try {
      await fs.access(fullPath);
    } catch {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const fileBuffer = await fs.readFile(fullPath);
    const ext = path.extname(imagePath).toLowerCase();
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
    console.error("Error serving image:", error);
    return NextResponse.json(
      { error: "Failed to serve image" },
      { status: 500 }
    );
  }
}