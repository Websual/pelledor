import { NextResponse } from "next/server";
import archiver from "archiver";
import fs from "fs";
import path from "path";

const FILES = [
  { name: "logo-holia-vert.webp", path: "images/logo-h-green.webp" },
  { name: "dashboard-agenda.webp", path: "images/pro-agenda-reservation.webp" },
  { name: "dashboard-profil.webp", path: "images/pro-profil.webp" },
  { name: "dashboard-facturation.webp", path: "images/pro-facturation-automatique.webp" },
];

export async function GET() {
  const publicDir = path.join(process.cwd(), "public");

  const archive = archiver("zip", { zlib: { level: 9 } });
  const chunks: Buffer[] = [];

  const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);

    for (const file of FILES) {
      const fullPath = path.join(publicDir, file.path);
      if (fs.existsSync(fullPath)) {
        archive.file(fullPath, { name: file.name });
      }
    }
    archive.finalize();
  });

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="holia-media-kit.zip"',
      "Content-Length": String(zipBuffer.length),
    },
  });
}
