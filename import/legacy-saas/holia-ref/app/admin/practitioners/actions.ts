"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import path from "path";
import { promises as fs } from "fs";
import { createHash } from "crypto";

const ASSETS_BASE = "/var/www/holia-assets/public";

/**
 * Convertit une URL ou un chemin relatif en chemin physique sur le disque.
 * Ex: https://holia.me/uploads/p/1/xxx/photo.webp -> /var/www/holia-assets/public/uploads/p/1/xxx/photo.webp
 */
function urlToFilePath(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string" || !url.trim()) return null;
  let pathname = url.trim();
  try {
    if (pathname.startsWith("http://") || pathname.startsWith("https://")) {
      const u = new URL(pathname);
      pathname = u.pathname;
    }
  } catch {
    // pas une URL valide
  }
  if (!pathname.startsWith("/")) return null;
  const fullPath = path.join(ASSETS_BASE, pathname);
  // Sécurité : s'assurer qu'on reste sous ASSETS_BASE
  const resolved = path.resolve(fullPath);
  if (!resolved.startsWith(ASSETS_BASE)) return null;
  return resolved;
}

/**
 * Supprime un fichier du disque. Ignore les erreurs (fichier absent, etc.)
 */
async function safeUnlink(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // Fichier absent ou autre erreur : on ignore
  }
}

/**
 * Supprime un répertoire récursivement. Ignore les erreurs.
 */
async function safeRmDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true });
  } catch {
    // Répertoire absent ou autre erreur : on ignore
  }
}

export async function deletePractitioner(practitionerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return { success: false, error: "Non autorisé" };
    }

    const practitioner = await prisma.practitioners.findUnique({
      where: { id: practitionerId },
      select: {
        id: true,
        photo_url: true,
        cover_photo_url: true,
        gallery: true,
        verification_document_url: true,
        diploma_document_url: true,
        kbis_document_url: true,
        rcp_document_url: true,
      },
    });

    if (!practitioner) {
      return { success: false, error: "Praticien introuvable" };
    }

    const pathsToDelete: string[] = [];

    [practitioner.photo_url, practitioner.cover_photo_url].forEach((u) => {
      const p = urlToFilePath(u);
      if (p) pathsToDelete.push(p);
    });

    (practitioner.gallery || []).forEach((u) => {
      const p = urlToFilePath(u);
      if (p) pathsToDelete.push(p);
    });

    [
      practitioner.verification_document_url,
      practitioner.diploma_document_url,
      practitioner.kbis_document_url,
      practitioner.rcp_document_url,
    ].forEach((u) => {
      const p = urlToFilePath(u);
      if (p) pathsToDelete.push(p);
    });

    for (const filePath of pathsToDelete) {
      await safeUnlink(filePath);
    }

    // Supprimer le répertoire du praticien (uploads/p/{lastDigit}/{practitionerId})
    const hash = createHash("md5").update(practitioner.id).digest("hex");
    const lastDigit = parseInt(hash.slice(-1), 16) % 10;
    const practitionerDir = path.join(ASSETS_BASE, "uploads", "p", lastDigit.toString(), practitioner.id);
    await safeRmDir(practitionerDir);

    await prisma.practitioners.delete({
      where: { id: practitionerId },
    });

    revalidatePath("/admin/practitioners");
    return { success: true };
  } catch (e: any) {
    console.error("[deletePractitioner]", e);
    return {
      success: false,
      error: e?.message || "Erreur lors de la suppression du praticien",
    };
  }
}
