"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
// CSS chargé dynamiquement pour éviter les conflits de build

interface PractitionerSingleMapProps {
  lat: number;
  lng: number;
  address?: string;
  title: string;
}

export function PractitionerSingleMap({ lat, lng, address, title }: PractitionerSingleMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

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

  // Initialiser la carte
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!mapboxToken) {
      console.error("NEXT_PUBLIC_MAPBOX_TOKEN is not set in environment variables");
      if (mapContainer.current) {
        mapContainer.current.innerHTML = `
          <div style="display: flex; align-items: center; justify-center; height: 100%; padding: 20px; text-align: center;">
            <div>
              <p style="color: #666; margin-bottom: 10px;">Clé API Mapbox manquante</p>
              <p style="color: #999; font-size: 14px;">Ajoutez NEXT_PUBLIC_MAPBOX_TOKEN dans votre fichier .env</p>
            </div>
          </div>
        `;
      }
      return;
    }

    mapboxgl.accessToken = mapboxToken;

    // Vérifier si les coordonnées sont inversées (lng en dehors de la France, mais lat OK)
    let correctedLng = lng;
    let correctedLat = lat;
    if ((lng < -5 || lng > 10) && lat >= 41 && lat <= 51) {
      correctedLng = lat;
      correctedLat = lng;
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [correctedLng, correctedLat], // Mapbox utilise [longitude, latitude]
      zoom: 15,
    });

    map.current.on("load", () => {
      if (!map.current) return;
      
      // Masquer les POI comme dans PractitionersMap
      const layers = map.current.getStyle().layers;
      layers.forEach((layer) => {
        if (!map.current) return;
        const layerId = layer.id.toLowerCase();
        const poiKeywords = [
          'poi', 'poi-label', 'business', 'restaurant', 'shop', 'store', 'cafe',
          'hotel', 'bank', 'pharmacy', 'gas', 'fuel', 'parking', 'airport',
          'station', 'attraction', 'tourism', 'amenity',
        ];
        const isPOI = poiKeywords.some(keyword => layerId.includes(keyword));
        const keepKeywords = [
          'road', 'street', 'highway', 'place', 'locality', 'neighborhood',
          'city', 'town', 'village', 'admin', 'water', 'building',
        ];
        const shouldKeep = keepKeywords.some(keyword => layerId.includes(keyword));
        if (isPOI && !shouldKeep) {
          try {
            map.current.setLayoutProperty(layer.id, 'visibility', 'none');
          } catch (e) {
            console.debug(`Could not hide layer: ${layer.id}`);
          }
        }
      });
      
      // Créer le marqueur personnalisé
      const el = document.createElement("div");
      el.className = "custom-marker";
      el.style.width = "40px";
      el.style.height = "40px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = "white";
      el.style.border = "3px solid #9BB499";
      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.cursor = "pointer";
      
      const icon = document.createElement("div");
      icon.style.display = "flex";
      icon.style.alignItems = "center";
      icon.style.justifyContent = "center";
      icon.style.width = "100%";
      icon.style.height = "100%";
      
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", "20");
      svg.setAttribute("height", "20");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", "#9BB499");
      svg.style.display = "block";
      
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z");
      path.setAttribute("fill", "#9BB499");
      svg.appendChild(path);
      icon.appendChild(svg);
      el.appendChild(icon);
      
      // Créer la popup
      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
        .setHTML(`
          <div style="padding: 12px; min-width: 220px;">
            <h3 style="font-weight: 600; color: #2C2C2C; font-size: 14px; line-height: 1.2; margin: 0 0 6px 0;">
              ${title}
            </h3>
            ${address ? `
              <div style="font-size: 12px; color: #666; margin-bottom: 6px;">
                ${address}
              </div>
            ` : ""}
          </div>
        `);
      
      // Créer le marqueur
      markerRef.current = new mapboxgl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([correctedLng, correctedLat])
        .setPopup(popup)
        .addTo(map.current);
      
      setIsLoaded(true);
    });

    // Ajouter les contrôles de navigation
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.current.addControl(new mapboxgl.FullscreenControl(), "top-right");

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [lat, lng, address, title]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="w-full h-full" />
      <style jsx global>{`
        .mapboxgl-popup-content {
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .mapboxgl-popup-content-wrapper {
          padding: 0;
        }
        .mapboxgl-ctrl-top-right {
          top: 10px;
          right: 10px;
        }
        .mapboxgl-ctrl-group {
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        .custom-marker {
          position: relative;
          pointer-events: auto;
        }
        .custom-marker:hover {
          transform: scale(1.1);
          z-index: 1000;
        }
        .custom-marker svg {
          display: block;
          width: 20px;
          height: 20px;
        }
      `}</style>
    </div>
  );
}

