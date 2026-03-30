import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { promises as fs } from "fs";
import path from "path";
import { createHash } from "crypto";
import { generateSlug } from "@/lib/slug";
import sharp from "sharp";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Trouver le praticien associé à l'utilisateur avec les infos nécessaires
    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
      include: {
        users: {
          select: {
            name: true,
          },
        },
        professions: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("image") as File || formData.get("file") as File;
    const uploadType = formData.get("type") as string; // "photo", "cover", "gallery", "certificate", "event"

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const uploadTypeRaw = (formData.get("type") as string) || "";
    const normalizedTypeForFile = uploadTypeRaw.toString().trim().toLowerCase();

    // Vérifier le type de fichier (images ; PDF autorisé pour event_poster uniquement)
    const allowedImageTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
    ];
    const mime = (file.type || "").toLowerCase();
    const isPdf = mime === "application/pdf";
    const isImage =
      allowedImageTypes.includes(mime) || mime.startsWith("image/");
    const allowPdfForPoster = normalizedTypeForFile === "event_poster";
    if (!isImage && !(allowPdfForPoster && isPdf)) {
      return NextResponse.json(
        { error: "Type de fichier non autorisé. Utilisez JPG, PNG, WebP" + (allowPdfForPoster ? " ou PDF (affiche)." : ".") },
        { status: 400 }
      );
    }

    // Vérifier la taille (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    const fileHash = createHash("md5").update(file.name + Date.now().toString()).digest("hex").substring(0, 8);

    // Événements : bannière (paysage) ou affiche/programme (image ou PDF)
    const normalizedType = (uploadType || "").toString().trim().toLowerCase();
    const eventsDir = "/var/www/holia-assets/public/uploads/events";
    await fs.mkdir(eventsDir, { recursive: true });

    if (normalizedType === "event_banner" && isImage) {
      try {
        const parts = ["banner"];
        if (practitioner.users?.name) parts.push(generateSlug(practitioner.users.name));
        if (practitioner.location_city) parts.push(generateSlug(practitioner.location_city));
        const seoName = parts.join("-").replace(/-+/g, "-").substring(0, 80) || "banner";
        const fileName = `${seoName}-${fileHash}.webp`;
        const filePath = path.join(eventsDir, fileName);
        const publicUrl = `/uploads/events/${fileName}`;
        const bytes = await file.arrayBuffer();
        let buffer: Buffer = Buffer.from(bytes);
        buffer = (await sharp(buffer)
          .resize({ width: 1920, height: 800, fit: "cover", position: "center" })
          .webp({ quality: 85, effort: 4 })
          .toBuffer()) as Buffer;
        await fs.writeFile(filePath, buffer);
        const stats = await fs.stat(filePath);
        if (stats.size === 0) {
          await fs.unlink(filePath).catch(() => {});
          return NextResponse.json({ error: "Fichier vide après traitement" }, { status: 500 });
        }
        return NextResponse.json({ success: true, url: publicUrl });
      } catch (eventError: any) {
        console.error("Error uploading event banner:", eventError);
        return NextResponse.json(
          { error: (eventError as Error)?.message || "Erreur lors de l'upload de la bannière" },
          { status: 500 }
        );
      }
    }

    if (
      (normalizedType === "event_poster" || normalizedType === "event" || normalizedType === "poster")
    ) {
      try {
        if (isPdf) {
          const fileName = `affiche-${fileHash}.pdf`;
          const filePath = path.join(eventsDir, fileName);
          const publicUrl = `/uploads/events/${fileName}`;
          const bytes = await file.arrayBuffer();
          await fs.writeFile(filePath, Buffer.from(bytes));
          return NextResponse.json({ success: true, url: publicUrl });
        }
        const parts = ["affiche"];
        if (practitioner.users?.name) parts.push(generateSlug(practitioner.users.name));
        if (practitioner.location_city) parts.push(generateSlug(practitioner.location_city));
        const seoName = parts.join("-").replace(/-+/g, "-").substring(0, 80) || "affiche";
        const fileName = `${seoName}-${fileHash}.webp`;
        const filePath = path.join(eventsDir, fileName);
        const publicUrl = `/uploads/events/${fileName}`;
        const bytes = await file.arrayBuffer();
        let buffer: Buffer = Buffer.from(bytes);
        try {
          buffer = (await sharp(buffer)
            .resize({ width: 1200, fit: "inside", withoutEnlargement: true })
            .webp({ quality: 85, effort: 4 })
            .toBuffer()) as Buffer;
        } catch (sharpError: any) {
          try {
            buffer = (await sharp(buffer).webp({ quality: 80 }).toBuffer()) as Buffer;
          } catch (fallbackError: any) {
            console.error("Sharp event poster processing failed:", (sharpError as Error)?.message, (fallbackError as Error)?.message);
            return NextResponse.json(
              { error: "Impossible de traiter l'image. Utilisez JPG ou PNG." },
              { status: 400 }
            );
          }
        }
        await fs.writeFile(filePath, buffer);
        const stats = await fs.stat(filePath);
        if (stats.size === 0) {
          await fs.unlink(filePath).catch(() => {});
          return NextResponse.json({ error: "Fichier vide après traitement" }, { status: 500 });
        }
        return NextResponse.json({ success: true, url: publicUrl });
      } catch (eventError: any) {
        console.error("Error uploading event poster:", eventError);
        return NextResponse.json(
          { error: (eventError as Error)?.message || "Erreur lors de l'upload de l'affiche" },
          { status: 500 }
        );
      }
    }

    // Profil praticien : structure p/{lastDigit}/{practitionerId}/
    const baseUploadsDir = "/var/www/holia-assets/public/uploads/p";
    const hash = createHash("md5").update(practitioner.id).digest("hex");
    const lastDigit = parseInt(hash.slice(-1), 16) % 10;
    const practitionerDir = path.join(baseUploadsDir, lastDigit.toString(), practitioner.id);

    let fileName: string;
    if (practitioner.users?.name || practitioner.professions?.name || practitioner.location_city) {
      const parts: string[] = [];
      if (uploadType === "photo") parts.push("photo");
      else if (uploadType === "cover") parts.push("cover");
      else if (uploadType === "certificate") parts.push("certificat");
      else if (uploadType === "gallery") parts.push("galerie");
      if (practitioner.users?.name) parts.push(generateSlug(practitioner.users.name));
      if (practitioner.professions?.name) parts.push(generateSlug(practitioner.professions.name));
      if (practitioner.location_city) parts.push(generateSlug(practitioner.location_city));
      const seoName = parts.join("-").substring(0, 100);
      fileName = `${seoName}-${fileHash}.webp`;
    } else {
      const typePrefix = uploadType || "image";
      fileName = `${typePrefix}-${practitioner.id}-${fileHash}.webp`;
    }

    const filePath = path.join(practitionerDir, fileName);
    const publicUrl = `/uploads/p/${lastDigit}/${practitioner.id}/${fileName}`;
    await fs.mkdir(practitionerDir, { recursive: true });

    // Lire le fichier
    const bytes = await file.arrayBuffer();
    let buffer: Buffer = Buffer.from(bytes);

    // Traiter l'image avec Sharp
    try {
      // Redimensionnement selon le type
      let sharpInstance = sharp(buffer);
      
      if (uploadType === "photo") {
        // Photo de profil : carré 600x600
        sharpInstance = sharpInstance.resize({ width: 600, height: 600, fit: "cover" });
      } else if (uploadType === "cover") {
        // Photo de couverture : largeur 1200px, hauteur proportionnelle
        sharpInstance = sharpInstance.resize({ width: 1200, fit: "inside", withoutEnlargement: true });
      } else {
        // Galerie et certificats : largeur max 1200px
        sharpInstance = sharpInstance.resize({ width: 1200, fit: "inside", withoutEnlargement: true });
      }
      
      buffer = await sharpInstance
        .webp({ quality: 85, effort: 4 })
        .toBuffer() as Buffer;
    } catch (sharpError: any) {
      console.error("Error processing image with Sharp:", sharpError);
      // Si Sharp échoue, essayer une conversion basique
      try {
        buffer = (await sharp(buffer)
          .webp({ quality: 80 })
          .toBuffer()) as Buffer;
      } catch (basicError: any) {
        console.error("Error with basic Sharp conversion:", basicError);
        return NextResponse.json(
          { error: "Failed to process image" },
          { status: 500 }
        );
      }
    }

    // Sauvegarder le fichier
    console.log(`Saving file to: ${filePath}`);
    await fs.writeFile(filePath, buffer);
    console.log(`File saved successfully, size: ${buffer.length} bytes`);

    // Vérifier que le fichier a bien été créé
    try {
      const stats = await fs.stat(filePath);
      console.log(`File verified: ${filePath}, size: ${stats.size} bytes`);
      if (stats.size === 0) {
        await fs.unlink(filePath);
        return NextResponse.json(
          { error: "File was empty after processing" },
          { status: 500 }
        );
      }
    } catch (statError: any) {
      console.error(`Failed to verify saved file: ${statError.message}`);
      return NextResponse.json(
        { error: "Failed to verify saved file" },
        { status: 500 }
      );
    }

    console.log(`Upload successful, returning URL: ${publicUrl}`);
    return NextResponse.json({
      success: true,
      url: publicUrl,
    });
  } catch (error: any) {
    console.error("Error uploading practitioner image:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload image" },
      { status: 500 }
    );
  }
}
