import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { promises as fs } from "fs";
import path from "path";
import { createHash } from "crypto";
import sharp from "sharp";

const BASE_UPLOADS = "/var/www/holia-assets/public/uploads";
const AVATARS_DIR = "avatars";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = (formData.get("image") || formData.get("file")) as File;

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Format invalide. Seules les images sont acceptées." },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Fichier trop volumineux. Maximum 5 Mo." },
        { status: 400 }
      );
    }

    const avatarsPath = path.join(BASE_UPLOADS, AVATARS_DIR);
    await fs.mkdir(avatarsPath, { recursive: true });

    const fileHash = createHash("md5")
      .update(session.user.id + Date.now().toString())
      .digest("hex")
      .substring(0, 8);
    const fileName = `${session.user.id}-${fileHash}.webp`;
    const filePath = path.join(avatarsPath, fileName);
    const publicUrl = `/uploads/${AVATARS_DIR}/${fileName}`;

    const bytes = await file.arrayBuffer();
    let buffer: Buffer = Buffer.from(bytes);

    try {
      buffer = (await sharp(buffer)
        .resize({ width: 200, height: 200, fit: "cover" })
        .webp({ quality: 85, effort: 4 })
        .toBuffer()) as Buffer;
    } catch (err) {
      console.error("Error processing avatar with Sharp:", err);
      return NextResponse.json(
        { error: "Impossible de traiter l'image" },
        { status: 500 }
      );
    }

    await fs.writeFile(filePath, buffer);

    await prisma.users.update({
      where: { id: session.user.id },
      data: { image: publicUrl },
    });

    return NextResponse.json({
      success: true,
      url: publicUrl,
    });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return NextResponse.json(
      { error: "Échec de l'upload" },
      { status: 500 }
    );
  }
}
