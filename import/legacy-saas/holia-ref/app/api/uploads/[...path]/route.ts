import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const UPLOADS_BASE = '/var/www/holia-assets/public/uploads';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathArray } = await params;
    const filePath = pathArray.join('/');
    // Bloquer path traversal (.., \, chemins absolus)
    if (filePath.includes('..') || filePath.includes('\\') || path.isAbsolute(filePath)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    const fullPath = path.join(UPLOADS_BASE, filePath);
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(path.resolve(UPLOADS_BASE))) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    // Vérifier que le fichier existe
    await fs.access(resolved);

    // Lire le fichier
    const fileBuffer = await fs.readFile(resolved);

    // Déterminer le type MIME basé sur l'extension
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Erreur lors de la lecture du fichier upload:', error);
    return NextResponse.json({ error: 'Fichier non trouvé' }, { status: 404 });
  }
}