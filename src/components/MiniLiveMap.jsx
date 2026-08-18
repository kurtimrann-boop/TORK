"use client";

import { useEffect, useRef, useState } from "react";

export default function MiniLiveMap({
  coords = null,
  locationName = "Mevcut Konum",
  onRequestLocation,
  isLocating = false,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
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

    // Neutral Turkey center when coords not available (no fake Ankara pin)
    const initialLat = coords?.lat || 39.0;
    const initialLng = coords?.lng || 35.2;
    const initialZoom = coords ? 12 : 5.5;

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
      map.setView([coords.lat, coords.lng], 13, { animate: true });

      // Pulsing radar circle
      const circle = L.circle([coords.lat, coords.lng], {
        radius: 1200,
        color: "#00E5A0",
        fillColor: "#00E5A0",
        fillOpacity: 0.12,
        weight: 1.5,
      }).addTo(map);
      circleRef.current = circle;

      // Custom glowing location pin
      const locationIcon = L.divIcon({
        className: "tork-map-marker-wrap",
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute -inset-2.5 rounded-full bg-[#00E5A0]/25 animate-ping"></div>
            <div class="h-4 w-4 rounded-full border-2 border-white bg-[#00E5A0] shadow-[0_0_14px_rgba(0,229,160,0.85)] flex items-center justify-center">
              <div class="h-1.5 w-1.5 rounded-full bg-[#090D14]"></div>
            </div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([coords.lat, coords.lng], { icon: locationIcon })
        .addTo(map)
        .bindPopup(
          `<div class="p-1 text-center font-sans"><strong class="text-xs text-white">${locationName}</strong><br/><span class="text-[10px] text-slate-300">Operasyon Noktası</span></div>`,
          { closeButton: false }
        );
      markerRef.current = marker;
    }
  }, [coords, locationName]);

  return (
    <div
      className="relative h-[250px] sm:h-[280px] w-full overflow-hidden rounded-3xl border border-white/8 bg-[#090D14]"
      aria-label={`Mini Canlı Harita - ${locationName}`}
    >
      <div ref={mapContainerRef} className="h-full w-full" />

      {/* Top Overlay Badge */}
      <div className="pointer-events-none absolute left-3 top-3 z-[400] flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-3.5 py-1.5 backdrop-blur-md">
        <span className="h-2 w-2 rounded-full bg-[#00E5A0] animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white">
          {coords ? locationName : "Operasyon Haritası"}
        </span>
      </div>

      {/* Location Request CTA if coords missing */}
      {!coords && (
        <div className="absolute inset-0 z-[400] flex flex-col items-center justify-center bg-black/60 p-4 text-center backdrop-blur-[2px]">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-xs font-bold text-slate-300">Konum Belirlenmedi</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Çevrenizdeki operasyon ve yükleri filtreleyin</p>
          {onRequestLocation && (
            <button
              type="button"
              onClick={onRequestLocation}
              disabled={isLocating}
              className="mt-3 flex items-center gap-1.5 rounded-xl border border-[#00E5A0]/30 bg-[#00E5A0]/10 px-4 py-2 text-xs font-black text-[#00E5A0] transition hover:bg-[#00E5A0]/20 disabled:opacity-50"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {isLocating ? "Konum Alınıyor..." : "Konumu Belirle"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
