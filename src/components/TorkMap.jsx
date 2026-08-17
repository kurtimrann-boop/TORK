"use client";

import { useEffect, useRef, useState } from "react";

/**
 * TorkMap — Leaflet tabanlı harita bileşeni
 * Client-side render (Next.js SSR güvenliği için "use client")
 *
 * routePoints boşsa yalnızca iki marker ve görsel bağlantı çizilir.
 * Gerçek yol rotası Google Routes API ile ayrı Faz C'de eklenecek.
 */
export default function TorkMap({
  origin,
  destination,
  originLabel = "Başlangıç",
  destinationLabel = "Varış",
  routePoints = [],
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [hasLeaflet, setHasLeaflet] = useState(false);

  // Leaflet'i yalnızca client-side yükle
  useEffect(() => {
    let cancelled = false;

    async function loadLeaflet() {
      try {
        const L = (await import("leaflet")).default;
        if (!cancelled) {
          window.L = L;
          setHasLeaflet(true);
        }
      } catch (err) {
        console.error("Leaflet yüklenemedi:", err);
      }
    }

    loadLeaflet();

    return () => {
      cancelled = true;
    };
  }, []);

  // Haritayı oluştur
  useEffect(() => {
    if (!hasLeaflet || !mapContainerRef.current || mapRef.current) return;

    const L = window.L;

    const map = L.map(mapContainerRef.current, {
      center: [39.0, 35.0],
      zoom: 6,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanlar',
    }).addTo(map);

    mapRef.current = map;
    setIsReady(true);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current = [];
      polylineRef.current = null;
    };
  }, [hasLeaflet]);

  // Marker ve polyline güncelleme (memoization: routePoints değişmediyse tekrar hesaplama)
  useEffect(() => {
    if (!isReady || !mapRef.current) return;

    const L = window.L;
    const map = mapRef.current;

    // Eski marker ve polylineleri temizle
    markersRef.current.forEach((marker) => {
      if (map.hasLayer(marker)) map.removeLayer(marker);
    });
    markersRef.current = [];

    if (polylineRef.current && map.hasLayer(polylineRef.current)) {
      map.removeLayer(polylineRef.current);
    }
    polylineRef.current = null;

    const hasOrigin = origin?.lat != null && origin?.lng != null;
    const hasDestination = destination?.lat != null && destination?.lng != null;

    if (!hasOrigin && !hasDestination) {
      return;
    }

    const bounds = [];

    // Origin marker (emerald accent)
    if (hasOrigin) {
      const originIcon = L.divIcon({
        className: "tork-map-marker tork-map-marker--origin",
        html: "<div class='tork-map-marker__pin'></div>",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([origin.lat, origin.lng], { icon: originIcon })
        .addTo(map)
        .bindPopup(
          `<strong>Başlangıç</strong><br/>${originLabel}`,
          { closeButton: false }
        );

      markersRef.current.push(marker);
      bounds.push([origin.lat, origin.lng]);
    }

    // Destination marker (cyan accent)
    if (hasDestination) {
      const destinationIcon = L.divIcon({
        className: "tork-map-marker tork-map-marker--destination",
        html: "<div class='tork-map-marker__pin'></div>",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([destination.lat, destination.lng], { icon: destinationIcon })
        .addTo(map)
        .bindPopup(
          `<strong>Varış</strong><br/>${destinationLabel}`,
          { closeButton: false }
        );

      markersRef.current.push(marker);
      bounds.push([destination.lat, destination.lng]);
    }

    // Rota çizgisi: gerçek yol noktaları varsa onları, yoksa görsel bağlantı çiz
    if (routePoints && routePoints.length >= 2) {
      const validPoints = routePoints.filter(
        (p) => p?.lat != null && p?.lng != null
      );

      if (validPoints.length >= 2) {
        const polyline = L.polyline(
          validPoints.map((p) => [p.lat, p.lng]),
          {
            color: "#00E5A0",
            weight: 4,
            opacity: 0.85,
            dashArray: "8 8",
          }
        ).addTo(map);

        polylineRef.current = polyline;
      }
    } else if (hasOrigin && hasDestination) {
      // Görsel bağlantı: gerçek yol rotası değil, yalnızca iki marker arası çizgi
      const visualLine = L.polyline(
        [
          [origin.lat, origin.lng],
          [destination.lat, destination.lng],
        ],
        {
          color: "#06B6D4",
          weight: 2,
          opacity: 0.4,
          dashArray: "4 8",
        }
      ).addTo(map);

      polylineRef.current = visualLine;
    }

    // fitBounds
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }

    // scrollWheelZoom: masaüstünde rahatsız olmaması için kapat (kullanıcı tıklayınca aç)
    map.scrollWheelZoom.disable();
  }, [isReady, origin, destination, routePoints]);

  return (
    <div
      className="tork-map-wrapper relative min-h-[320px] w-full overflow-hidden rounded-2xl border border-white/8 bg-[#0B111A] sm:min-h-[380px] lg:min-h-[420px]"
    >
      <div ref={mapContainerRef} className="tork-map__container h-full w-full" />
      {!hasLeaflet && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-[#9AA7B5]">
          Harita yükleniyor...
        </div>
      )}
    </div>
  );
}