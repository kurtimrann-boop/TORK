"use client";

import { useEffect, useRef } from "react";

// 6 Core Logistics Hubs with Directional Label Offsets (Quad-Lock Geometry)
const CORE_HUBS = [
  {
    name: "London",
    lat: 51.5074,
    lng: -0.1278,
    primary: false,
    size: 3.0,
    color: "#00E5A0",
    labelAlign: "right",
    labelBaseline: "bottom",
    dx: -8,
    dy: -6,
  },
  {
    name: "Istanbul",
    lat: 41.0082,
    lng: 28.9784,
    primary: true,
    size: 3.8,
    color: "#FFCC00",
    labelAlign: "right",
    labelBaseline: "bottom",
    dx: -8,
    dy: -6,
  },
  {
    name: "Trabzon",
    lat: 40.9167,
    lng: 39.7167,
    primary: true,
    size: 3.4,
    color: "#FFCC00",
    labelAlign: "left",
    labelBaseline: "bottom",
    dx: 8,
    dy: -6,
  },
  {
    name: "Ankara",
    lat: 39.9334,
    lng: 32.8597,
    primary: true,
    size: 3.4,
    color: "#FFCC00",
    labelAlign: "right",
    labelBaseline: "top",
    dx: -8,
    dy: 6,
  },
  {
    name: "Gaziantep",
    lat: 37.0662,
    lng: 37.3833,
    primary: false,
    size: 2.8,
    color: "#06B6D4",
    labelAlign: "left",
    labelBaseline: "top",
    dx: 8,
    dy: 6,
  },
  {
    name: "Dubai",
    lat: 25.2048,
    lng: 55.2708,
    primary: false,
    size: 3.0,
    color: "#00E5A0",
    labelAlign: "left",
    labelBaseline: "middle",
    dx: 8,
    dy: 0,
  },
];

// Global Anchor point for Dubai Eastbound Gateway
const GLOBAL_GATEWAY = {
  lat: 10.0,
  lng: 85.0,
};

// Streamlined Telemetry Corridors (Reduced Noise, High-Value Routes)
const TELEMETRY_CORRIDORS = [
  { from: 0, to: 1, lift: 1.22, color: "rgba(0, 229, 160, " },   // London ↔ Istanbul (Intercontinental)
  { from: 1, to: 3, lift: 1.12, color: "rgba(255, 204, 0, " },  // Istanbul ↔ Ankara (National Core)
  { from: 3, to: 2, lift: 1.12, color: "rgba(6, 182, 212, " },   // Ankara ↔ Trabzon (Black Sea)
  { from: 3, to: 4, lift: 1.12, color: "rgba(255, 204, 0, " },  // Ankara ↔ Gaziantep (South-East)
  { from: 1, to: 5, lift: 1.20, color: "rgba(0, 229, 160, " },   // Istanbul ↔ Dubai (Middle East Corridor)
  { from: 5, to: "gateway", lift: 1.22, color: "rgba(6, 182, 212, " }, // Dubai ↔ Global Gateway
];

// Fibonacci Sphere Surface Grid Dots (Airy, uncluttered distribution)
const TOTAL_SURFACE_DOTS = 96;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export default function GlobeAnimation({ className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let rotationAngle = -0.58; // Center on Turkey initially

    // High DPI Display Canvas Normalization
    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // Pre-compute Fibonacci Sphere Coordinates
    const surfaceDots = [];
    for (let i = 0; i < TOTAL_SURFACE_DOTS; i++) {
      const y = 1 - (i / (TOTAL_SURFACE_DOTS - 1)) * 2; // y goes from 1 to -1
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = GOLDEN_ANGLE * i;
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;
      surfaceDots.push({ x, y, z });
    }

    // Convert lat/lng to 3D Cartesian Vector
    const latLngToVector = (lat, lng) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lng + 180) * (Math.PI / 180);
      return {
        x: -(Math.sin(phi) * Math.cos(theta)),
        y: Math.cos(phi),
        z: Math.sin(phi) * Math.sin(theta),
      };
    };

    const hubVectors = CORE_HUBS.map((hub) => ({
      ...hub,
      vec: latLngToVector(hub.lat, hub.lng),
    }));

    const gatewayVec = latLngToVector(GLOBAL_GATEWAY.lat, GLOBAL_GATEWAY.lng);

    let startTime = performance.now();

    const render = (time) => {
      const elapsed = (time - startTime) / 1000;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const radius = Math.min(width, height) * 0.42;
      const cx = width / 2;
      const cy = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Smooth, slow rotation
      rotationAngle += 0.0018;

      const cosRot = Math.cos(rotationAngle);
      const sinRot = Math.sin(rotationAngle);

      // Rotate point around Y axis
      const project = (v) => {
        const rx = v.x * cosRot - v.z * sinRot;
        const rz = v.x * sinRot + v.z * cosRot;
        return {
          x: cx + rx * radius,
          y: cy - v.y * radius,
          z: rz,
          visible: rz > -0.15, // Front facing threshold with soft edge
        };
      };

      // 1. Globe Ambient Atmospheric Halo (Deep Charcoal / Slate)
      const haloGrad = ctx.createRadialGradient(cx, cy, radius * 0.75, cx, cy, radius * 1.15);
      haloGrad.addColorStop(0, "rgba(0, 229, 160, 0.05)");
      haloGrad.addColorStop(0.5, "rgba(6, 182, 212, 0.02)");
      haloGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.15, 0, Math.PI * 2);
      ctx.fill();

      // 2. Base Sphere Outline
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // 3. Render Fibonacci Matrix Dots (Background & Foreground)
      surfaceDots.forEach((dot) => {
        const p = project(dot);
        if (p.z > -0.2) {
          const alpha = p.z > 0 ? 0.12 + p.z * 0.22 : 0.04;
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.z > 0 ? 1.2 : 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 4. Render Telemetry Arcs (Great Circle Arcs)
      TELEMETRY_CORRIDORS.forEach((corridor, idx) => {
        const fromHub = hubVectors[corridor.from];
        const toVec = corridor.to === "gateway" ? gatewayVec : hubVectors[corridor.to].vec;

        const v1 = fromHub.vec;
        const v2 = toVec;

        const p1 = project(v1);
        const p2 = project(v2);

        // Render only if at least one endpoint is facing the viewer
        if (p1.z > -0.2 || p2.z > -0.2) {
          const numSteps = 28;
          ctx.beginPath();

          for (let s = 0; s <= numSteps; s++) {
            const t = s / numSteps;
            // Spherical linear interpolation with arc lift
            const ix = v1.x * (1 - t) + v2.x * t;
            const iy = v1.y * (1 - t) + v2.y * t;
            const iz = v1.z * (1 - t) + v2.z * t;
            const len = Math.sqrt(ix * ix + iy * iy + iz * iz);

            const arcPeak = Math.sin(t * Math.PI) * (corridor.lift - 1.0);
            const altitude = 1.0 + arcPeak;

            const liftedVec = {
              x: (ix / len) * altitude,
              y: (iy / len) * altitude,
              z: (iz / len) * altitude,
            };

            const pt = project(liftedVec);
            if (s === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }

          const arcAlpha = Math.max(0.08, Math.min(0.4, (p1.z + p2.z) * 0.3 + 0.15));
          ctx.strokeStyle = `${corridor.color}${arcAlpha})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Pulsing Satellite Packet Animation along Corridor
          const packetProgress = (elapsed * 0.28 + idx * 0.22) % 1;
          const t = packetProgress;
          const px = v1.x * (1 - t) + v2.x * t;
          const py = v1.y * (1 - t) + v2.y * t;
          const pz = v1.z * (1 - t) + v2.z * t;
          const plen = Math.sqrt(px * px + py * py + pz * pz);
          const alt = 1.0 + Math.sin(t * Math.PI) * (corridor.lift - 1.0);

          const packetPos = project({
            x: (px / plen) * alt,
            y: (py / plen) * alt,
            z: (pz / plen) * alt,
          });

          if (packetPos.z > -0.1) {
            ctx.fillStyle = corridor.color.includes("255, 204") ? "#FFCC00" : "#00E5A0";
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(packetPos.x, packetPos.y, 2.0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      });

      // 5. Render Core Hubs & Labels with Clean Typography
      ctx.font = "600 10px -apple-system, BlinkMacSystemFont, 'Geist', 'Inter', sans-serif";

      hubVectors.forEach((hub) => {
        const p = project(hub.vec);

        if (p.visible) {
          const depthScale = Math.max(0.6, (p.z + 1) / 2);
          const size = hub.size * depthScale;

          // Pulse ring on primary hubs
          if (hub.primary) {
            const pulse = (Math.sin(elapsed * 2.5 + hub.lat) + 1) / 2;
            ctx.strokeStyle = `rgba(255, 204, 0, ${0.35 * (1 - pulse)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, size + 2 + pulse * 4, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Hub Solid Core
          ctx.fillStyle = hub.color;
          ctx.shadowColor = hub.color;
          ctx.shadowBlur = hub.primary ? 8 : 4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Inner Dark Dot
          ctx.fillStyle = "#0B111A";
          ctx.beginPath();
          ctx.arc(p.x, p.y, size * 0.35, 0, Math.PI * 2);
          ctx.fill();

          // Text Label with Directional Placement Offset
          if (p.z > 0.15) {
            const textAlpha = Math.min(0.9, (p.z - 0.1) * 2);
            ctx.fillStyle = `rgba(245, 247, 250, ${textAlpha})`;
            ctx.textAlign = hub.labelAlign;
            ctx.textBaseline = hub.labelBaseline;
            ctx.fillText(hub.name, p.x + hub.dx, p.y + hub.dy);
          }
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        className="h-full w-full max-h-[320px] max-w-[320px] sm:max-h-[380px] sm:max-w-[380px]"
      />
    </div>
  );
}
