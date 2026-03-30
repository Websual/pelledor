import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  position: { lat: number; lng: number } | null;
  cityName: string | null;
  isLoading: boolean;
  error: string | null;
  permission: 'granted' | 'denied' | 'prompt' | null;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  autoDetect?: boolean; // Si true, détecte automatiquement au montage
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 300000, // 5 minutes
    autoDetect = false
  } = options;

  const [state, setState] = useState<GeolocationState>({
    position: null,
    cityName: null,
    isLoading: false,
    error: null,
    permission: null,
  });

  // Vérifier l'état des permissions
  const checkPermission = useCallback(async () => {
    if (!navigator.permissions) {
      setState(prev => ({ ...prev, permission: null }));
      return;
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      setState(prev => ({ ...prev, permission: result.state }));

      // Écouter les changements de permission
      result.addEventListener('change', () => {
        setState(prev => ({ ...prev, permission: result.state }));
      });
    } catch (error) {
      console.warn('Permission API not supported');
      setState(prev => ({ ...prev, permission: null }));
    }
  }, []);

  // Reverse geocoding - Priorité API Adresse Gouv, fallback Mapbox
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string | null> => {
    // Valider que les coordonnées sont en France
    if (lat < 41 || lat > 51 || lng < -5 || lng > 10) {
      console.warn(`Coordinates (${lat}, ${lng}) outside France bounds, ignoring`);
      return null;
    }

    try {
      // Priorité 1: Utiliser l'API Adresse Gouv (reverse geocoding)
      try {
        const adresseResponse = await fetch(
          `https://api-adresse.data.gouv.fr/reverse/?lon=${lng}&lat=${lat}&type=municipality&limit=1`
        );
        if (adresseResponse.ok) {
          const adresseData = await adresseResponse.json();
          if (adresseData.features && adresseData.features.length > 0) {
            const feature = adresseData.features[0];
            const cityName = feature.properties.city || feature.properties.name;
            if (cityName) {
              return cityName;
            }
          }
        }
      } catch (adresseError) {
        console.warn("API Adresse Gouv reverse geocoding failed, falling back to Mapbox:", adresseError);
      }

      // Fallback: Utiliser Mapbox avec restriction country=FR
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) {
        console.warn('Mapbox token not found');
        return null;
      }

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place&limit=1&country=FR&access_token=${token}`,
        { headers: { "Accept-Language": "fr" } }
      );

      if (!response.ok) return null;

      const data = await response.json();
      if (!data.features || data.features.length === 0) return null;

      const place = data.features[0];
      
      // Valider que les coordonnées retournées sont en France
      const [placeLng, placeLat] = place.center;
      if (placeLat < 41 || placeLat > 51) {
        console.warn(`Mapbox returned coordinates (${placeLat}, ${placeLng}) outside France bounds, ignoring`);
        return null;
      }

      const cityName = place.text_fr || place.text;

      return cityName;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }, []);

  // Fonction principale de géolocalisation
  const getCurrentPosition = useCallback(async (): Promise<{ lat: number; lng: number; cityName: string } | null> => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'La géolocalisation n\'est pas supportée par ce navigateur'
      }));
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            // Reverse geocoding pour obtenir le nom de la ville
            const cityName = await reverseGeocode(latitude, longitude);

            const result = {
              lat: latitude,
              lng: longitude,
              cityName: cityName || 'Ville inconnue'
            };

            setState(prev => ({
              ...prev,
              position: { lat: latitude, lng: longitude },
              cityName: result.cityName,
              isLoading: false,
              permission: 'granted'
            }));

            resolve(result);
          } catch (error) {
            setState(prev => ({
              ...prev,
              position: { lat: latitude, lng: longitude },
              cityName: null,
              isLoading: false,
              permission: 'granted'
            }));
            resolve({ lat: latitude, lng: longitude, cityName: 'Ville inconnue' });
          }
        },
        (error) => {
          let errorMessage = 'Erreur de géolocalisation';

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permission de géolocalisation refusée';
              setState(prev => ({ ...prev, permission: 'denied' }));
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Position indisponible';
              break;
            case error.TIMEOUT:
              errorMessage = 'Timeout de géolocalisation';
              break;
          }

          setState(prev => ({
            ...prev,
            isLoading: false,
            error: errorMessage
          }));

          resolve(null);
        },
        {
          enableHighAccuracy,
          timeout,
          maximumAge,
        }
      );
    });
  }, [enableHighAccuracy, timeout, maximumAge, reverseGeocode]);

  // Fonction pour demander la permission explicitement
  const requestPermission = useCallback(async () => {
    try {
      const result = await getCurrentPosition();
      return result;
    } catch (error) {
      return null;
    }
  }, [getCurrentPosition]);

  // Effet pour la détection automatique - uniquement côté client
  useEffect(() => {
    // Ne pas exécuter côté serveur
    if (typeof window === 'undefined') return;
    
    if (autoDetect) {
      checkPermission().then(() => {
        // Si la permission est déjà accordée, détecter automatiquement
        if (state.permission === 'granted') {
          getCurrentPosition();
        }
      });
    } else {
      checkPermission();
    }
  }, [autoDetect, checkPermission, getCurrentPosition, state.permission]);

  return {
    ...state,
    getCurrentPosition,
    requestPermission,
    checkPermission,
  };
}