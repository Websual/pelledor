import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imagePath = searchParams.get('p');

    console.log(`API IMG: p=${imagePath}`);

    if (!imagePath) {
      console.log("❌ Missing path parameter");
      return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
    }

    // Décoder le chemin (il peut être encodé en base64 ou URL-encoded)
    let decodedPath: string;
    try {
      decodedPath = decodeURIComponent(imagePath);
    } catch {
      return NextResponse.json({ error: "Invalid path encoding" }, { status: 400 });
    }

    // Sécurité : vérifier que le chemin commence par uploads/p/
    if (!decodedPath.startsWith("uploads/p/") || decodedPath.includes("..") || decodedPath.includes("\\")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    // Construire le chemin complet vers le fichier dans /holia-assets/
    const fullPath = path.join(
      "/var/www/holia-assets/public",
      decodedPath
    );

    try {
      await fs.access(fullPath);
    } catch {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const fileBuffer = await fs.readFile(fullPath);
    const ext = path.extname(decodedPath).toLowerCase();
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