"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * TorkMap — Apple Maps-Inspired B2B Logistics Map Experience
 *
 * - Dark cartography (CartoDB Dark Matter)
 * - Dual-layer glow route polyline (Emerald #00E5A0)
 * - Custom pulsing origin (Emerald #00E5A0) & destination (Amber #F5B94C) pins
 * - Sleek circular glass controls with SVG iconography
 * - Live Route Pill: CANLI ROTA | 730 km · 8 sa 45 dk
 * - Robust ResizeObserver + map.invalidateSize()
 * - SSR Safe dynamic Leaflet lifecycle
 */
export default function TorkMap({
  origin,
  destination,
  originLabel = "Başlangıç",
  destinationLabel = "Varış",
  routePoints = [],
  className = "",
  distanceKm = null,
  durationText = null,
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
      zoomControl: false, // Custom Apple-style circular glass controls
      attributionControl: false,
      scrollWheelZoom: false,
    });

    // CartoDB Dark Matter Cartography
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    setIsReady(true);

    // ResizeObserver ensures Leaflet tiles adapt to container dimensions
    if (typeof ResizeObserver !== "undefined" && mapContainerRef.current) {
      const ro = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      });
      ro.observe(mapContainerRef.current);
      resizeObserverRef.current = ro;
    }

    // Trigger initial invalidateSize
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
      map.remove();
      mapRef.current = null;
    };
  }, [hasLeaflet]);

  // Update Markers & Polyline
  useEffect(() => {
    if (!isReady || !mapRef.current || !window.L) return;

    const L = window.L;
    const map = mapRef.current;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Clear previous polylines
    if (polylineGlowRef.current) {
      polylineGlowRef.current.remove();
      polylineGlowRef.current = null;
    }
    if (polylineCoreRef.current) {
      polylineCoreRef.current.remove();
      polylineCoreRef.current = null;
    }

    const bounds = [];

    // 1. Origin Marker (Emerald #00E5A0)
    if (origin && typeof origin.lat === "number" && typeof origin.lng === "number") {
      const originIcon = L.divIcon({
        className: "custom-map-pin",
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute h-6 w-6 rounded-full bg-[#00E5A0]/25 animate-ping"></span>
            <span class="relative flex h-4 w-4 items-center justify-center rounded-full bg-[#00E5A0] ring-4 ring-[#060B11] shadow-[0_0_12px_#00E5A0]">
              <span class="h-1.5 w-1.5 rounded-full bg-[#060B11]"></span>
            </span>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const m1 = L.marker([origin.lat, origin.lng], { icon: originIcon }).addTo(map);
      if (originLabel) {
        m1.bindTooltip(originLabel, {
          permanent: false,
          direction: "top",
          className: "tork-map-tooltip",
        });
      }
      markersRef.current.push(m1);
      bounds.push([origin.lat, origin.lng]);
    }

    // 2. Destination Marker (Amber #F5B94C)
    if (destination && typeof destination.lat === "number" && typeof destination.lng === "number") {
      const destIcon = L.divIcon({
        className: "custom-map-pin",
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute h-6 w-6 rounded-full bg-[#F5B94C]/25 animate-ping"></span>
            <span class="relative flex h-4 w-4 items-center justify-center rounded-full bg-[#F5B94C] ring-4 ring-[#060B11] shadow-[0_0_12px_#F5B94C]">
              <span class="h-1.5 w-1.5 rounded-full bg-[#060B11]"></span>
            </span>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const m2 = L.marker([destination.lat, destination.lng], { icon: destIcon }).addTo(map);
      if (destinationLabel) {
        m2.bindTooltip(destinationLabel, {
          permanent: false,
          direction: "top",
          className: "tork-map-tooltip",
        });
      }
      markersRef.current.push(m2);
      bounds.push([destination.lat, destination.lng]);
    }

    // 3. Polyline Route Rendering
    let points = [];
    if (routePoints && routePoints.length > 1) {
      points = routePoints.map((p) => [p.lat, p.lng]);
    } else if (bounds.length === 2) {
      // Fallback straight line if detailed coordinates unavailable
      points = [bounds[0], bounds[1]];
    }

    if (points.length >= 2) {
      // Outer Glow Line
      polylineGlowRef.current = L.polyline(points, {
        color: "#00E5A0",
        weight: 6,
        opacity: 0.25,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      // Inner Core Line
      polylineCoreRef.current = L.polyline(points, {
        color: "#00E5A0",
        weight: 2.5,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      points.forEach((pt) => bounds.push(pt));
    }

    // Auto fit bounds with gentle padding
    if (bounds.length > 0) {
      map.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: 13,
        animate: true,
      });
    }
  }, [isReady, origin, destination, originLabel, destinationLabel, routePoints]);

  const handleFitBounds = useCallback(() => {
    if (!mapRef.current || markersRef.current.length === 0) return;
    const group = window.L.featureGroup(markersRef.current);
    mapRef.current.fitBounds(group.getBounds(), {
      padding: [40, 40],
      maxZoom: 13,
      animate: true,
    });
  }, []);

  const hasRoute = Boolean(origin?.lat && destination?.lat);
  const routeTelemetryText = distanceKm
    ? `${distanceKm} km · ${durationText || "Hesaplanıyor"}`
    : durationText
    ? durationText
    : "Canlı Mesafe & Süre Aktif";

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#060B11] ${className}`}>
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="h-full w-full min-h-[300px]" />

      {/* Loading Placeholder */}
      {!hasLeaflet && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-[#060B11]/85 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#0B111A] px-4 py-2 text-xs font-bold text-[#8C98A8]">
            <span className="h-2 w-2 rounded-full bg-[#00E5A0] animate-pulse" />
            Harita yükleniyor...
          </div>
        </div>
      )}

      {/* Top Left Live Route Telemetry Pill */}
      {(origin?.lat != null || destination?.lat != null) && (
        <div className="pointer-events-none absolute left-3 top-3 sm:left-4 sm:top-4 z-[400] flex items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-[#0B111A]/90 px-3.5 py-2 backdrop-blur-md shadow-lg max-w-[calc(100%-80px)]">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00E5A0] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00E5A0]" />
          </span>
          <div className="min-w-0 truncate">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#00E5A0]">
              <span>CANLI ROTA</span>
              {hasRoute && <span className="text-white/40">·</span>}
              {hasRoute && <span className="text-[#F5F7FA] font-mono normal-case tracking-normal">{routeTelemetryText}</span>}
            </div>
            <div className="text-xs font-bold text-[#F5F7FA] truncate mt-0.5">
              {originLabel} {destination?.lat != null ? `→ ${destinationLabel}` : ""}
            </div>
          </div>
        </div>
      )}

      {/* Circular Glass Map Action Controls: Mobile Top-Right, Desktop Bottom-Right */}
      <div className="absolute top-3 right-3 sm:top-auto sm:bottom-4 sm:right-4 z-[400] flex flex-col gap-2">
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          aria-label="Yakınlaştır"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.12] bg-[#0B111A]/85 text-sm font-black text-[#F5F7FA] backdrop-blur-md transition hover:bg-[#101923] hover:border-white/25 active:scale-95 shadow-md"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          aria-label="Uzaklaştır"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.12] bg-[#0B111A]/85 text-sm font-black text-[#F5F7FA] backdrop-blur-md transition hover:bg-[#101923] hover:border-white/25 active:scale-95 shadow-md"
        >
          −
        </button>
        <button
          type="button"
          onClick={handleFitBounds}
          aria-label="Rotaya Odaklan"
          title="Rotaya Odaklan"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.12] bg-[#0B111A]/85 text-[#F5F7FA] backdrop-blur-md transition hover:bg-[#101923] hover:border-white/25 active:scale-95 shadow-md"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="7" />
            <path strokeLinecap="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
          </svg>
        </button>
      </div>
    </div>
  );
}