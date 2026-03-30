import { NextRequest, NextResponse } from 'next/server';
import { detectCityFromIP } from './lib/geolocation';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Log pour déboguer
  console.log('[Middleware] Processing request:', {
    pathname,
    method: request.method,
    url: request.url,
  });

  // Exclure explicitement les routes API auth, assets Next.js, et fichiers statiques
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/uploads') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next();
  }

  // Laisser passer les routes admin sans intervention (pas de redirection, pas de logique spéciale)
  if (pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Laisser passer les routes pro sans intervention
  if (pathname.startsWith('/pro')) {
    return NextResponse.next();
  }

  // Laisser passer les routes account sans intervention
  if (pathname.startsWith('/account')) {
    return NextResponse.next();
  }

  // Laisser passer la route de connexion sans intervention (éviter les boucles)
  if (pathname === '/connexion' || pathname.startsWith('/connexion/')) {
    return NextResponse.next();
  }

  // Vérifier si c'est une page sujet avec une ville qui pourrait être optimisée
  // Pattern: /sujet/[slug]/[city]
  const subjectCityMatch = pathname.match(/^\/sujet\/([^\/]+)\/([^\/]+)$/);
  if (subjectCityMatch) {
    const subjectSlug = subjectCityMatch[1];
    const currentCity = subjectCityMatch[2];

    // Si c'est une ville par défaut (paris), on peut proposer la ville détectée
    // Mais seulement si ce n'est pas déjà une requête avec un cookie indiquant que l'utilisateur a choisi cette ville
    if (currentCity === 'paris') {
      const cityCookie = request.cookies.get('user-ip-city');
      if (!cityCookie) {
        // Détecter la ville de l'utilisateur
        const userCity = await detectCityFromIP(request);

        if (userCity !== 'paris') {
          // Rediriger vers la ville détectée
          const newPathname = `/sujet/${subjectSlug}/${userCity}`;
          const newUrl = new URL(newPathname, request.url);

          // Ajouter un cookie pour éviter les redirections en boucle
          const response = NextResponse.redirect(newUrl, { status: 302 });
          response.cookies.set('user-ip-city', userCity, {
            maxAge: 60 * 60 * 24 * 30, // 30 jours
            path: '/',
          });
          return response;
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth routes)
     * - api (other API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _next (all Next.js internals)
     * - favicon.ico (favicon file)
     * - uploads (uploaded files)
     * - static files (images, fonts, etc.)
     */
    '/((?!api/auth|api|_next|favicon\\.ico|uploads|.*\\.(?:ico|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot)$).*)',
  ],
};