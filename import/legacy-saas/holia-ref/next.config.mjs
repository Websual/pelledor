import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['next-mdx-remote'],
  // output: 'standalone', // Disabled for static file serving
  images: {
    unoptimized: true
  },
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  // Force dynamic rendering for admin routes
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  // Redirections (anciens slugs → nouveaux). Éditer redirects.json puis rebuild.
  async redirects() {
    try {
      const path = join(__dirname, 'redirects.json');
      const raw = readFileSync(path, 'utf8');
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  },
  // Rewrite pour servir les uploads depuis holia-assets via l'API
  async rewrites() {
    return [
      {
        source: '/uploads/p/:lastDigit/:practitionerId/:filename',
        destination: '/api/uploads/p/:lastDigit/:practitionerId/:filename',
      },
      {
        source: '/uploads/avatars/:filename',
        destination: '/api/uploads/avatars/:filename',
      },
      {
        source: '/uploads/events/:filename',
        destination: '/api/uploads/events/:filename',
      },
    ];
  },
};

export default nextConfig;