"use client";

import { useEffect, useRef, useState, useCallback, memo } from "react";
import useSWR from "swr";
import mapboxgl from "mapbox-gl";
import { ScanSearch } from "lucide-react";

interface SubjectMapProps {
  selectedPractitionerId?: string;
  onPractitionerSelect?: (id: string) => void;
  onSearchInBounds?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  userLocation?: { lat: number; lng: number } | null;
  onMapReady?: (flyToFn: (coords: { lat: number; lng: number }) => void) => void;
  cityZoom?: number; // Zoom personnalisé pour les villes (défaut: 12 pour les pages thématiques)
  searchCity?: string; // Ville recherchée pour détecter si on est sorti de la zone
  subjectId?: string; // ID du sujet pour filtrer les praticiens
  professionIds?: string[]; // IDs des professions à filtrer (alternative à subjectId)
  initialCenter?: { lat: number; lng: number } | null; // Coordonnées initiales pour centrer la carte sur la ville
  useRadiusSearch?: boolean; // Si true, utilise un rayon de recherche au lieu de la ville exacte
}

function SubjectMapComponent({
  selectedPractitionerId,
  onPractitionerSelect,
  onSearchInBounds,
  userLocation,
  onMapReady,
  cityZoom = 12, // Zoom par défaut plus élevé pour les pages thématiques
  searchCity,
  subjectId,
  professionIds,
  initialCenter,
  useRadiusSearch = false,
}: SubjectMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSearchButton, setShowSearchButton] = useState(false);
  const [mapBounds, setMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const [initialCityBounds, setInitialCityBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);

  // Construire l'URL de l'API avec les paramètres de filtrage
  const mapPointsUrl = useCallback(() => {
    // Vérifier que window est disponible (côté client uniquement)
    if (typeof window === 'undefined') {
      return '/api/practitioners/map-points';
    }
    
    const url = new URL('/api/practitioners/map-points', window.location.origin);
    
    // Si on utilise un rayon de recherche, passer les coordonnées et le rayon au lieu de la ville
    if (useRadiusSearch && initialCenter) {
      url.searchParams.set('latitude', initialCenter.lat.toString());
      url.searchParams.set('longitude', initialCenter.lng.toString());
      url.searchParams.set('radius', '30'); // 30km comme dans page.tsx
    } else if (searchCity) {
      // Sinon, utiliser la ville exacte
      url.searchParams.set('city', searchCity);
    }
    
    // Priorité: subjectId > professionIds
    if (subjectId) {
      url.searchParams.set('subjectId', subjectId);
    } else if (professionIds && professionIds.length > 0) {
      // Passer les professionIds comme paramètres multiples
      professionIds.forEach(id => {
        url.searchParams.append('professionIds', id);
      });
    }
    
    return url.toString();
  }, [searchCity, subjectId, professionIds, useRadiusSearch, initialCenter]);

  // Fetch des données de la carte avec SWR (cache automatique)
  const { data: mapPointsData, error, isLoading } = useSWR(
    mapPointsUrl(),
    (url) => fetch(url).then(res => res.json()),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5 minutes
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
          // Zoom intelligent : 11-12 pour les villes spécifiques
          const zoomLevel = cityZoom || 12;
          map.current.flyTo({
            center: [coords.lng, coords.lat],
            zoom: zoomLevel,
            duration: 1000,
          });
          
          // Enregistrer les bounds initiaux après le flyTo
          setTimeout(() => {
            if (map.current) {
              const bounds = map.current.getBounds();
              if (bounds) {
                const newBounds = {
                  north: bounds.getNorth(),
                  south: bounds.getSouth(),
                  east: bounds.getEast(),
                  west: bounds.getWest()
                };
                setInitialCityBounds(newBounds);
                setMapBounds(newBounds);
                setShowSearchButton(false); // Cacher le bouton après un flyTo vers une ville
              }
            }
          }, 1100); // Après la fin de l'animation
        }
      };
      onMapReady(flyToFn);
    }
    // Ne pas re-exposer si onMapReady change (il devrait être stable)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, cityZoom]);

  // Centrer la carte sur initialCenter si elle est disponible après le chargement
  // Ce useEffect s'exécute même si initialCenter était null au montage
  useEffect(() => {
    if (initialCenter && map.current && isLoaded) {
      const currentCenter = map.current.getCenter();
      const currentZoom = map.current.getZoom();
      const distance = Math.sqrt(
        Math.pow(currentCenter.lng - initialCenter.lng, 2) + 
        Math.pow(currentCenter.lat - initialCenter.lat, 2)
      );
      
      // Ne faire le flyTo que si on n'est pas déjà au bon endroit (évite les animations inutiles)
      if (distance > 0.01 || Math.abs(currentZoom - (cityZoom || 12)) > 1) {
        map.current.flyTo({
          center: [initialCenter.lng, initialCenter.lat],
          zoom: cityZoom || 12,
          duration: 1000,
        });
      }
    }
  }, [initialCenter, isLoaded, cityZoom, searchCity]);

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

    // Utiliser les coordonnées initiales si disponibles, sinon Paris par défaut
    // Si initialCenter est null mais qu'on a searchCity, on attendra le flyTo dans le useEffect suivant
    const initialCenterCoords: [number, number] = initialCenter 
      ? [initialCenter.lng, initialCenter.lat] as [number, number]
      : [2.3522, 48.8566] as [number, number]; // Paris par défaut
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      accessToken: mapboxToken,
      center: initialCenterCoords,
      zoom: initialCenter ? (cityZoom || 12) : (searchCity ? (cityZoom || 12) : 6), // Zoom intelligent : 12 si ville, 6 sinon
      attributionControl: false,
    });

    map.current.on("load", () => {
      if (!map.current) return;

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
          'circle-color': '#9bb49b',
          'circle-radius': 8,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
          'circle-pitch-alignment': 'map'
        }
      });

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
            // Clic sur point individuel → popup instantanée avec données du GeoJSON
            const practitionerId = feature.properties.practitionerId || feature.properties.id;
            const practitionerTitle = feature.properties.title;
            const practitionerSlug = feature.properties.slug;
            const practitionerLocation = feature.properties.location_city || "";
            const photoUrl = feature.properties.photo_url;
            const rating = feature.properties.rating || 0;
            const reviewsCount = feature.properties.reviewsCount || 0;

            // Vérifier que les données sont disponibles
            if (!practitionerTitle || !practitionerSlug) return;

            // Générer les initiales pour le placeholder
            const getInitials = (name: string) => {
              return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().slice(0, 2);
            };

            // Formatage de la note
            const formattedRating = rating.toFixed(1).replace('.', ',');

            // Popup avec photo, nom, avis et lien
            const popupContent = `
              <div style="max-width: 320px; font-family: system-ui, -apple-system, sans-serif; padding: 0;">
                <div style="display: flex; gap: 12px; align-items: flex-start; padding: 16px;">
                  <div style="flex-shrink: 0; width: 70px; height: 70px; border-radius: 12px; overflow: hidden; background: linear-gradient(135deg, #f0f9f0, #e8f5e8); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 2px solid #9bb49b;">
                    ${photoUrl 
                      ? `<img src="${photoUrl}" alt="${practitionerTitle}" style="width: 100%; height: 100%; object-fit: cover;" />`
                      : `<span style="color: #9bb49b; font-size: 20px; font-weight: 600;">${getInitials(practitionerTitle)}</span>`
                    }
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <a href="/praticien/${practitionerSlug}" style="text-decoration: none; color: inherit;">
                      <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937; line-height: 1.3; cursor: pointer; transition: color 0.2s;">
                        ${practitionerTitle}
                      </h3>
                    </a>
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                      <span style="color: #fbbf24; font-size: 14px;">★</span>
                      <span style="font-size: 14px; font-weight: 600; color: #1f2937;">${formattedRating}</span>
                      <span style="font-size: 13px; color: #6b7280;">(${reviewsCount} avis)</span>
                    </div>
                    ${practitionerLocation ? `<p style="margin: 0; font-size: 13px; color: #6b7280;">📍 ${practitionerLocation}</p>` : ''}
                  </div>
                </div>
                <div style="padding: 12px 16px 16px; border-top: 1px solid #e5e7eb; text-align: center;">
                  <a href="/praticien/${practitionerSlug}" style="display: inline-block; background: linear-gradient(135deg, #9bb49b, #8aa483); color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px; transition: all 0.2s; box-shadow: 0 2px 4px rgba(155, 180, 155, 0.2);">
                    Voir la fiche du praticien
                  </a>
                </div>
              </div>
            `;

            if (onPractitionerSelect) {
              onPractitionerSelect(practitionerId);
            }

            // Fermer les popups existantes
            const existingPopups = document.querySelectorAll('.mapboxgl-popup');
            existingPopups.forEach(popup => popup.remove());

            const popup = new mapboxgl.Popup({
              offset: 25,
              closeButton: true,
              className: 'practitioner-popup',
              maxWidth: '320px'
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
        
        // Afficher le bouton seulement si on a une ville recherchée et qu'on est sorti de sa zone
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
          setShowSearchButton(false);
        } else {
          setShowSearchButton(true);
        }
      };

      map.current.on('moveend', handleMapMove);
      map.current.on('zoomend', handleMapMove);

      // Initialiser les bounds si on a une ville recherchée et que la carte est déjà centrée
      if (searchCity && map.current) {
        const bounds = map.current.getBounds();
        if (bounds) {
          setInitialCityBounds({
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest()
          });
        }
      }

      setIsLoaded(true);
      
      // Vérifier si on a déjà des données à charger
      // (au cas où les données arrivent avant que la carte soit chargée)
      if (mapPointsData?.success && mapPointsData?.data) {
        const source = map.current.getSource('practitioners') as mapboxgl.GeoJSONSource;
        if (source && source.setData) {
          try {
            source.setData(mapPointsData.data);
          } catch (err) {
            console.error('Error loading map data on initialization:', err);
          }
        }
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [searchCity, subjectId, professionIds, cityZoom]); // Ne pas inclure initialCenter ici pour éviter de recréer la carte

  // Mettre à jour les données de la carte quand elles arrivent
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    if (!mapPointsData?.success || !mapPointsData?.data) return;

    const geoJsonData = mapPointsData.data;
    const source = map.current.getSource('practitioners') as mapboxgl.GeoJSONSource;
    
    if (source && source.setData) {
      try {
        // Vérifier que les données sont bien formatées
        if (!geoJsonData.type || geoJsonData.type !== 'FeatureCollection' || !Array.isArray(geoJsonData.features)) {
          return;
        }

        source.setData(geoJsonData);
      } catch (err) {
        console.error('Error setting map data:', err);
      }
    }
  }, [mapPointsData, isLoaded]);

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
            <p className="text-gray-600 text-sm">Chargement des praticiens spécialisés...</p>
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
            <span>Chercher les praticiens dans la zone</span>
          </button>
        </div>
      )}

      {/* Contrôles de navigation */}
      <style jsx global>{`
        .mapboxgl-popup-content {
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          border: none;
          padding: 0;
        }
        .mapboxgl-popup-content-wrapper {
          padding: 0;
          border-radius: 12px;
          overflow: hidden;
        }
        .mapboxgl-popup-close-button {
          font-size: 18px;
          color: #666;
          right: 12px;
          top: 12px;
          padding: 4px;
        }
        .practitioner-popup .mapboxgl-popup-content {
          border-radius: 16px;
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
// Comparaison personnalisée pour s'assurer que initialCenter et useRadiusSearch déclenchent un re-render
export const SubjectMap = memo(SubjectMapComponent, (prevProps, nextProps) => {
  // Toujours re-render si initialCenter ou useRadiusSearch changent
  if (prevProps.initialCenter !== nextProps.initialCenter ||
      prevProps.useRadiusSearch !== nextProps.useRadiusSearch ||
      prevProps.subjectId !== nextProps.subjectId ||
      prevProps.searchCity !== nextProps.searchCity ||
      prevProps.selectedPractitionerId !== nextProps.selectedPractitionerId) {
    return false; // false = re-render
  }
  
  return true; // true = pas de re-render
});
