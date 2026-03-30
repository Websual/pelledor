
// Fonction pour normaliser un nom de ville
export function normalizeCity(city: string): string {
  return city.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
}

// Fonction pour valider et trouver une ville correspondante
export function getValidCity(userCity: string, cities: string[] = []): string {
  if (!userCity) return 'paris';

  const normalizedUserCity = normalizeCity(userCity);

  // Chercher une correspondance exacte
  const exactMatch = cities.find(city =>
    normalizeCity(city) === normalizedUserCity
  );

  if (exactMatch) {
    return normalizeCity(exactMatch);
  }

  // Chercher une correspondance partielle
  const partialMatch = cities.find(city =>
    normalizeCity(city).includes(normalizedUserCity) ||
    normalizedUserCity.includes(normalizeCity(city))
  );

  if (partialMatch) {
    return normalizeCity(partialMatch);
  }

  // Fallback vers Paris
  return 'paris';
}

// Fonction pour détecter la ville via IP (côté serveur)
export async function detectCityFromIP(request: Request): Promise<string> {
  try {
    // Essayer d'abord les headers Vercel
    const vercelCity = request.headers.get('x-vercel-ip-city');
    if (vercelCity) {
      return getValidCity(vercelCity);
    }

    // Essayer d'obtenir l'IP du client
    const clientIP = getClientIP(request);
    if (!clientIP) {
      return 'paris'; // Fallback
    }

    // Utiliser ipapi.co pour la géolocalisation
    const response = await fetch(`https://ipapi.co/${clientIP}/json/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Holia-Geolocation/1.0',
      },
      // Timeout pour éviter les blocages
      signal: AbortSignal.timeout(3000),
    });

    if (response.ok) {
      const data = await response.json();

      // Vérifier que c'est bien en France
      if (data.country === 'FR' && data.city) {
        return getValidCity(data.city);
      }
    }
  } catch (error) {
    console.warn('Erreur lors de la détection IP:', error);
  }

  return 'paris'; // Fallback
}

// Fonction pour extraire l'IP du client depuis les headers
function getClientIP(request: Request): string | null {
  // Headers possibles contenant l'IP
  const ipHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip', // Cloudflare
    'x-cluster-client-ip', // Vercel
    'x-forwarded',
    'forwarded-for',
    'forwarded',
  ];

  for (const header of ipHeaders) {
    const value = request.headers.get(header);
    if (value) {
      // Prendre la première IP si c'est une liste
      const ip = value.split(',')[0].trim();
      if (ip && ip !== 'unknown') {
        return ip;
      }
    }
  }

  return null;
}

// Fonction pour formater le nom d'affichage d'une ville
export function formatDisplayCity(city: string): string {
  if (city === 'paris') return 'Paris';

  // Capitaliser la première lettre
  return city.charAt(0).toUpperCase() + city.slice(1);
}