import { Metadata } from "next";
import { notFound } from "next/navigation";
import { SubjectCityClient } from "./client";
import { prisma } from "@/lib/prisma";
interface PageProps {
  params: Promise<{
    slug: string;
    city: string;
    locale: string;
  }>;
  searchParams?: Promise<{
    page?: string;
  }>;
}

// Trouver les informations du sujet
async function getSubjectInfo(slug: string) {
  try {
    const subject = await prisma.subjects.findUnique({
      where: { slug }
    });

    return subject;
  } catch (error) {
    console.error('Erreur lors de la récupération du sujet:', error);
    return null;
  }
}

// Géocoder une ville : Adresse Gouv d'abord, fallback Mapbox pour pays francophones limitrophes
async function geocodeCity(city: string): Promise<{ lat: number; lng: number; name: string; department?: string; region?: string } | null> {
  try {
    // 1. Adresse Gouv (France)
    let response = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(city)}&type=municipality&limit=1`
    );
    if (response.ok) {
      let data = await response.json();
      if (!data.features?.length) {
        response = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(city)}&limit=1`
        );
        if (response.ok) data = await response.json();
      }
      if (data.features?.length) {
        const feature = data.features[0];
        const [lng, lat] = feature.geometry.coordinates;
        const name = feature.properties.city || feature.properties.name;
        let department: string | undefined;
        let region: string | undefined;
        if (feature.properties.context) {
          const contextParts = feature.properties.context.split(',').map((p: string) => p.trim());
          if (contextParts.length >= 2) {
            if (/^\d+$/.test(contextParts[1])) region = contextParts[2];
            else region = contextParts[1];
          }
        }
        return { lat, lng, name, department, region };
      }
    }

    // 2. Fallback Mapbox pour pays francophones limitrophes (BE, CH, LU, etc.)
    const { geocodeCityWithMapbox } = await import('@/lib/geocoding');
    const mapboxResult = await geocodeCityWithMapbox(city);
    if (mapboxResult) {
      return {
        lat: mapboxResult.lat,
        lng: mapboxResult.lng,
        name: mapboxResult.name,
      };
    }
    return null;
  } catch (error) {
    console.error('Erreur lors du géocodage:', error);
    return null;
  }
}

// Vérifier si la ville existe dans la base
async function isValidCity(city: string): Promise<boolean> {
  try {
    const cityRecord = await prisma.cities.findFirst({
      where: { name: { equals: city, mode: 'insensitive' } }
    });
    return !!cityRecord;
  } catch (error) {
    console.error('Erreur lors de la validation de la ville:', error);
    return false;
  }
}

// Vérifier si la combinaison sujet/city est valide
async function isValidCombination(slug: string, city: string): Promise<boolean> {
  const [subject, cityValid] = await Promise.all([
    getSubjectInfo(slug),
    isValidCity(city)
  ]);

  return !!(subject && cityValid);
}

// Formatter le nom de la ville pour l'affichage
async function formatCity(city: string): Promise<string> {
  try {
    const cityRecord = await prisma.cities.findFirst({
      where: { name: { equals: city, mode: 'insensitive' } }
    });
    return cityRecord?.name || city;
  } catch (error) {
    console.error('Erreur lors du formatage de la ville:', error);
    return city;
  }
}

// Templates variés pour le contenu descriptif des sujets
const SUBJECT_DESCRIPTION_TEMPLATES = [
  {
    intro: "Vous cherchez des solutions naturelles pour soulager vos {subject} à {city} ? Découvrez les meilleurs praticiens spécialisés dans l'accompagnement de ces troubles.",
    benefits: "Nos thérapeutes utilisent des approches holistiques et personnalisées pour vous aider à retrouver équilibre et bien-être."
  },
  {
    intro: "À {city}, plusieurs praticiens peuvent vous accompagner efficacement dans la gestion de vos {subject}. Holia.me vous aide à trouver le professionnel adapté à vos besoins.",
    benefits: "Bénéficiez d'un accompagnement professionnel avec des méthodes éprouvées et des résultats durables pour votre santé."
  },
  {
    intro: "Les {subject} peuvent être soulagés grâce aux thérapies naturelles disponibles à {city}. Nos praticiens experts vous proposent des solutions personnalisées.",
    benefits: "Chaque consultation est adaptée à votre situation personnelle pour des résultats optimaux et durables."
  },
  {
    intro: "Vous souhaitez améliorer votre qualité de vie en traitant vos {subject} à {city} ? Découvrez notre sélection de praticiens spécialisés dans ces accompagnements.",
    benefits: "Profitez d'un suivi personnalisé avec des professionnels engagés dans votre bien-être et votre santé naturelle."
  },
  {
    intro: "À {city}, des praticiens qualifiés peuvent vous aider à mieux gérer vos {subject} grâce à des approches complémentaires et naturelles.",
    benefits: "Nos thérapeutes vous accompagnent avec bienveillance et professionnalisme pour retrouver sérénité et vitalité."
  }
];

// Fonction pour sélectionner un template basé sur le hash de la ville
function getSubjectTemplateForCity(city: string): typeof SUBJECT_DESCRIPTION_TEMPLATES[0] {
  const hash = city.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return SUBJECT_DESCRIPTION_TEMPLATES[hash % SUBJECT_DESCRIPTION_TEMPLATES.length];
}

// Liste complète des villes (pour la logique de recherche)
const ALL_CITIES = [
  'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille',
  'Rennes', 'Reims', 'Saint-Étienne', 'Le Havre', 'Toulon', 'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Villeurbanne',
  'Saint-Denis', 'Le Mans', 'Aix-en-Provence', 'Clermont-Ferrand', 'Brest', 'Limoges', 'Tours', 'Amiens', 'Perpignan', 'Metz',
  'Besançon', 'Boulogne-Billancourt', 'Orléans', 'Mulhouse', 'Rouen', 'Caen', 'Nancy', 'Saint-Denis', 'Argenteuil', 'Montreuil',
  'Roubaix', 'Tourcoing', 'Nanterre', 'Avignon', 'Créteil', 'Dunkirk', 'Poitiers', 'Asnières-sur-Seine', 'Versailles', 'Courbevoie',
  'Vitry-sur-Seine', 'Colombes', 'Aulnay-sous-Bois', 'La Rochelle', 'Champigny-sur-Marne', 'Rueil-Malmaison', 'Antibes', 'Saint-Maur-des-Fossés', 'Cannes', 'Mérignac',
  'Drancy', 'Noisy-le-Grand', 'Colmar', 'Issy-les-Moulineaux', 'Évry', 'Villeneuve-d\'Ascq', 'Cergy', 'Pessac', 'Valence', 'Antony',
  'La Seyne-sur-Mer', 'Clichy', 'Troyes', 'Montauban', 'Neuilly-sur-Seine', 'Pantin', 'Niort', 'Sarcelles', 'Le Blanc-Mesnil', 'Fort-de-France',
  'Cannes', 'Saint-Ouen', 'Vénissieux', 'Corbeil-Essonnes', 'Cholet', 'Bourges', 'Laval', 'Massy', 'Meaux', 'Hyères',
  'Épinay-sur-Seine', 'Béziers', 'Chelles', 'Brive-la-Gaillarde', 'Bondy', 'Saint-Herblain', 'Sète', 'Vincennes', 'Montluçon', 'Fontenay-sous-Bois',
  'Fréjus', 'Ivry-sur-Seine', 'Bayonne', 'Sartrouville', 'Évreux', 'Martigues', 'Clamart', 'Gennevilliers', 'Noisy-le-Sec', 'Garges-lès-Gonesse',
  'Aubagne', 'Rosny-sous-Bois', 'Saint-Priest', 'Saint-Chamond', 'Wattrelos', 'Alès', 'Belfort', 'Blois', 'Châlons-en-Champagne', 'Châteauroux',
  'Charleville-Mézières', 'Chartres', 'Chaumont', 'Cherbourg-en-Cotentin', 'Châteaudun', 'Châteaubriant', 'Châteaulin', 'Châteauneuf-sur-Loire', 'Châteaurenard', 'Châtellerault',
  'Châtillon', 'Châtillon-sur-Chalaronne', 'Chaudes-Aigues', 'Chauray', 'Chaville', 'Chevilly-Larue', 'Chilly-Mazarin', 'Chinon', 'Choisy-le-Roi', 'Clermont-l\'Hérault',
  'Cognac', 'Compiègne', 'Concarneau', 'Condom', 'Conflans-Sainte-Honorine', 'Corbeil-Essonnes', 'Cormeilles-en-Parisis', 'Couëron', 'Coulommiers', 'Cournon-d\'Auvergne',
  'Coutances', 'Crépy-en-Valois', 'Crest', 'Croix', 'Cugnaux', 'Dax', 'Decize', 'Denain', 'Dieppe', 'Digne-les-Bains',
  'Dole', 'Douai', 'Douarnenez', 'Draguignan', 'Dreux', 'Dunkerque', 'Épinal', 'Étampes', 'Étretat', 'Eu',
  'Évreux', 'Fécamp', 'Figeac', 'Firminy', 'Flers', 'Foix', 'Fontainebleau', 'Fontaine', 'Forbach', 'Fougères',
  'Fourmies', 'Franconville', 'Fréjus', 'Fresnes', 'Frontignan', 'Gap', 'Gardanne', 'Gien', 'Givors', 'Gonesse',
  'Grasse', 'Grenoble', 'Guebwiller', 'Guéret', 'Guingamp', 'Haguenau', 'Hazebrouck', 'Hénin-Beaumont', 'Hérouville-Saint-Clair', 'Houilles',
  'Huningue', 'Illkirch-Graffenstaden', 'Istres', 'Joué-lès-Tours', 'Jouy-en-Josas', 'La Ciotat', 'La Courneuve', 'La Garenne-Colombes', 'La Possession', 'La Réunion',
  'La Roche-sur-Yon', 'La Teste-de-Buch', 'Lagny-sur-Marne', 'Landerneau', 'Landivisiau', 'Lanester', 'Lannion', 'Laval', 'Le Bouscat', 'Le Cannet',
  'Le Cateau-Cambrésis', 'Le Creusot', 'Le Grand-Quevilly', 'Le Havre', 'Le Kremlin-Bicêtre', 'Le Lamentin', 'Le Mans', 'Le Mée-sur-Seine', 'Le Perreux-sur-Marne', 'Le Plessis-Robinson',
  'Le Puy-en-Velay', 'Le Raincy', 'Le Tampon', 'Les Abymes', 'Les Mureaux', 'Les Pavillons-sous-Bois', 'Les Sables-d\'Olonne', 'Les Ulis', 'Libourne', 'Liévin',
  'Limeil-Brévannes', 'Limoges', 'Lingolsheim', 'Lisieux', 'Livry-Gargan', 'Lons-le-Saunier', 'Lorient', 'Lourdes', 'Lunel', 'Lunéville',
  'Lyon', 'Mâcon', 'Maisons-Alfort', 'Malakoff', 'Mandelieu-la-Napoule', 'Manosque', 'Mantes-la-Jolie', 'Marcq-en-Barœul', 'Marly-le-Roi', 'Marmande',
  'Marseille', 'Martigues', 'Maubeuge', 'Mauguio', 'Mazamet', 'Mende', 'Menton', 'Mérignac', 'Metz', 'Meudon',
  'Millau', 'Miramas', 'Modane', 'Moissy-Cramayel', 'Monaco', 'Mondeville', 'Mons-en-Barœul', 'Montauban', 'Montbéliard', 'Montbrison',
  'Mont-de-Marsan', 'Montélimar', 'Montfermeil', 'Montigny-le-Bretonneux', 'Montluçon', 'Montpellier', 'Montreuil', 'Montrouge', 'Morlaix', 'Morsang-sur-Orge',
  'Moulins', 'Mougins', 'Mulhouse', 'Nancy', 'Nanterre', 'Nantes', 'Narbonne', 'Nemours', 'Neufchâteau', 'Neuilly-Plaisance',
  'Neuilly-sur-Marne', 'Neuilly-sur-Seine', 'Nevers', 'Nice', 'Nîmes', 'Niort', 'Noisiel', 'Noisy-le-Grand', 'Noisy-le-Sec', 'Nogent-sur-Marne',
  'Nogent-sur-Oise', 'Noyon', 'Orange', 'Orléans', 'Orly', 'Orsay', 'Orvault', 'Oullins', 'Outreau', 'Palaiseau',
  'Pantin', 'Papeete', 'Paris', 'Parthenay', 'Pau', 'Périgueux', 'Perpignan', 'Pessac', 'Pierrefitte-sur-Seine', 'Plaisir',
  'Poissy', 'Poitiers', 'Pont-à-Mousson', 'Pontarlier', 'Pont-Audemer', 'Pont-Aven', 'Pont-de-Vaux', 'Pontivy', 'Pontoise', 'Porto-Vecchio',
  'Puteaux', 'Quimper', 'Quimperlé', 'Rambouillet', 'Redon', 'Reims', 'Rennes', 'Rillieux-la-Pape', 'Riom', 'Roanne',
  'Rochefort', 'Rodez', 'Romilly-sur-Seine', 'Ronchin', 'Rosny-sous-Bois', 'Roubaix', 'Rouen', 'Royan', 'Rueil-Malmaison', 'Rumilly',
  'Rungis', 'Sables-d\'Olonne', 'Saclay', 'Sainte-Geneviève-des-Bois', 'Sainte-Maxime', 'Saint-Amand-les-Eaux', 'Saint-Avold', 'Saint-Brieuc', 'Saint-Chamond', 'Saint-Cloud',
  'Saint-Denis', 'Saint-Dié-des-Vosges', 'Saint-Étienne', 'Saint-Germain-en-Laye', 'Saint-Herblain', 'Saint-Laurent-du-Maroni', 'Saint-Laurent-du-Var', 'Saint-Malo', 'Saint-Maur-des-Fossés', 'Saint-Maximin-la-Sainte-Baume',
  'Saint-Nazaire', 'Saint-Omer', 'Saint-Ouen', 'Saint-Ouen-l\'Aumône', 'Saint-Pierre', 'Saint-Priest', 'Saint-Quentin', 'Saint-Raphaël', 'Sallanches', 'Salon-de-Provence',
  'Sannois', 'Sarcelles', 'Sarreguemines', 'Sartrouville', 'Saumur', 'Savigny-le-Temple', 'Savigny-sur-Orge', 'Schiltigheim', 'Sedan', 'Sens',
  'Sète', 'Sevran', 'Sèvres', 'Six-Fours-les-Plages', 'Soissons', 'Sorgues', 'Sotteville-lès-Rouen', 'Stains', 'Strasbourg', 'Sucy-en-Brie',
  'Talence', 'Tarbes', 'Tarnos', 'Thiais', 'Thionville', 'Thonon-les-Bains', 'Torcy', 'Toul', 'Toulon', 'Toulouse',
  'Tourcoing', 'Tournan-en-Brie', 'Tours', 'Trappes', 'Tremblay-en-France', 'Troyes', 'Tulle', 'Ussel', 'Uzès', 'Valence',
  'Valenciennes', 'Vallauris', 'Vannes', 'Vanves', 'Vaulx-en-Velin', 'Vélizy-Villacoublay', 'Vence', 'Vendôme', 'Vénissieux', 'Verdun',
  'Vernon', 'Versailles', 'Vesoul', 'Vichy', 'Vienne', 'Vierzon', 'Vigneux-sur-Seine', 'Villeneuve-d\'Ascq', 'Villeneuve-la-Garenne', 'Villeneuve-Saint-Georges',
  'Villeparisis', 'Villepinte', 'Villiers-le-Bel', 'Villiers-sur-Marne', 'Vincennes', 'Viroflay', 'Viry-Châtillon', 'Vitrolles', 'Vitry-sur-Seine', 'Voiron',
  'Wasquehal', 'Wattrelos', 'Wittenheim', 'Yerres', 'Yvetot', 'Yzeure'
];

// Liste limitée des villes principales pour generateStaticParams (SEO)
// On génère seulement les 20 plus grandes villes pour éviter trop de connexions DB pendant le build
const TARGET_CITIES_FOR_STATIC = [
  'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille',
  'Rennes', 'Reims', 'Saint-Étienne', 'Le Havre', 'Toulon', 'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Villeurbanne'
];

// Permettre les paramètres dynamiques pour les villes non listées
export const dynamicParams = true;

// Générer les paramètres statiques pour les villes cibles (limitées pour éviter trop de connexions DB)
export async function generateStaticParams() {
  const subjects = await prisma.subjects.findMany({
    select: { slug: true }
  });

  const params: Array<{ slug: string; city: string }> = [];
  
  // Limiter à 20 villes principales pour éviter d'épuiser les connexions DB pendant le build
  for (const subject of subjects) {
    for (const city of TARGET_CITIES_FOR_STATIC) {
      params.push({
        slug: subject.slug,
        city: city.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '-')
      });
    }
  }

  return params;
}

// Fonction pour récupérer les données côté serveur
async function getSubjectCityData(slug: string, city: string, page: number = 1, limit: number = 40) {
  const subject = await getSubjectInfo(slug);
  if (!subject) {
    return null;
  }

  // Normaliser le nom de la ville (remplacer les tirets par des espaces)
  const normalizedCity = city.replace(/-/g, ' ');
  
  // Vérifier si la ville existe dans la base, sinon géocoder
  let formattedCity = normalizedCity;
  let cityCoords: { lat: number; lng: number } | null = null;
  let regionName: string | null = null;
  let useRadiusSearch = false;
  let useRegionSearch = false;

  const cityExists = await isValidCity(normalizedCity);
  if (!cityExists) {
    // Géocoder la ville via l'API Adresse Gouv
    const geocoded = await geocodeCity(normalizedCity);
    if (geocoded) {
      formattedCity = geocoded.name;
      cityCoords = { lat: geocoded.lat, lng: geocoded.lng };
      regionName = geocoded.region || null;
      // Note: useRadiusSearch sera défini plus tard si aucun praticien n'est trouvé dans la ville exacte
    } else {
      // Si le géocodage échoue, on essaie quand même avec le nom original
      formattedCity = normalizedCity;
    }
  } else {
    formattedCity = await formatCity(normalizedCity);
    // Même si la ville existe dans la base, on géocode pour avoir les coordonnées pour la carte
    const geocoded = await geocodeCity(formattedCity);
    if (geocoded) {
      cityCoords = { lat: geocoded.lat, lng: geocoded.lng };
      regionName = geocoded.region || null;
    }
  }

  // ÉTAPE 1: Récupérer les professionIds liés au sujet via la table de liaison
  const subjectProfessions = await prisma.subject_professions.findMany({
    where: {
      subject_id: subject.id
    },
    select: {
      profession_id: true
    }
  });

  const professionIds = subjectProfessions.map(sp => sp.profession_id);

  // Si aucun professionId n'est lié au sujet, retourner une liste vide
  // (tous les sujets doivent avoir des professions liées)
  if (professionIds.length === 0) {
    return {
      subject,
      formattedCity,
      practitioners: [],
      selectedTemplate: getSubjectTemplateForCity(formattedCity),
      cityCoords,
      professionIds: []
    };
  }

  // ÉTAPE 2: Construire la requête pour filtrer les praticiens par professionId
  let whereClause: any = {
    profession_id: {
      in: professionIds
    },
    is_active: true
  };

  // Fonction pour calculer la distance en km (formule de Haversine)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Fonction helper pour récupérer les praticiens avec le même include
  const getPractitionersInclude = () => ({
    professions: true,
    services: {
      orderBy: {
        price_cents: 'asc' as const
      },
      take: 3
    },
    _count: {
      select: {
        reviews: true,
        favorites: true
      }
    },
    reviews: {
      where: {
        is_hidden: false
      },
      orderBy: {
        rating: 'desc' as const
      },
      take: 1,
      include: {
        users: {
          select: {
            name: true
          }
        }
      }
    }
  });

  // ÉTAPE 3: Recherche par ville exacte d'abord
  let practitioners = await prisma.practitioners.findMany({
    where: {
      ...whereClause,
      location_city: {
        equals: formattedCity,
        mode: 'insensitive' as const
      }
    },
    include: getPractitionersInclude(),
    orderBy: [
      { is_verified: 'desc' },
      { rating_avg: 'desc' },
      { created_at: 'desc' }
    ]
  });

  let totalCount = practitioners.length;
  let allPractitionersForPagination = practitioners;

  // ÉTAPE 4: Si aucun résultat pour la ville exacte, rechercher dans un rayon de 30km
  if (practitioners.length === 0) {
    // S'assurer qu'on a les coordonnées de la ville
    if (!cityCoords) {
      const geocoded = await geocodeCity(formattedCity);
      if (geocoded) {
        cityCoords = { lat: geocoded.lat, lng: geocoded.lng };
        regionName = geocoded.region || null;
      }
    }

    // Si on a des coordonnées, rechercher dans un rayon de 30km
    if (cityCoords) {
      useRadiusSearch = true;
      const radiusKm = 30;
      const latRange = radiusKm / 111; // Approximation: 1 degré ≈ 111 km
      const lngRange = radiusKm / (111 * Math.cos(cityCoords.lat * Math.PI / 180));

      const allPractitioners = await prisma.practitioners.findMany({
        where: {
          ...whereClause,
          AND: [
            { lat: { gte: cityCoords.lat - latRange, lte: cityCoords.lat + latRange } },
            { lng: { gte: cityCoords.lng - lngRange, lte: cityCoords.lng + lngRange } },
            { lat: { not: null } },
            { lng: { not: null } }
          ]
        },
        include: getPractitionersInclude()
      });

      // Calculer la distance pour chaque praticien et trier par distance
      allPractitionersForPagination = allPractitioners
        .map((p: any) => ({
          ...p,
          distance: p.lat && p.lng ? calculateDistance(cityCoords.lat, cityCoords.lng, p.lat, p.lng) : Infinity
        }))
        .filter((p: any) => p.distance <= radiusKm) // Filtrer strictement à 30km
        .sort((a: any, b: any) => {
          // Trier par distance d'abord, puis par vérification, puis par note
          if (Math.abs(a.distance - b.distance) > 0.1) {
            return a.distance - b.distance;
          }
          if (a.is_verified !== b.is_verified) {
            return b.is_verified ? 1 : -1;
          }
          return (b.rating_avg || 0) - (a.rating_avg || 0);
        });
      
      totalCount = allPractitionersForPagination.length;
    }

    // ÉTAPE 5: Si toujours 0 résultat après 30km, rechercher dans la région
    if (allPractitionersForPagination.length === 0 && regionName && cityCoords) {
      useRegionSearch = true;
      
      // Rechercher dans un rayon plus large (200km pour couvrir la région)
      const regionRadiusKm = 200;
      const regionLatRange = regionRadiusKm / 111;
      const regionLngRange = regionRadiusKm / (111 * Math.cos(cityCoords.lat * Math.PI / 180));
      
      const regionPractitioners = await prisma.practitioners.findMany({
        where: {
          ...whereClause,
          AND: [
            { lat: { gte: cityCoords.lat - regionLatRange, lte: cityCoords.lat + regionLatRange } },
            { lng: { gte: cityCoords.lng - regionLngRange, lte: cityCoords.lng + regionLngRange } },
            { lat: { not: null } },
            { lng: { not: null } }
          ]
        },
        include: getPractitionersInclude()
      });

      // Calculer la distance et trier, prioriser ceux avec consultation vidéo
      allPractitionersForPagination = regionPractitioners
        .map((p: any) => {
          const distance = p.lat && p.lng ? calculateDistance(cityCoords.lat, cityCoords.lng, p.lat, p.lng) : Infinity;
          const hasVideoService = p.services?.some((s: any) => s.location_type === "VIDEO_ONLY" || s.location_type === "HYBRID") || false;
          return {
            ...p,
            distance,
            hasVideoService
          };
        })
        .sort((a: any, b: any) => {
          // Prioriser ceux avec consultation vidéo
          if (a.hasVideoService !== b.hasVideoService) {
            return b.hasVideoService ? -1 : 1;
          }
          // Puis par distance
          if (Math.abs(a.distance - b.distance) > 0.1) {
            return a.distance - b.distance;
          }
          // Puis par vérification
          if (a.is_verified !== b.is_verified) {
            return b.is_verified ? 1 : -1;
          }
          // Puis par note
          return (b.rating_avg || 0) - (a.rating_avg || 0);
        });
      
      totalCount = allPractitionersForPagination.length;
    }
  }

  // Appliquer la pagination sur la liste complète
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  practitioners = allPractitionersForPagination.slice(startIndex, endIndex);

  // Calculer les informations de pagination
  const totalPages = Math.ceil(totalCount / limit);
  const pagination = {
    page,
    limit,
    total: totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1
  };

  return {
    subject,
    formattedCity,
    practitioners,
    selectedTemplate: getSubjectTemplateForCity(formattedCity),
    cityCoords, // Coordonnées pour la carte si ville géocodée
    professionIds, // IDs des professions liées au sujet pour filtrer la carte
    useRadiusSearch, // Flag pour indiquer si c'est une recherche à rayon
    useRegionSearch, // Flag pour indiquer si c'est une recherche à l'échelle régionale
    regionName, // Nom de la région pour l'affichage
    pagination // Informations de pagination
  };
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug, city } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const page = parseInt(resolvedSearchParams?.page || '1', 10);
  const data = await getSubjectCityData(slug, city, page, 40);

  if (!data) {
    return {
      title: "Page non trouvée",
    };
  }

  const { subject, formattedCity, pagination } = data;
  const title = `${subject.emoji} ${subject.name} à ${formattedCity} - Praticiens spécialisés${page > 1 ? ` (Page ${page})` : ''}`;
  const description = subject.metaDescription.replace('[City]', formattedCity);

  // Construire l'URL de base pour les liens rel="next" et rel="prev"
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://holia.me';
  const basePath = `/sujet/${slug}/${city}`;
  
  const links: Array<{ rel: string; url: string }> = [];
  
  if (pagination.hasNextPage) {
    links.push({
      rel: 'next',
      url: `${baseUrl}${basePath}?page=${page + 1}`
    });
  }
  
  if (pagination.hasPreviousPage) {
    links.push({
      rel: 'prev',
      url: `${baseUrl}${basePath}${page === 2 ? '' : `?page=${page - 1}`}`
    });
  }

  return {
    title,
    description,
    keywords: [
      subject.name.toLowerCase(),
      'praticien',
      formattedCity.toLowerCase(),
      'bien-être',
      'naturel',
      'thérapies',
      'santé'
    ].concat(subject.keywords || []),
    openGraph: {
      title,
      description,
      type: 'website',
    },
    alternates: {
      canonical: `${baseUrl}${basePath}${page > 1 ? `?page=${page}` : ''}`,
    },
    other: Object.fromEntries(links.map(link => [`link:${link.rel}`, link.url])),
  };
}

// Fonction principale serveur
export default async function SubjectCityPage({ params, searchParams }: PageProps) {
  const { slug, city } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const page = parseInt(resolvedSearchParams?.page || '1', 10);
  const limit = 40;
  const data = await getSubjectCityData(slug, city, page, limit);

  if (!data) {
    notFound();
  }

  const { subject, formattedCity, practitioners, selectedTemplate, cityCoords, professionIds, useRadiusSearch, useRegionSearch, regionName, pagination } = data;

  return (
    <SubjectCityClient
      subject={subject}
      formattedCity={formattedCity}
      practitioners={practitioners}
      selectedTemplate={selectedTemplate}
      cityCoords={cityCoords}
      professionIds={professionIds}
      useRadiusSearch={useRadiusSearch}
      useRegionSearch={useRegionSearch}
      regionName={regionName}
      pagination={pagination}
    />
  );
}

