import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createId } from "@paralleldrive/cuid2";
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
    const file = formData.get("file") as File;
    const documentType = formData.get("type") as string; // "diploma", "kbis", "rcp"

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!documentType || !["diploma", "kbis", "rcp"].includes(documentType)) {
      return NextResponse.json(
        { error: "Invalid document type. Must be 'diploma', 'kbis', or 'rcp'" },
        { status: 400 }
      );
    }

    // Vérifier le type de fichier (PDF, images)
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF and images are allowed." },
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

    // Utiliser la même structure de dossiers que le script de scraping
    const baseUploadsDir = "/var/www/holia-assets/public/uploads/p";
    // Calculer un chiffre 0-9 basé sur le hash de l'ID pour la distribution
    const hash = createHash("md5").update(practitioner.id).digest("hex");
    const lastDigit = parseInt(hash.slice(-1), 16) % 10; // 0-9
    const practitionerDir = path.join(baseUploadsDir, lastDigit.toString(), practitioner.id);

    // Générer le nom du fichier SEO-friendly
    const fileExtension = path.extname(file.name).toLowerCase();
    const isImage = ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type);
    const finalExtension = isImage ? ".webp" : fileExtension; // Convertir les images en WebP

    let fileName: string;
    const documentTypeLabels: Record<string, string> = {
      diploma: "diplome",
      kbis: "kbis",
      rcp: "rcp-pro",
    };
    const documentLabel = documentTypeLabels[documentType] || documentType;

    // Générer un nom SEO-friendly si on a les infos du praticien
    if (practitioner.users?.name || practitioner.professions?.name || practitioner.location_city) {
      const parts: string[] = [];
      parts.push(documentLabel);
      if (practitioner.users?.name) parts.push(generateSlug(practitioner.users.name));
      if (practitioner.professions?.name) parts.push(generateSlug(practitioner.professions.name));
      if (practitioner.location_city) parts.push(generateSlug(practitioner.location_city));

      const seoName = parts.join("-").substring(0, 100);
      // Hash du nom de fichier original pour l'unicité
      const fileHash = createHash("md5").update(file.name + Date.now().toString()).digest("hex").substring(0, 4);
      fileName = `${seoName}-${fileHash}${finalExtension}`;
    } else {
      // Fallback si pas d'infos
      const fileHash = createHash("md5").update(file.name + Date.now().toString()).digest("hex").substring(0, 8);
      fileName = `${documentType}-${practitioner.id}-${fileHash}${finalExtension}`;
    }

    const filePath = path.join(practitionerDir, fileName);
    const publicUrl = `/uploads/p/${lastDigit}/${practitioner.id}/${fileName}`;

    // Créer le dossier s'il n'existe pas
    await fs.mkdir(practitionerDir, { recursive: true });

    // Lire le fichier
    const bytes = await file.arrayBuffer();
    let buffer: Buffer = Buffer.from(bytes);

    // Traiter l'image avec Sharp si c'est une image
    if (isImage) {
      try {
        buffer = (await sharp(buffer)
          .resize({ width: 1200, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 85, effort: 4 })
          .toBuffer()) as Buffer;
      } catch (sharpError: any) {
        console.error("Error processing image with Sharp:", sharpError);
        // Si Sharp échoue, essayer une conversion basique
        try {
          buffer = (await sharp(buffer)
            .webp({ quality: 80 })
            .toBuffer()) as Buffer;
        } catch (basicError: any) {
          console.error("Error with basic Sharp conversion:", basicError);
          // Si même la conversion basique échoue, garder le fichier original
          // mais changer l'extension en .webp quand même pour la cohérence
          // (ou garder l'extension originale si c'est un PDF)
        }
      }
    }

    // Sauvegarder le fichier
    await fs.writeFile(filePath, buffer);

    // Vérifier que le fichier a bien été créé
    try {
      const stats = await fs.stat(filePath);
      if (stats.size === 0) {
        await fs.unlink(filePath);
        return NextResponse.json(
          { error: "File was empty after processing" },
          { status: 500 }
        );
      }
    } catch (statError) {
      return NextResponse.json(
        { error: "Failed to verify saved file" },
        { status: 500 }
      );
    }

    // Mettre à jour le praticien avec l'URL du document selon le type
    const updateData: any = {
      updated_at: new Date(),
    };

    if (documentType === "diploma") {
      updateData.diploma_document_url = publicUrl;
      updateData.diploma_verified = false; // Réinitialiser le statut de vérification
    } else if (documentType === "kbis") {
      updateData.kbis_document_url = publicUrl;
      updateData.kbis_verified = false;
    } else if (documentType === "rcp") {
      updateData.rcp_document_url = publicUrl;
      updateData.rcp_verified = false;
    }

    await prisma.practitioners.update({
      where: { id: practitioner.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      url: publicUrl,
    });
  } catch (error) {
    console.error("Error uploading verification document:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}
