"use client";

import { useEffect, useRef, useState } from "react";

export default function MiniLiveMap({
  coords = null,
  locationName = "Mevcut Konum",
  onRequestLocation,
  isLocating = false,
  origin = null,
  destination = null,
  routeDistanceKm = 730,
  routeDurationText = "8 sa 45 dk",
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const polylineGlowRef = useRef(null);
  const polylineCoreRef = useRef(null);
  const [hasLeaflet, setHasLeaflet] = useState(false);

  // Dynamic Leaflet import (SSR safe)
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
        console.error("Leaflet load error in MiniLiveMap:", err);
      }
    }

    loadLeaflet();

    return () => {
      cancelled = true;
    };
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!hasLeaflet || !mapContainerRef.current || mapRef.current) return;

    const L = window.L;

    // Neutral Turkey center
    const initialLat = coords?.lat || 39.5;
    const initialLng = coords?.lng || 35.5;
    const initialZoom = coords ? 11 : 6;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
    });

    // Dark CartoDB Matter tile layer
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 18,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
      circleRef.current = null;
    };
  }, [hasLeaflet, coords]);

  // Update Marker & Position when coords change
  useEffect(() => {
    if (!mapRef.current || !window.L) return;

    const L = window.L;
    const map = mapRef.current;

    if (markerRef.current && map.hasLayer(markerRef.current)) {
      map.removeLayer(markerRef.current);
    }
    if (circleRef.current && map.hasLayer(circleRef.current)) {
      map.removeLayer(circleRef.current);
    }

    if (coords?.lat && coords?.lng) {
      map.setView([coords.lat, coords.lng], 12, { animate: true });

      // Pulsing radar circle
      const circle = L.circle([coords.lat, coords.lng], {
        radius: 1800,
        color: "#00E5A0",
        fillColor: "#00E5A0",
        fillOpacity: 0.1,
        weight: 1.5,
      }).addTo(map);
      circleRef.current = circle;

      // Custom glowing location pin
      const locationIcon = L.divIcon({
        className: "tork-map-marker-wrap",
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute -inset-3 rounded-full bg-[#00E5A0]/20 animate-ping"></div>
            <div class="h-4 w-4 rounded-full border-2 border-white bg-[#00E5A0] shadow-[0_0_16px_rgba(0,229,160,0.9)] flex items-center justify-center">
              <div class="h-1.5 w-1.5 rounded-full bg-[#060B11]"></div>
            </div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const marker = L.marker([coords.lat, coords.lng], { icon: locationIcon })
        .addTo(map)
        .bindPopup(
          `<div class="p-1 text-center font-sans"><strong class="text-xs text-white">${locationName}</strong><br/><span class="text-[10px] text-[#00E5A0] font-bold">CANLI OPERASYON MERKEZİ</span></div>`,
          { closeButton: false }
        );
      markerRef.current = marker;
    }
  }, [coords, locationName]);

  return (
    <div
      className="relative h-[340px] sm:h-[380px] w-full overflow-hidden rounded-3xl border border-white/[0.06] bg-[#0B111A] shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
      aria-label={`Canlı Kontrol Haritası - ${locationName}`}
    >
      <div ref={mapContainerRef} className="h-full w-full" />

      {/* Top Left Live Control Badge */}
      <div className="pointer-events-none absolute left-4 top-4 z-[400] flex items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-[#0B111A]/90 px-4 py-2 backdrop-blur-md shadow-lg">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00E5A0] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00E5A0]" />
        </span>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#00E5A0]">
            Canlı Lojistik Radarı
          </div>
          <div className="text-xs font-bold text-[#F5F7FA]">
            {coords ? locationName : "Türkiye Operasyon Hattı"}
          </div>
        </div>
      </div>

      {/* Top Right Route Metrics Overlay */}
      <div className="pointer-events-none absolute right-4 top-4 z-[400] hidden sm:flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#0B111A]/90 px-4 py-2 backdrop-blur-md shadow-lg">
        <div className="text-right">
          <div className="text-[10px] font-semibold text-[#8C98A8] uppercase tracking-wider">
            Canlı Hat
          </div>
          <div className="text-xs font-bold text-[#F5F7FA]">
            {routeDistanceKm} km · {routeDurationText}
          </div>
        </div>
        <div className="h-7 w-px bg-white/[0.08]" />
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00E5A0]/10 text-[#00E5A0] border border-[#00E5A0]/20">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>
      </div>

      {/* Location Request CTA if coords missing */}
      {!coords && (
        <div className="absolute inset-0 z-[400] flex flex-col items-center justify-center bg-[#060B11]/70 p-6 text-center backdrop-blur-[2px]">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-[#00E5A0]">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-[#F5F7FA]">Canlı Operasyon Radarı</p>
          <p className="mt-1 text-xs text-[#8C98A8] max-w-xs">
            Konumunuzu belirleyerek çevrenizdeki açık yük ve filo hareketlerini harita üzerinde anlık izleyin.
          </p>
          {onRequestLocation && (
            <button
              type="button"
              onClick={onRequestLocation}
              disabled={isLocating}
              className="mt-4 flex items-center gap-2 rounded-xl bg-[#00E5A0] px-4 py-2.5 text-xs font-bold text-[#060B11] shadow-[0_0_20px_rgba(0,229,160,0.3)] transition hover:bg-[#00c78a] active:scale-[0.98] disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {isLocating ? "Konum Taranıyor..." : "Radar Konumunu Başlat"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
