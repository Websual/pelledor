import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Route catch-all pour servir les uploads depuis holi-assets en développement
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    // Construire le chemin complet
    const filePath = resolvedParams.path.join('/');
    const fullPath = path.join('/var/www/holia-assets/uploads', filePath);

    // Sécurité : vérifier que le chemin est dans le dossier uploads
    const resolvedPath = path.resolve(fullPath);
    const uploadsDir = path.resolve('/var/www/holia-assets/uploads');

    if (!resolvedPath.startsWith(uploadsDir)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Vérifier que le fichier existe
    try {
      await fs.access(fullPath);
    } catch {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Lire le fichier
    const fileBuffer = await fs.readFile(fullPath);

    // Déterminer le type MIME basé sur l'extension
    const ext = path.extname(fullPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // Retourner le fichier avec les headers de cache appropriés
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // 1 an de cache
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });

  } catch (error) {
    console.error('Error serving upload file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}