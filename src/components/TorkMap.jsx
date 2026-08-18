"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * TorkMap — Apple Maps-Inspired B2B Logistics Map Experience
 *
 * - Dark muted cartography (CartoDB Dark Matter)
 * - Dual-layer glow route polyline (Emerald #00E5A0)
 * - Custom pulsing origin (Emerald) & destination (Gold #FFCC00) pins
 * - Sleek glassmorphic zoom & re-center controls
 * - Robust ResizeObserver + map.invalidateSize() to prevent 0-height collapses
 * - SSR Safe dynamic Leaflet lifecycle
 */
export default function TorkMap({
  origin,
  destination,
  originLabel = "Başlangıç",
  destinationLabel = "Varış",
  routePoints = [],
  className = "",
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const polylineGlowRef = useRef(null);
  const polylineCoreRef = useRef(null);
  const resizeObserverRef = useRef(null);

  const [isReady, setIsReady] = useState(false);
  const [hasLeaflet, setHasLeaflet] = useState(false);

  // Dynamic Leaflet load (Next.js SSR safe)
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
        console.error("Leaflet load error:", err);
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

    const map = L.map(mapContainerRef.current, {
      center: [39.0, 35.2], // Center of Turkey
      zoom: 6,
      zoomControl: false, // Custom Apple-style glass controls used instead
      attributionControl: false,
      scrollWheelZoom: false,
    });

    // CartoDB Dark Matter Cartography — Muted, low-clutter, data-first base map
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    setIsReady(true);

    // ResizeObserver ensures Leaflet tiles always adapt to container dimensions
    if (typeof ResizeObserver !== "undefined" && mapContainerRef.current) {
      const ro = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      });
      ro.observe(mapContainerRef.current);
      resizeObserverRef.current = ro;
    }

    // Trigger initial invalidateSize after layout paint
    const t = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 150);

    return () => {
      clearTimeout(t);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current = [];
      polylineGlowRef.current = null;
      polylineCoreRef.current = null;
    };
  }, [hasLeaflet]);

  // Fit bounds helper for re-center action
  const handleFitBounds = useCallback(() => {
    if (!mapRef.current || !window.L) return;
    const bounds = [];
    if (origin?.lat != null && origin?.lng != null) bounds.push([origin.lat, origin.lng]);
    if (destination?.lat != null && destination?.lng != null) bounds.push([destination.lat, destination.lng]);

    if (bounds.length > 0) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 13, animate: true });
    } else {
      mapRef.current.setView([39.0, 35.2], 6, { animate: true });
    }
  }, [origin, destination]);

  // Update Markers & Polylines when coordinates or route changes
  useEffect(() => {
    if (!isReady || !mapRef.current || !window.L) return;

    const L = window.L;
    const map = mapRef.current;

    // Clear previous layers
    markersRef.current.forEach((marker) => {
      if (map.hasLayer(marker)) map.removeLayer(marker);
    });
    markersRef.current = [];

    if (polylineGlowRef.current && map.hasLayer(polylineGlowRef.current)) {
      map.removeLayer(polylineGlowRef.current);
      polylineGlowRef.current = null;
    }
    if (polylineCoreRef.current && map.hasLayer(polylineCoreRef.current)) {
      map.removeLayer(polylineCoreRef.current);
      polylineCoreRef.current = null;
    }

    const hasOrigin = origin?.lat != null && origin?.lng != null;
    const hasDestination = destination?.lat != null && destination?.lng != null;

    if (!hasOrigin && !hasDestination) {
      map.setView([39.0, 35.2], 6, { animate: false });
      return;
    }

    const bounds = [];

    // Origin Marker (TORK Emerald)
    if (hasOrigin) {
      const originIcon = L.divIcon({
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

      const marker = L.marker([origin.lat, origin.lng], { icon: originIcon })
        .addTo(map)
        .bindPopup(
          `<div class="p-1 text-center font-sans"><strong class="text-xs text-white">${originLabel}</strong><br/><span class="text-[10px] text-[#00E5A0] font-bold uppercase tracking-wider">Yükleme Noktası</span></div>`,
          { closeButton: false }
        );

      markersRef.current.push(marker);
      bounds.push([origin.lat, origin.lng]);
    }

    // Destination Marker (TORK Gold)
    if (hasDestination) {
      const destIcon = L.divIcon({
        className: "tork-map-marker-wrap",
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute -inset-2.5 rounded-full bg-[#FFCC00]/25 animate-ping"></div>
            <div class="h-4 w-4 rounded-full border-2 border-white bg-[#FFCC00] shadow-[0_0_14px_rgba(255,204,0,0.85)] flex items-center justify-center">
              <div class="h-1.5 w-1.5 rounded-full bg-[#090D14]"></div>
            </div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([destination.lat, destination.lng], { icon: destIcon })
        .addTo(map)
        .bindPopup(
          `<div class="p-1 text-center font-sans"><strong class="text-xs text-white">${destinationLabel}</strong><br/><span class="text-[10px] text-[#FFCC00] font-bold uppercase tracking-wider">Teslimat Noktası</span></div>`,
          { closeButton: false }
        );

      markersRef.current.push(marker);
      bounds.push([destination.lat, destination.lng]);
    }

    // Route Polyline (Dual-Layer: Ambient Glow + High-Precision Emerald Vector)
    if (routePoints && routePoints.length >= 2) {
      const validPoints = routePoints.filter((p) => p?.lat != null && p?.lng != null);

      if (validPoints.length >= 2) {
        const latLngs = validPoints.map((p) => [p.lat, p.lng]);

        // Outer soft glow layer
        const glowLine = L.polyline(latLngs, {
          color: "#00E5A0",
          weight: 9,
          opacity: 0.22,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);
        polylineGlowRef.current = glowLine;

        // Inner crisp core route layer
        const coreLine = L.polyline(latLngs, {
          color: "#00E5A0",
          weight: 4.5,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);
        polylineCoreRef.current = coreLine;

        // Extend bounds to encompass entire route geometry
        validPoints.forEach((p) => bounds.push([p.lat, p.lng]));
      }
    }

    // Auto-fit to active bounds with comfortable padding
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }

    // Immediate resize check
    setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 100);
  }, [isReady, origin, destination, originLabel, destinationLabel, routePoints]);

  return (
    <div
      className={`relative h-[360px] sm:h-[420px] lg:h-[460px] w-full overflow-hidden rounded-3xl border border-white/8 bg-[#090D14] shadow-[0_16px_40px_rgba(0,0,0,0.4)] ${className}`}
      aria-label="TORK Rota Haritası"
    >
      {/* Map DOM Canvas */}
      <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />

      {/* Loading Placeholder */}
      {!hasLeaflet && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-[#090D14]/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-4 py-2 text-xs font-bold text-slate-300">
            <span className="h-2 w-2 rounded-full bg-[#00E5A0] animate-pulse" />
            Harita yükleniyor...
          </div>
        </div>
      )}

      {/* Top Telemetry Header Pill */}
      {(origin?.lat != null || destination?.lat != null) && (
        <div className="pointer-events-none absolute left-3 top-3 z-[400] max-w-[calc(100%-80px)] truncate flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-3.5 py-1.5 backdrop-blur-md">
          <span className="h-2 w-2 shrink-0 rounded-full bg-[#00E5A0] animate-pulse" />
          <span className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-white">
            {originLabel} {destination?.lat != null ? `→ ${destinationLabel}` : ""}
          </span>
        </div>
      )}

      {/* Apple-Inspired Glassmorphic Map Action Controls (Bottom-Right) */}
      <div className="absolute bottom-3 right-3 z-[400] flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          aria-label="Yakınlaştır"
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-black/65 text-sm font-black text-white backdrop-blur-md transition hover:bg-black/85 hover:border-white/20 active:scale-95"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          aria-label="Uzaklaştır"
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-black/65 text-sm font-black text-white backdrop-blur-md transition hover:bg-black/85 hover:border-white/20 active:scale-95"
        >
          −
        </button>
        <button
          type="button"
          onClick={handleFitBounds}
          aria-label="Rotaya Odaklan"
          title="Rotaya Odaklan"
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-black/65 text-xs text-white backdrop-blur-md transition hover:bg-black/85 hover:border-white/20 active:scale-95"
        >
          🎯
        </button>
      </div>
    </div>
  );
}