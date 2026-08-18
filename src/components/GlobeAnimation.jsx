"use client";

import { useEffect, useRef } from "react";

// 6 Core Logistics Hubs with Directional Label Offsets
const CORE_HUBS = [
  {
    name: "London",
    lat: 51.5074,
    lng: -0.1278,
    primary: false,
    size: 2.6,
    labelAlign: "right",
    labelBaseline: "bottom",
    dx: -7,
    dy: -5,
  },
  {
    name: "Istanbul",
    lat: 41.0082,
    lng: 28.9784,
    primary: true,
    size: 3.4,
    labelAlign: "right",
    labelBaseline: "bottom",
    dx: -7,
    dy: -5,
  },
  {
    name: "Trabzon",
    lat: 40.9167,
    lng: 39.7167,
    primary: true,
    size: 3.0,
    labelAlign: "left",
    labelBaseline: "bottom",
    dx: 7,
    dy: -5,
  },
  {
    name: "Ankara",
    lat: 39.9334,
    lng: 32.8597,
    primary: true,
    size: 3.2,
    labelAlign: "right",
    labelBaseline: "top",
    dx: -7,
    dy: 5,
  },
  {
    name: "Gaziantep",
    lat: 37.0662,
    lng: 37.3833,
    primary: false,
    size: 2.6,
    labelAlign: "left",
    labelBaseline: "top",
    dx: 7,
    dy: 5,
  },
  {
    name: "Dubai",
    lat: 25.2048,
    lng: 55.2708,
    primary: false,
    size: 2.8,
    labelAlign: "left",
    labelBaseline: "middle",
    dx: 7,
    dy: 0,
  },
];

// Global Anchor point for Eastbound Gateway
const GLOBAL_GATEWAY = {
  lat: 10.0,
  lng: 85.0,
};

// Subtle, low-noise telemetry corridors
const TELEMETRY_CORRIDORS = [
  { from: 0, to: 1, lift: 1.20, alpha: 0.16, hasPacket: true },   // London ↔ Istanbul
  { from: 1, to: 3, lift: 1.10, alpha: 0.24, hasPacket: true },   // Istanbul ↔ Ankara
  { from: 3, to: 2, lift: 1.10, alpha: 0.18, hasPacket: false },  // Ankara ↔ Trabzon
  { from: 3, to: 4, lift: 1.10, alpha: 0.18, hasPacket: false },  // Ankara ↔ Gaziantep
  { from: 1, to: 5, lift: 1.18, alpha: 0.20, hasPacket: true },   // Istanbul ↔ Dubai
  { from: 5, to: "gateway", lift: 1.20, alpha: 0.12, hasPacket: false }, // Dubai ↔ Gateway
];

// Refined Fibonacci Surface Grid (Calm, 84 dots)
const TOTAL_SURFACE_DOTS = 84;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export default function GlobeAnimation({ className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let rotationAngle = -0.58; // Centered gracefully on Turkey

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // Pre-calculate surface dots
    const surfaceDots = [];
    for (let i = 0; i < TOTAL_SURFACE_DOTS; i++) {
      const y = 1 - (i / (TOTAL_SURFACE_DOTS - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = GOLDEN_ANGLE * i;
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;
      surfaceDots.push({ x, y, z });
    }

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

      if (width === 0 || height === 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const radius = Math.min(width, height) * 0.43;
      const cx = width / 2;
      const cy = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Very calm, steady rotation
      rotationAngle += 0.0012;

      const cosRot = Math.cos(rotationAngle);
      const sinRot = Math.sin(rotationAngle);

      const project = (v) => {
        const rx = v.x * cosRot - v.z * sinRot;
        const rz = v.x * sinRot + v.z * cosRot;
        return {
          x: cx + rx * radius,
          y: cy - v.y * radius,
          z: rz,
          visible: rz > -0.15,
        };
      };

      // 1. Soft Ambient Halo
      const haloGrad = ctx.createRadialGradient(cx, cy, radius * 0.7, cx, cy, radius * 1.15);
      haloGrad.addColorStop(0, "rgba(0, 229, 160, 0.035)");
      haloGrad.addColorStop(0.6, "rgba(0, 229, 160, 0.008)");
      haloGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.15, 0, Math.PI * 2);
      ctx.fill();

      // 2. Base Sphere Subtle Outline
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // 3. Render Matrix Dots (Soft Depth)
      surfaceDots.forEach((dot) => {
        const p = project(dot);
        if (p.z > -0.2) {
          const alpha = p.z > 0 ? 0.08 + p.z * 0.14 : 0.025;
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.z > 0 ? 1.1 : 0.75, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 4. Render Telemetry Corridors
      TELEMETRY_CORRIDORS.forEach((corridor, idx) => {
        const fromHub = hubVectors[corridor.from];
        const toVec = corridor.to === "gateway" ? gatewayVec : hubVectors[corridor.to].vec;

        const v1 = fromHub.vec;
        const v2 = toVec;

        const p1 = project(v1);
        const p2 = project(v2);

        if (p1.z > -0.2 || p2.z > -0.2) {
          const numSteps = 26;
          ctx.beginPath();

          for (let s = 0; s <= numSteps; s++) {
            const t = s / numSteps;
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

          const arcAlpha = Math.max(0.04, Math.min(0.24, (p1.z + p2.z) * 0.18 + corridor.alpha * 0.4));
          ctx.strokeStyle = `rgba(0, 229, 160, ${arcAlpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Subtle, calm packet movement (Only on selected key corridors)
          if (corridor.hasPacket) {
            const packetProgress = (elapsed * 0.15 + idx * 0.3) % 1;
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
              ctx.fillStyle = "rgba(0, 229, 160, 0.85)";
              ctx.shadowColor = "rgba(0, 229, 160, 0.4)";
              ctx.shadowBlur = 4;
              ctx.beginPath();
              ctx.arc(packetPos.x, packetPos.y, 1.6, 0, Math.PI * 2);
              ctx.fill();
              ctx.shadowBlur = 0;
            }
          }
        }
      });

      // 5. Render Core Hubs & Labels
      ctx.font = "500 9.5px -apple-system, BlinkMacSystemFont, 'Geist', 'Inter', sans-serif";

      hubVectors.forEach((hub) => {
        const p = project(hub.vec);

        if (p.visible) {
          const depthScale = Math.max(0.65, (p.z + 1) / 2);
          const size = hub.size * depthScale;

          // Subtle pulse ring on Istanbul & Ankara
          if (hub.primary) {
            const pulse = (Math.sin(elapsed * 2.0 + hub.lat) + 1) / 2;
            ctx.strokeStyle = `rgba(0, 229, 160, ${0.25 * (1 - pulse)})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, size + 1.5 + pulse * 3.5, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Hub Core
          ctx.fillStyle = "#00E5A0";
          ctx.shadowColor = "rgba(0, 229, 160, 0.5)";
          ctx.shadowBlur = hub.primary ? 5 : 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Inner Dark Dot
          ctx.fillStyle = "#060B11";
          ctx.beginPath();
          ctx.arc(p.x, p.y, size * 0.35, 0, Math.PI * 2);
          ctx.fill();

          // Clean Label
          if (p.z > 0.12) {
            const textAlpha = Math.min(0.85, (p.z - 0.08) * 1.8);
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
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Background Subtle Radial Glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center opacity-20">
        <div className="h-[300px] w-[300px] sm:h-[380px] sm:w-[380px] rounded-full border border-white/[0.03] bg-[radial-gradient(circle,rgba(0,229,160,0.03)_0%,transparent_70%)]" />
      </div>

      <canvas
        ref={canvasRef}
        className="h-full w-full max-h-[340px] max-w-[340px] sm:max-h-[400px] sm:max-w-[400px]"
      />
    </div>
  );
}
