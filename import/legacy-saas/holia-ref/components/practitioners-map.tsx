"use client";

import { useEffect, useRef, useState, useCallback, memo } from "react";
import useSWR from "swr";
import mapboxgl from "mapbox-gl";
import { ScanSearch } from "lucide-react";

const SAGE = "#9bb49b";

// Icônes Lucide en SVG inline pour les popups Mapbox (pas de React dans setHTML)
const ICONS = {
  star: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="0"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
  mapPin: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  globe: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  phone: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  instagram: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>`,
  linkedin: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>`,
  facebook: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>`,
  google: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>`,
  close: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  user: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
};

function escapeHtml(s: string): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface PractitionersMapProps {
  selectedPractitionerId?: string;
  onPractitionerSelect?: (id: string) => void;
  onSearchInBounds?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  userLocation?: { lat: number; lng: number } | null;
  onMapReady?: (flyToFn: (coords: { lat: number; lng: number }) => void) => void;
  cityZoom?: number; // Zoom personnalisé pour les villes (défaut: 11)
  searchCity?: string; // Ville recherchée pour détecter si on est sorti de la zone
  professionIds?: string[]; // IDs des professions à filtrer (pour les pages sujet/city)
  activeIds?: string[]; // IDs des praticiens actuellement affichés dans la liste (pour mise en évidence visuelle)
}


function PractitionersMapComponent({
  selectedPractitionerId,
  onPractitionerSelect,
  onSearchInBounds,
  userLocation,
  onMapReady,
  cityZoom = 11,
  searchCity,
  professionIds,
  activeIds = [],
}: PractitionersMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSearchButton, setShowSearchButton] = useState(false);
  const [mapBounds, setMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const [initialCityBounds, setInitialCityBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  // Bounds utilisés pour l’API map-points (zone visible) : moins de points = chargement plus rapide
  const [boundsForFetch, setBoundsForFetch] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const coordinatesToPractitionersRef = useRef<Map<string, any[]>>(new Map());
  const moveEndDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sans ville = charger TOUT (68k points). Avec ville = on peut limiter à la zone visible (bounds).
  const mapPointsKey = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (searchCity && boundsForFetch == null) return null; // attendre le centrage pour n’avoir qu’une requête
    const url = new URL("/api/practitioners/map-points", window.location.origin);
    if (searchCity) {
      url.searchParams.set("city", searchCity);
      if (boundsForFetch) {
        url.searchParams.set("bounds", `${boundsForFetch.north},${boundsForFetch.south},${boundsForFetch.east},${boundsForFetch.west}`);
      }
    }
    if (professionIds?.length) professionIds.forEach((id) => url.searchParams.append("professionIds", id));
    return url.toString();
  }, [searchCity, professionIds, boundsForFetch]);

  const { data: mapPointsData, error, isLoading } = useSWR(
    mapPointsKey(),
    (url: string) => fetch(url).then((res) => res.json()),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000,
    }
  );

  // Charger le CSS de mapbox dynamiquement
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.16.0/mapbox-gl.css';
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Exposer la fonction flyTo via onMapReady - appelé une seule fois quand la carte est prête
  useEffect(() => {
    if (map.current && isLoaded && onMapReady) {
      const flyToFn = (coords: { lat: number; lng: number }) => {
        if (map.current) {
          map.current.flyTo({
            center: [coords.lng, coords.lat],
            zoom: cityZoom,
            duration: 1000,
          });
          
          setTimeout(() => {
            if (map.current) {
              const bounds = map.current.getBounds();
              if (bounds) {
                const newBounds = {
                  north: bounds.getNorth(),
                  south: bounds.getSouth(),
                  east: bounds.getEast(),
                  west: bounds.getWest(),
                };
                setInitialCityBounds(newBounds);
                setMapBounds(newBounds);
                setBoundsForFetch(newBounds);
                setShowSearchButton(false);
              }
            }
          }, 1100);
        }
      };
      onMapReady(flyToFn);
    }
    // Ne pas re-exposer si onMapReady change (il devrait être stable)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, cityZoom]);

  // Centrer la carte sur la position utilisateur quand elle est détectée
  useEffect(() => {
    if (userLocation && map.current && isLoaded) {
      map.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 12,
        duration: 1000,
      });
    }
  }, [userLocation, isLoaded]);

  // Initialiser la carte
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!mapboxToken) {
      console.error("NEXT_PUBLIC_MAPBOX_TOKEN is not set in environment variables");
      return;
    }

    // Vérifier immédiatement les paramètres URL pour déterminer le centre initial
    let initialCenter: [number, number] = [2.3522, 48.8566]; // Paris par défaut
    let initialZoom = 6; // Zoom large pour voir toute la France
    let shouldGeocodeOnLoad = false;
    let cityFromUrl: string | null = null;
    let boundsFromUrl: { north: number; south: number; east: number; west: number } | null = null;

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const cityParam = urlParams.get('city');
      const boundsParam = urlParams.get('bounds');

      if (boundsParam) {
        // Si on a des bounds, calculer le centre depuis les bounds
        const [north, south, east, west] = boundsParam.split(',').map(parseFloat);
        if (north && south && east && west && !isNaN(north) && !isNaN(south) && !isNaN(east) && !isNaN(west)) {
          initialCenter = [(east + west) / 2, (north + south) / 2];
          initialZoom = cityZoom; // Utiliser le zoom personnalisé pour les villes
          boundsFromUrl = { north, south, east, west };
        }
      } else if (cityParam) {
        // Si on a une ville dans l'URL, on va géocoder après le chargement
        cityFromUrl = cityParam;
        shouldGeocodeOnLoad = true;
        // Garder Paris comme centre initial, mais on va centrer immédiatement après géocodage
      }
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      accessToken: mapboxToken,
      center: initialCenter,
      zoom: initialZoom,
      attributionControl: false,
    });

    map.current.on("load", () => {
      if (!map.current) return;

      console.log('🗺️ Map loaded, initializing performance mode...');

      // Géocoder immédiatement si une ville est présente dans l'URL OU utiliser les bounds si présents
      if (boundsFromUrl && map.current) {
        // Si on a des bounds dans l'URL, centrer directement sans animation
        const center: [number, number] = [
          (boundsFromUrl.east + boundsFromUrl.west) / 2,
          (boundsFromUrl.north + boundsFromUrl.south) / 2
        ];
        map.current.jumpTo({
          center,
          zoom: cityZoom,
        });
        
        setInitialCityBounds(boundsFromUrl);
        setMapBounds(boundsFromUrl);
        setBoundsForFetch(boundsFromUrl);
        setShowSearchButton(false);
      } else if (shouldGeocodeOnLoad && cityFromUrl && typeof window !== 'undefined') {
        // Géocoder la ville depuis l'URL immédiatement
        const geocodeCity = async (cityName: string) => {
          try {
            // Priorité 1: Utiliser l'API Adresse Gouv (limitée à la France)
            let lat: number | null = null;
            let lng: number | null = null;

            try {
              const adresseResponse = await fetch(
                `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(cityName)}&type=municipality&limit=1`
              );
              if (adresseResponse.ok) {
                const adresseData = await adresseResponse.json();
                if (adresseData.features && adresseData.features.length > 0) {
                  const feature = adresseData.features[0];
                  [lng, lat] = feature.geometry.coordinates;
                  
                  // Valider que les coordonnées sont en France
                  if (lat >= 41 && lat <= 51 && lng >= -5 && lng <= 10) {
                    // Utiliser jumpTo au lieu de flyTo pour éviter l'animation depuis Paris
                    map.current!.jumpTo({
                      center: [lng, lat],
                      zoom: cityZoom,
                    });
                    
                    // Enregistrer les bounds initiaux immédiatement
                    setTimeout(() => {
                      if (map.current) {
                        const bounds = map.current.getBounds();
                        if (bounds) {
                          const newBounds = {
                            north: bounds.getNorth(),
                            south: bounds.getSouth(),
                            east: bounds.getEast(),
                            west: bounds.getWest(),
                          };
                          setInitialCityBounds(newBounds);
                          setMapBounds(newBounds);
                          setBoundsForFetch(newBounds);
                          setShowSearchButton(false);
                        }
                      }
                    }, 100);
                    return;
                  }
                }
              }
            } catch (adresseError) {
              console.warn("API Adresse Gouv failed, falling back to Mapbox:", adresseError);
            }

            // Fallback: Mapbox sans filtre pays, privilégie le français (BE, CH, LU, etc.)
            const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
            if (!token) return;

            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cityName)}.json?types=place,locality&limit=1&language=fr&access_token=${token}`,
              { headers: { "Accept-Language": "fr" } }
            );

            if (!response.ok) return;

            const data = await response.json();
            if (data.features && data.features.length > 0) {
              const feature = data.features[0];
              const [lngMapbox, latMapbox] = feature.center;

              // Zone francophone : France, Belgique, Suisse, Luxembourg, Monaco
              const inFrancophoneZone = latMapbox >= 43 && latMapbox <= 52 && lngMapbox >= -5 && lngMapbox <= 11;
              if (!inFrancophoneZone) {
                console.warn(`Coordinates (${latMapbox}, ${lngMapbox}) outside francophone zone, ignoring`);
                return;
              }

              // Utiliser jumpTo au lieu de flyTo pour éviter l'animation depuis Paris
              map.current!.jumpTo({
                center: [lngMapbox, latMapbox],
                zoom: cityZoom,
              });

              setTimeout(() => {
                if (map.current) {
                  const bounds = map.current.getBounds();
                  if (bounds) {
                    const newBounds = {
                      north: bounds.getNorth(),
                      south: bounds.getSouth(),
                      east: bounds.getEast(),
                      west: bounds.getWest(),
                    };
                    setInitialCityBounds(newBounds);
                    setMapBounds(newBounds);
                    setBoundsForFetch(newBounds);
                    setShowSearchButton(false);
                  }
                }
              }, 100);
            }
          } catch (error) {
            console.error('Erreur lors du géocodage de la ville:', error);
          }
        };

        geocodeCity(cityFromUrl);
      }

      // Source GeoJSON avec clustering haute performance
      map.current.addSource('practitioners', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50, // Rayon optimal pour le clustering
        clusterProperties: {
          // Propriétés personnalisées pour les clusters
          sum: ['+', ['get', 'point_count']]
        }
      });

      // Layer pour les clusters (cercles verts selon charte Holia)
      map.current.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'practitioners',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            'rgba(155, 180, 155, 0.6)', // #9bb49b avec opacité 0.6 (< 100)
            100,
            '#8aa483', // Vert plus soutenu (100-1000)
            1000,
            '#6b7f5a'  // Vert foncé (> 1000)
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20, // Petit cluster
            10,
            30, // Cluster moyen
            50,
            40  // Gros cluster
          ],
          'circle-stroke-width': 3, // Halo blanc plus visible
          'circle-stroke-color': 'white'
        }
      });

      // Layer pour les chiffres dans les clusters
      map.current.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'practitioners',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12,
          'text-anchor': 'center',
          'text-justify': 'center'
        },
        paint: {
          'text-color': 'white'
        }
      });

      // Layer d'ombre pour les points individuels (effet de profondeur)
      map.current.addLayer({
        id: 'unclustered-point-shadow',
        type: 'circle',
        source: 'practitioners',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': 'rgba(0, 0, 0, 0.2)',
          'circle-radius': 10,
          'circle-blur': 1,
          'circle-pitch-alignment': 'map'
        }
      });

      // Layer pour les points individuels (cercles verts avec effet de profondeur)
      map.current.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'practitioners',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'case',
            ['get', 'hasMultiplePractitioners'], // Si plusieurs praticiens à cette position
            '#f59e0b', // Orange pour alerter
            ['case',
              ['in', ['get', 'practitionerId'], ['literal', activeIds || []]],
              '#6b7f5a', // Couleur plus foncée pour les praticiens actifs
              '#9bb49b'  // Couleur normale pour les autres
            ]
          ],
          'circle-radius': [
            'case',
            ['in', ['get', 'practitionerId'], ['literal', activeIds || []]],
            10, // Plus gros pour les praticiens actifs
            8   // Taille normale pour les autres
          ],
          'circle-stroke-width': [
            'case',
            ['get', 'hasMultiplePractitioners'], // Si plusieurs praticiens
            5, // Stroke plus épais pour alerter
            ['case',
              ['in', ['get', 'practitionerId'], ['literal', activeIds || []]],
              4, // Stroke plus épais pour les praticiens actifs
              3  // Stroke normal pour les autres
            ]
          ],
          'circle-stroke-color': '#ffffff',
          'circle-pitch-alignment': 'map'
        }
      });

      console.log('✅ All layers initialized for maximum performance');

      // Interactions haute performance
      map.current.on('click', (e) => {
        const features = map.current!.queryRenderedFeatures(e.point, {
          layers: ['clusters', 'unclustered-point']
        });

        if (features.length > 0) {
          const feature = features[0];

          if (feature.properties?.cluster) {
            // Clic sur cluster → zoom automatique haute performance
            const clusterId = feature.properties.cluster_id;
            (map.current!.getSource('practitioners') as any).getClusterExpansionZoom(
              clusterId,
              (err: any, zoom: number) => {
                if (err) return;

                map.current!.flyTo({
                  center: (feature.geometry as any).coordinates as [number, number],
                  zoom: zoom + 1,
                  duration: 500, // Animation ultra-rapide
                  essential: true
                });
              }
            );
          } else if (feature.properties?.practitionerId || feature.properties?.id) {
            // Vérifier s'il y a plusieurs praticiens à cette position
            const coordinates = (feature.geometry as any).coordinates as [number, number];
            const coordKey = `${coordinates[0].toFixed(6)},${coordinates[1].toFixed(6)}`;
            const practitionersAtLocation = coordinatesToPractitionersRef.current.get(coordKey) || [];

            if (practitionersAtLocation.length > 1) {
              // Multi-popup : afficher tous les praticiens à cette adresse
              const getInitials = (name: string) => {
                return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().slice(0, 2);
              };

              const practitionersList = practitionersAtLocation.map((f: any) => {
                const rating = f.properties.rating ?? 0;
                const reviewsCount = f.properties.reviewsCount ?? 0;
                const googleRating = f.properties.googleRating ?? null;
                const googleReviewCount = f.properties.googleReviewCount ?? null;
                const hasHolia = reviewsCount > 0;
                const hasGoogle = googleRating != null && Number(googleRating) > 0;
                const reviewsLine = hasHolia
                  ? `<span style="display: inline-flex; color: ${SAGE};">${ICONS.star}</span><span style="font-size: 12px; font-weight: 600;">${Number(rating).toFixed(1).replace('.', ',')}</span><span style="font-size: 11px; color: #6b7280;">(${reviewsCount} avis)</span>`
                  : hasGoogle
                    ? `<span style="display: inline-flex; opacity: 0.85;">${ICONS.google}</span><span style="font-size: 12px; font-weight: 600;">${Number(googleRating).toFixed(1).replace('.', ',')}</span><span style="font-size: 11px; color: #6b7280;">(${googleReviewCount || 0} Google)</span>`
                    : "";
                return {
                  id: f.properties.practitionerId || f.properties.id,
                  title: f.properties.title,
                  slug: f.properties.slug,
                  location_city: f.properties.location_city || "",
                  photo_url: f.properties.photo_url,
                  reviewsLine,
                  initials: getInitials(f.properties.title || '')
                };
              }).filter((p: any) => p.title && p.slug);

              const popupContent = `
                <div class="holia-popup-content" style="max-width: 360px; font-family: system-ui, -apple-system, sans-serif; padding: 0; border-radius: 1.5rem; overflow: hidden;">
                  <div style="padding: 18px 18px 12px;">
                    <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #1f2937; line-height: 1.35;">
                      ${practitionersList.length} praticien${practitionersList.length > 1 ? 's' : ''} à cette adresse
                    </h3>
                  </div>
                  <div style="max-height: 380px; overflow-y: auto; padding: 8px 18px 18px;">
                    ${practitionersList.map((p: any) => `
                      <a href="/praticien/${escapeHtml(p.slug)}" style="display: flex; gap: 12px; padding: 12px; border-radius: 1rem; text-decoration: none; color: inherit; transition: background-color 0.2s;">
                        <div style="flex-shrink: 0; width: 50px; height: 50px; border-radius: 10px; overflow: hidden; background: linear-gradient(135deg, #f0f9f0, #e8f5e8); display: flex; align-items: center; justify-content: center; border: 2px solid ${SAGE};">
                          ${p.photo_url ? `<img src="${escapeHtml(p.photo_url)}" alt="" style="width: 100%; height: 100%; object-fit: cover;" />` : `<span style="color: ${SAGE}; font-size: 16px; font-weight: 600;">${p.initials}</span>`}
                        </div>
                        <div style="flex: 1; min-width: 0;">
                          <h4 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 600; color: #1f2937; line-height: 1.3;">${escapeHtml(p.title)}</h4>
                          ${p.reviewsLine ? `<div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">${p.reviewsLine}</div>` : ""}
                          ${p.location_city ? `<p style="margin: 0; font-size: 11px; color: #6b7280; display: flex; align-items: center; gap: 4px;"><span style="display: inline-flex; color: #6b7280;">${ICONS.mapPin}</span>${escapeHtml(p.location_city)}</p>` : ''}
                        </div>
                      </a>
                    `).join('')}
                  </div>
                </div>
              `;

              // Fermer les popups existantes
              const existingPopups = document.querySelectorAll('.mapboxgl-popup');
              existingPopups.forEach(popup => popup.remove());

              const popup = new mapboxgl.Popup({
                offset: 25,
                closeButton: true,
                className: 'practitioner-popup',
                maxWidth: '360px'
              })
                .setLngLat(coordinates)
                .setHTML(popupContent)
                .addTo(map.current!);

              // Centrage fluide sur le point
              map.current!.easeTo({
                center: coordinates,
                duration: 300
              });
            } else {
              // Clic sur point individuel → popup avec design Holia (icônes Lucide, avis Holia/Google, indicateurs contact)
              const practitionerId = feature.properties.practitionerId || feature.properties.id;
              const practitionerTitle = feature.properties.title;
              const practitionerSlug = feature.properties.slug;
              const practitionerLocation = feature.properties.location_city || "";
              const photoUrl = feature.properties.photo_url;
              const rating = feature.properties.rating ?? 0;
              const reviewsCount = feature.properties.reviewsCount ?? 0;
              const googleRating = feature.properties.googleRating ?? null;
              const googleReviewCount = feature.properties.googleReviewCount ?? null;
              const website = feature.properties.website || null;
              const phone = feature.properties.phone || null;
              const instagramUrl = feature.properties.instagramUrl || null;
              const linkedInUrl = feature.properties.linkedInUrl || null;
              const facebookUrl = feature.properties.facebookUrl || null;

              if (!practitionerTitle || !practitionerSlug) return;

              const getInitials = (name: string) => {
                return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().slice(0, 2);
              };

              const hasHoliaReviews = reviewsCount > 0;
              const hasGoogleRating = googleRating != null && Number(googleRating) > 0;
              const reviewsRow =
                hasHoliaReviews
                  ? `<div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px;"><span style="display: inline-flex; color: ${SAGE};">${ICONS.star}</span><span style="font-size: 14px; font-weight: 600; color: #1f2937;">${Number(rating).toFixed(1).replace('.', ',')}</span><span style="font-size: 13px; color: #6b7280;">(${reviewsCount} avis)</span></div>`
                  : hasGoogleRating
                    ? `<div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px;"><span style="display: inline-flex; opacity: 0.85;">${ICONS.google}</span><span style="font-size: 13px; font-weight: 600; color: #1f2937;">${Number(googleRating).toFixed(1).replace('.', ',')}</span><span style="font-size: 12px; color: #6b7280;">(${googleReviewCount || 0} avis Google)</span></div>`
                    : "";

              const contactIcons: string[] = [];
              if (website) contactIcons.push(`<a href="${escapeHtml(website)}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; color: ${SAGE};" title="Site web">${ICONS.globe}</a>`);
              if (phone) contactIcons.push(`<a href="tel:${escapeHtml(phone)}" style="display: inline-flex; color: ${SAGE};" title="Téléphone">${ICONS.phone}</a>`);
              if (instagramUrl) contactIcons.push(`<a href="${escapeHtml(instagramUrl)}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; color: ${SAGE};" title="Instagram">${ICONS.instagram}</a>`);
              if (linkedInUrl) contactIcons.push(`<a href="${escapeHtml(linkedInUrl)}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; color: ${SAGE};" title="LinkedIn">${ICONS.linkedin}</a>`);
              if (facebookUrl) contactIcons.push(`<a href="${escapeHtml(facebookUrl)}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; color: ${SAGE};" title="Facebook">${ICONS.facebook}</a>`);
              const contactRow = contactIcons.length > 0 ? `<div style="display: flex; align-items: center; gap: 10px; margin-top: 8px;">${contactIcons.join("")}</div>` : "";

              const heroBlock = photoUrl
                ? `<img src="${escapeHtml(photoUrl)}" alt="" style="width: 100%; height: 120px; object-fit: cover; display: block;" />`
                : `<div style="width: 100%; height: 120px; background: #e8f5e8; display: flex; align-items: center; justify-content: center; color: ${SAGE};">${ICONS.user}</div>`;

              const popupContent = `
                <div class="holia-popup-card" style="width: 260px; font-family: system-ui, -apple-system, sans-serif; padding: 0; border-radius: 1.5rem; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 12px 40px rgba(0,0,0,0.12);">
                  <div style="position: relative; width: 100%; flex-shrink: 0;">
                    ${heroBlock}
                    <button type="button" onclick="this.closest('.mapboxgl-popup')?.remove()" style="position: absolute; top: 8px; right: 8px; width: 32px; height: 32px; border: none; border-radius: 50%; background: rgba(0,0,0,0.35); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; transition: background 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.5)'" onmouseout="this.style.background='rgba(0,0,0,0.35)'" aria-label="Fermer">${ICONS.close}</button>
                  </div>
                  <div style="padding: 1rem; flex: 1; text-align: left;">
                    <a href="/praticien/${escapeHtml(practitionerSlug)}" style="text-decoration: none; color: inherit;">
                      <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937; line-height: 1.3;">
                        ${escapeHtml(practitionerTitle)}
                      </h3>
                    </a>
                    ${reviewsRow}
                    ${practitionerLocation ? `<p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.4; display: flex; align-items: center; gap: 6px;"><span style="display: inline-flex; color: #6b7280;">${ICONS.mapPin}</span>${escapeHtml(practitionerLocation)}</p>` : ""}
                    ${contactRow}
                  </div>
                  <div style="padding: 0 1rem 1rem;">
                    <a href="/praticien/${escapeHtml(practitionerSlug)}" class="holia-popup-cta" style="display: block; width: 100%; box-sizing: border-box; background: ${SAGE}; color: white; padding: 12px 16px; border-radius: 1rem; text-decoration: none; font-weight: 600; font-size: 14px; text-align: center; box-shadow: 0 2px 8px rgba(155, 180, 155, 0.3); transition: box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 4px 12px rgba(155, 180, 155, 0.45)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(155, 180, 155, 0.3)'">
                      Voir la fiche
                    </a>
                  </div>
                </div>
              `;

              if (onPractitionerSelect) {
                onPractitionerSelect(practitionerId);
              }

              const existingPopups = document.querySelectorAll('.mapboxgl-popup');
              existingPopups.forEach(popup => popup.remove());

              const popup = new mapboxgl.Popup({
                offset: 25,
                closeButton: false,
                className: 'practitioner-popup',
                maxWidth: '260px'
              })
                .setLngLat((feature.geometry as any).coordinates as [number, number])
                .setHTML(popupContent)
                .addTo(map.current!);

              // Centrage fluide sur le point
              map.current!.easeTo({
                center: (feature.geometry as any).coordinates as [number, number],
                duration: 300
              });
            }
          }
        }
      });

      // Curseur pointer sur les éléments interactifs
      map.current.on('mouseenter', 'clusters', () => {
        map.current!.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'clusters', () => {
        map.current!.getCanvas().style.cursor = '';
      });

      map.current.on('mouseenter', 'unclustered-point', () => {
        map.current!.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'unclustered-point', () => {
        map.current!.getCanvas().style.cursor = '';
      });

      // Détecter les mouvements pour afficher le bouton de synchronisation
      const handleMapMove = () => {
        if (!map.current) return;

        const bounds = map.current.getBounds();
        if (!bounds) return;

        const newBounds = {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest()
        };

        setMapBounds(newBounds);
        if (moveEndDebounceRef.current) clearTimeout(moveEndDebounceRef.current);
        moveEndDebounceRef.current = setTimeout(() => setBoundsForFetch(newBounds), 500);

        // Afficher le bouton seulement si on a une ville recherchée et qu'on est sorti de sa zone
        // ou si on n'a pas de ville recherchée (recherche par bounds)
        if (searchCity && initialCityBounds) {
          // Vérifier si les bounds actuels sont significativement différents des bounds initiaux
          const latDiff = Math.abs(newBounds.north - initialCityBounds.north) + Math.abs(newBounds.south - initialCityBounds.south);
          const lngDiff = Math.abs(newBounds.east - initialCityBounds.east) + Math.abs(newBounds.west - initialCityBounds.west);
          const threshold = 0.01; // Seuil de différence (environ 1km)
          
          if (latDiff > threshold || lngDiff > threshold) {
            setShowSearchButton(true);
          } else {
            setShowSearchButton(false);
          }
        } else if (searchCity && !initialCityBounds) {
          // Si on a une ville mais pas encore de bounds initiaux, ne pas afficher le bouton
          // (on attend que le flyTo soit terminé)
          setShowSearchButton(false);
        } else {
          // Si on n'a pas de ville recherchée, toujours afficher le bouton après un mouvement
          // ou si on a une ville mais qu'on a déjà bougé avant le flyTo
          setShowSearchButton(true);
        }
      };

      // Handler pour moveend avec auto-update si activé
      const handleMoveEnd = () => {
        handleMapMove();
      };

      map.current.on('moveend', handleMoveEnd);
      map.current.on('zoomend', handleMapMove);
      if (searchCity && map.current) {
        const bounds = map.current.getBounds();
        if (bounds) {
          const b = {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest(),
          };
          setInitialCityBounds(b);
          setBoundsForFetch(b);
        }
      }

      setIsLoaded(true);
      console.log('🎯 Map fully initialized in performance mode');
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Map init once on mount; deps would cause excessive reinit
  }, []);

  // Mettre à jour les données de la carte quand elles arrivent
  useEffect(() => {
    if (!map.current || !mapPointsData?.data || !isLoaded) return;

    console.log(`🔄 Updating map with ${mapPointsData.data.features?.length || 0} practitioners`);
    console.log('Nombre de points chargés:', mapPointsData.data.features?.length || 0);

    // Grouper les praticiens par coordonnées (d'abord tous les grouper, puis mettre à jour)
    const coordinatesMap = new Map<string, any[]>();
    
    // Première passe : grouper tous les praticiens par coordonnées
    mapPointsData.data.features.forEach((feature: any) => {
      const coords = feature.geometry.coordinates;
      const coordKey = `${coords[0].toFixed(6)},${coords[1].toFixed(6)}`;
      
      if (!coordinatesMap.has(coordKey)) {
        coordinatesMap.set(coordKey, []);
      }
      coordinatesMap.get(coordKey)!.push(feature);
    });

    // Deuxième passe : ajouter les propriétés de comptage à chaque feature
    const processedFeatures = mapPointsData.data.features.map((feature: any) => {
      const coords = feature.geometry.coordinates;
      const coordKey = `${coords[0].toFixed(6)},${coords[1].toFixed(6)}`;
      const count = coordinatesMap.get(coordKey)!.length;
      
      return {
        ...feature,
        properties: {
          ...feature.properties,
          practitionerCountAtLocation: count,
          hasMultiplePractitioners: count > 1
        }
      };
    });

    // Mettre à jour le ref pour pouvoir accéder aux praticiens par coordonnées
    coordinatesToPractitionersRef.current = coordinatesMap;

    // Créer un nouveau GeoJSON avec les features traitées
    const processedGeoJSON = {
      ...mapPointsData.data,
      features: processedFeatures
    };

    const source = map.current.getSource('practitioners') as any;
    if (source && source.setData) {
      source.setData(processedGeoJSON);
      console.log('✅ Map data updated successfully');
    } else {
      console.error('❌ Source not found or setData not available');
    }
  }, [mapPointsData, isLoaded]);

  // Mettre à jour les propriétés visuelles du layer unclustered-point quand activeIds change
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    const layer = map.current.getLayer('unclustered-point');
    if (!layer) return;

    // Mettre à jour les propriétés de peinture avec les nouveaux activeIds
    map.current.setPaintProperty('unclustered-point', 'circle-color', [
      'case',
      ['get', 'hasMultiplePractitioners'], // Si plusieurs praticiens à cette position
      '#f59e0b', // Orange pour alerter
      ['case',
        ['in', ['get', 'practitionerId'], ['literal', activeIds || []]],
        '#6b7f5a', // Couleur plus foncée pour les praticiens actifs
        '#9bb49b'  // Couleur normale pour les autres
      ]
    ]);

    map.current.setPaintProperty('unclustered-point', 'circle-radius', [
      'case',
      ['in', ['get', 'practitionerId'], ['literal', activeIds || []]],
      10, // Plus gros pour les praticiens actifs
      8   // Taille normale pour les autres
    ]);

    map.current.setPaintProperty('unclustered-point', 'circle-stroke-width', [
      'case',
      ['get', 'hasMultiplePractitioners'], // Si plusieurs praticiens
      5, // Stroke plus épais pour alerter
      ['case',
        ['in', ['get', 'practitionerId'], ['literal', activeIds || []]],
        4, // Stroke plus épais pour les praticiens actifs
        3  // Stroke normal pour les autres
      ]
    ]);

    map.current.setPaintProperty('unclustered-point', 'circle-stroke-color', '#ffffff');
  }, [activeIds, isLoaded]);

  // Gestionnaire pour synchroniser la liste (seulement via URL)
  const handleSearchInBounds = useCallback(() => {
    if (typeof window === 'undefined' || !mapBounds || !onSearchInBounds) return;
    
    // Mettre à jour l'URL sans rechargement avec window.history.pushState
    const params = new URLSearchParams(window.location.search);
    params.set('bounds', `${mapBounds.north},${mapBounds.south},${mapBounds.east},${mapBounds.west}`);
    params.set('sortBy', 'distance');
    params.delete('city'); // Supprimer le paramètre city

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newUrl);

    // Notifier le parent pour mettre à jour la liste
    onSearchInBounds(mapBounds);
    setShowSearchButton(false);
  }, [mapBounds, onSearchInBounds]);


  if (error) {
    return (
      <div className="w-full h-96 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-2">⚠️</div>
          <p className="text-red-700 font-medium">Erreur de chargement de la carte</p>
          <p className="text-red-600 text-sm mt-1">Impossible de récupérer les données des praticiens</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full overflow-hidden" />

      {/* Indicateur de chargement */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center rounded-2xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9bb49b] mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Chargement des praticiens...</p>
          </div>
        </div>
      )}

      {/* Bouton de synchronisation liste/carte */}
      {showSearchButton && mapBounds && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
          <button
            onClick={handleSearchInBounds}
            className="bg-white text-[#9bb49b] border border-[#9bb49b] px-4 py-2 rounded-full shadow-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium hover:bg-[#9bb49b]/5 hover:shadow-xl"
          >
            <ScanSearch className="h-4 w-4" strokeWidth={1.5} />
            <span>Rechercher dans cette zone</span>
          </button>
        </div>
      )}

      {/* Contrôles de navigation */}
      <style jsx global>{`
        .mapboxgl-popup-content {
          border-radius: 1.5rem;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
          border: none;
          padding: 0;
        }
        .mapboxgl-popup-content-wrapper {
          padding: 0;
          border-radius: 1.5rem;
          overflow: hidden;
        }
        .mapboxgl-popup-close-button {
          font-size: 18px;
          color: #6b7280;
          right: 14px;
          top: 14px;
          padding: 4px;
        }
        .practitioner-popup .mapboxgl-popup-content {
          border-radius: 1.5rem;
          padding: 0;
        }
        .holia-popup-card a[href^="/praticien/"]:hover {
          opacity: 0.95;
        }
        .holia-popup-cta:hover {
          opacity: 0.95;
        }
        .mapboxgl-ctrl-top-right {
          top: 12px;
          right: 12px;
        }
        .mapboxgl-ctrl-group {
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}

// Envelopper dans React.memo pour éviter les re-renders inutiles
export const PractitionersMap = memo(PractitionersMapComponent);