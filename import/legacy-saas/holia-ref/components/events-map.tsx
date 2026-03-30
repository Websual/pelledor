"use client";

import { useEffect, useRef, useState, useCallback, memo } from "react";
import useSWR from "swr";
import mapboxgl from "mapbox-gl";
import { ScanSearch } from "lucide-react";

interface EventsMapProps {
  selectedEventId?: string;
  onEventSelect?: (id: string) => void;
  onSearchInBounds?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  onMapReady?: (flyTo: (coords: { lat: number; lng: number }) => void) => void;
  searchCity?: string;
  mapBounds?: { north: number; south: number; east: number; west: number } | null;
  cityZoom?: number;
  initialCenter?: { lat: number; lng: number } | null;
  latitude?: string;
  longitude?: string;
  eventType?: string;
  dateFrom?: string;
  dateTo?: string;
}

function EventsMapComponent({
  selectedEventId,
  onEventSelect,
  onSearchInBounds,
  onMapReady,
  searchCity,
  mapBounds,
  cityZoom = 6,
  initialCenter,
  latitude,
  longitude,
  eventType,
  dateFrom,
  dateTo,
}: EventsMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentBounds, setCurrentBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const mapPointsUrl = useCallback(() => {
    if (typeof window === "undefined") return "/api/events/map-points";
    const url = new URL("/api/events/map-points", window.location.origin);
    if (mapBounds) {
      url.searchParams.set("bounds", `${mapBounds.north},${mapBounds.south},${mapBounds.east},${mapBounds.west}`);
    } else if (searchCity) {
      url.searchParams.set("city", searchCity);
      if (latitude) url.searchParams.set("latitude", latitude);
      if (longitude) url.searchParams.set("longitude", longitude);
      url.searchParams.set("radius", "30");
    }
    if (eventType) url.searchParams.set("type", eventType);
    if (dateFrom) url.searchParams.set("dateFrom", dateFrom);
    if (dateTo) url.searchParams.set("dateTo", dateTo);
    return url.toString();
  }, [mapBounds, searchCity, latitude, longitude, eventType, dateFrom, dateTo]);

  const mapPointsKey = mapPointsUrl();
  const { data: mapPointsData, error, isLoading } = useSWR(
    mapPointsKey,
    async (url) => {
      const res = await fetch(url);
      const json = await res.json();
      console.log("[EventsMap] SWR fetch:", url, "→", json?.success, "features:", json?.data?.features?.length ?? 0);
      return json;
    },
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://api.mapbox.com/mapbox-gl-js/v3.16.0/mapbox-gl.css";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    const center: [number, number] = initialCenter ? [initialCenter.lng, initialCenter.lat] : [2.3522, 48.8566];
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      accessToken: token,
      center,
      zoom: initialCenter ? (cityZoom || 6) : 6,
      attributionControl: false,
    });

    map.current.on("load", () => {
      if (!map.current) return;
      console.log("[EventsMap] Map load event fired, adding source and layers");

      map.current.addSource("events", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      map.current.addLayer({
        id: "clusters",
        type: "circle",
        source: "events",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": ["step", ["get", "point_count"], "rgba(155, 180, 155, 0.6)", 10, "#8aa483", 50, "#6b7f5a"],
          "circle-radius": ["step", ["get", "point_count"], 20, 10, 30, 50, 40],
          "circle-stroke-width": 3,
          "circle-stroke-color": "white",
        },
      });

      map.current.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "events",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 12,
        },
        paint: { "text-color": "white" },
      });

      // Layer d'ombre pour les points individuels (effet de profondeur)
      map.current.addLayer({
        id: "unclustered-point-shadow",
        type: "circle",
        source: "events",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "rgba(0, 0, 0, 0.2)",
          "circle-radius": 10,
          "circle-blur": 1,
          "circle-pitch-alignment": "map",
        },
      });

      // Points individuels (cercles verts, comme PractitionersMap)
      map.current.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "events",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#9bb49b",
          "circle-radius": 10,
          "circle-stroke-width": 3,
          "circle-stroke-color": "white",
          "circle-pitch-alignment": "map",
        },
      });

      map.current.on("click", (e) => {
        const features = map.current!.queryRenderedFeatures(e.point, {
          layers: ["clusters", "unclustered-point"],
        });
        if (features.length === 0) return;

        const feature = features[0];
        if (feature.properties?.cluster) {
          const clusterId = feature.properties.cluster_id;
          (map.current!.getSource("events") as any).getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
            if (!err)
              map.current!.flyTo({
                center: (feature.geometry as any).coordinates as [number, number],
                zoom: zoom + 1,
                duration: 500,
              });
          });
        } else {
          const eventId = feature.properties?.eventId || feature.properties?.id;
          const eventUrl = feature.properties?.profileUrl || `/evenements/${feature.properties?.eventSlug || eventId}`;
          const title = feature.properties?.title || "Événement";
          const date = feature.properties?.date;
          const priceCents = feature.properties?.price_cents;
          const locationCity = feature.properties?.location_city || "";
          const bannerUrl = feature.properties?.banner_url;
          const posterUrl = feature.properties?.poster_url;
          const thumbUrl = bannerUrl || (posterUrl && !String(posterUrl).toLowerCase().endsWith(".pdf") ? posterUrl : null);

          if (eventId && onEventSelect) onEventSelect(eventId);

          const formattedDate = date ? new Date(date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
          const priceStr = priceCents === 0 ? "Gratuit" : `${(priceCents / 100).toFixed(0)} €`;

          const popupContent = `
            <div style="max-width: 280px; font-family: system-ui, sans-serif; padding: 0;">
              <div style="display: flex; gap: 12px; padding: 16px;">
                ${thumbUrl ? `<div style="flex-shrink: 0; width: 60px; height: 60px; border-radius: 8px; overflow: hidden;"><img src="${thumbUrl.startsWith('http') ? thumbUrl : (typeof window !== 'undefined' ? window.location.origin : '') + thumbUrl}" alt="" style="width:100%;height:100%;object-fit:cover;" /></div>` : ""}
                <div style="flex:1;min-width:0;">
                  <h3 style="margin:0 0 6px 0; font-size:15px; font-weight:600; color:#1f2937;">${title}</h3>
                  ${formattedDate ? `<p style="margin:0 0 4px 0; font-size:13px; color:#6b7280;">📅 ${formattedDate}</p>` : ""}
                  <p style="margin:0; font-size:13px; font-weight:600; color:#9bb49b;">${priceStr}</p>
                  ${locationCity ? `<p style="margin:4px 0 0 0; font-size:12px; color:#9ca3af;">📍 ${locationCity}</p>` : ""}
                </div>
              </div>
              <div style="padding: 12px 16px; border-top: 1px solid #e5e7eb; text-align: center;">
                <a href="${eventUrl}" style="display:inline-block; background:#9bb49b; color:white; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 13px;">Voir l'événement</a>
              </div>
            </div>
          `;

          document.querySelectorAll(".mapboxgl-popup").forEach((p) => p.remove());
          new mapboxgl.Popup({ offset: 25, closeButton: true, maxWidth: "300px" })
            .setLngLat((feature.geometry as any).coordinates as [number, number])
            .setHTML(popupContent)
            .addTo(map.current!);

          map.current!.easeTo({
            center: (feature.geometry as any).coordinates as [number, number],
            duration: 300,
          });
        }
      });

      map.current.on("mouseenter", "clusters", () => { map.current!.getCanvas().style.cursor = "pointer"; });
      map.current.on("mouseleave", "clusters", () => { map.current!.getCanvas().style.cursor = ""; });
      map.current.on("mouseenter", "unclustered-point", () => { map.current!.getCanvas().style.cursor = "pointer"; });
      map.current.on("mouseleave", "unclustered-point", () => { map.current!.getCanvas().style.cursor = ""; });

      const handleMapMove = () => {
        if (!map.current) return;
        const bounds = map.current.getBounds();
        if (bounds) {
          setCurrentBounds({ north: bounds.getNorth(), south: bounds.getSouth(), east: bounds.getEast(), west: bounds.getWest() });
        }
      };

      map.current.on("moveend", handleMapMove);
      map.current.on("zoomend", handleMapMove);

      const b = map.current.getBounds();
      setCurrentBounds(b ? { north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() } : null);
      setIsLoaded(true);
      console.log("[EventsMap] Map ready, isLoaded=true");

      onMapReady?.( (coords: { lat: number; lng: number }) => {
        if (map.current) {
          map.current.flyTo({
            center: [coords.lng, coords.lat],
            zoom: cityZoom || 10,
            duration: 800,
          });
        }
      } );
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onMapReady excluded to avoid map recreation on every render
  }, [searchCity, cityZoom]);

  useEffect(() => {
    if (map.current && isLoaded && mapBounds) {
      map.current.fitBounds(
        [
          [mapBounds.west, mapBounds.south],
          [mapBounds.east, mapBounds.north],
        ],
        { padding: 40, duration: 500 }
      );
    }
  }, [mapBounds, isLoaded]);

  useEffect(() => {
    if (map.current && isLoaded && initialCenter) {
      map.current.flyTo({
        center: [initialCenter.lng, initialCenter.lat],
        zoom: cityZoom || 11,
        duration: 800,
      });
    }
  }, [initialCenter, isLoaded, cityZoom]);

  useEffect(() => {
    const hasMap = !!map.current;
    const hasData = !!mapPointsData?.data;
    const featuresCount = mapPointsData?.data?.features?.length ?? 0;
    console.log("[EventsMap] setData effect:", { hasMap, isLoaded, success: mapPointsData?.success, hasData, featuresCount });
    if (!map.current || !isLoaded || !mapPointsData?.success || !mapPointsData?.data) return;
    const source = map.current.getSource("events") as mapboxgl.GeoJSONSource;
    if (source?.setData) {
      source.setData(mapPointsData.data);
      console.log("[EventsMap] setData called with", featuresCount, "features");
    } else {
      console.warn("[EventsMap] source.setData not available, source:", source);
    }
  }, [mapPointsData, isLoaded]);

  const handleSearchInBounds = useCallback(() => {
    if (currentBounds && onSearchInBounds) {
      onSearchInBounds(currentBounds);
    }
  }, [currentBounds, onSearchInBounds]);

  if (error) {
    return (
      <div className="w-full h-96 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center">
        <p className="text-red-700">Erreur de chargement de la carte</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full min-h-[400px] overflow-hidden" />
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sauge" />
        </div>
      )}
      {currentBounds && onSearchInBounds && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={handleSearchInBounds}
            className="bg-white text-sauge border border-sauge px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium hover:bg-sauge/5"
          >
            <ScanSearch className="h-4 w-4" />
            Afficher les événements dans la zone
          </button>
        </div>
      )}
      <style jsx global>{`
        .mapboxgl-popup-content { border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.15); padding: 0; }
        .mapboxgl-ctrl-top-right { top: 12px; right: 12px; }
      `}</style>
    </div>
  );
}

export const EventsMap = memo(EventsMapComponent);
