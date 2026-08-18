"use client";

import { useEffect, useRef } from "react";

// 6 Core Logistics Hubs with Directional Label Offsets (Quad-Lock Geometry)
const CORE_HUBS = [
  {
    name: "London",
    lat: 51.5074,
    lng: -0.1278,
    primary: false,
    size: 3.2,
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
    size: 4.0,
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
    size: 3.6,
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
    size: 3.6,
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
    size: 3.0,
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
    size: 3.2,
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
  { from: 0, to: 1, lift: 1.25, color: "rgba(0, 229, 160, " },   // London ↔ Istanbul (Intercontinental)
  { from: 1, to: 3, lift: 1.12, color: "rgba(255, 204, 0, " },  // Istanbul ↔ Ankara (National Core)
  { from: 3, to: 2, lift: 1.12, color: "rgba(6, 182, 212, " },   // Ankara ↔ Trabzon (Black Sea)
  { from: 3, to: 4, lift: 1.12, color: "rgba(255, 204, 0, " },  // Ankara ↔ Gaziantep (South-East)
  { from: 1, to: 5, lift: 1.22, color: "rgba(0, 229, 160, " },   // Istanbul ↔ Dubai (Middle East Corridor)
  { from: 5, to: "gateway", lift: 1.25, color: "rgba(6, 182, 212, " }, // Dubai ↔ Global Gateway
];

// Fibonacci Sphere Surface Grid Dots (Telemetry Matrix - Airy distribution)
const TOTAL_SURFACE_DOTS = 130;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const FIBONACCI_DOTS = Array.from({ length: TOTAL_SURFACE_DOTS }, (_, i) => {
  const y = 1 - (i / (TOTAL_SURFACE_DOTS - 1)) * 2;
  const radiusAtY = Math.sqrt(1 - y * y);
  const theta = GOLDEN_ANGLE * i;
  const x = Math.cos(theta) * radiusAtY;
  const z = Math.sin(theta) * radiusAtY;
  return { x, y, z, size: 1.0 };
});

function latLngToUnitVector(lat, lng) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(Math.sin(phi) * Math.cos(theta));
  const z = Math.sin(phi) * Math.sin(theta);
  const y = Math.cos(phi);
  return { x, y, z };
}

const PREPARED_HUBS = CORE_HUBS.map((hub) => ({
  ...hub,
  unit: latLngToUnitVector(hub.lat, hub.lng),
}));

const PREPARED_GATEWAY = {
  unit: latLngToUnitVector(GLOBAL_GATEWAY.lat, GLOBAL_GATEWAY.lng),
};

export default function GlobeAnimation({ className = "" }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let radius = 0;
    let centerX = 0;
    let centerY = 0;

    function resize() {
      if (!container || !canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = container.clientWidth || 320;
      height = container.clientHeight || 280;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      centerX = width / 2;
      centerY = height / 2;
      radius = Math.min(width, height) * 0.38;
    }

    resize();
    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(container);

    let rotation = 0.45;
    let pulseTime = 0;
    const rotationSpeed = 0.0016;
    const axialTilt = 0.20; // ~11.5 degrees planetary axial tilt

    function isReducedMotion() {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function project3D(x, y, z, currentRadius, rot) {
      // Rotation around Y axis
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);
      const rotX = x * cosR + z * sinR;
      const rotZ = -x * sinR + z * cosR;

      // Axial tilt around X axis
      const cosT = Math.cos(axialTilt);
      const sinT = Math.sin(axialTilt);
      const tiltedY = y * cosT - rotZ * sinT;
      const tiltedZ = y * sinT + rotZ * cosT;

      // Subtle perspective projection
      const fov = 3.2;
      const depthFactor = fov / (fov - tiltedZ);
      const projX = centerX + rotX * currentRadius * depthFactor;
      const projY = centerY - tiltedY * currentRadius * depthFactor;

      return {
        screenX: projX,
        screenY: projY,
        depth: tiltedZ,
        visible: tiltedZ > -0.22,
        depthFactor,
      };
    }

    function draw() {
      if (!ctx || width === 0) return;
      ctx.clearRect(0, 0, width, height);

      const motionOk = !isReducedMotion();
      if (motionOk) {
        rotation += rotationSpeed;
        pulseTime += 0.02;
      }

      // 1. Ethereal Radial Ambient Background Glow
      const glowGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.25,
        centerX,
        centerY,
        radius * 1.5
      );
      glowGrad.addColorStop(0, "rgba(255, 204, 0, 0.035)");
      glowGrad.addColorStop(0.4, "rgba(0, 229, 160, 0.025)");
      glowGrad.addColorStop(0.8, "rgba(6, 182, 212, 0.01)");
      glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // 2. Dark Telemetry Sphere Body
      const bodyGrad = ctx.createRadialGradient(
        centerX - radius * 0.3,
        centerY - radius * 0.3,
        radius * 0.1,
        centerX,
        centerY,
        radius
      );
      bodyGrad.addColorStop(0, "rgba(17, 24, 34, 0.94)");
      bodyGrad.addColorStop(0.75, "rgba(9, 13, 19, 0.96)");
      bodyGrad.addColorStop(1, "rgba(6, 8, 12, 0.98)");

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      // 3. Crisp Rim Border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // 4. Subtle Latitude Coordinate Rings
      ctx.lineWidth = 0.5;
      const numLatBands = 6;
      for (let i = 1; i < numLatBands; i++) {
        const latRatio = (i / numLatBands) * 2 - 1;
        const ringRadius = radius * Math.sqrt(1 - latRatio * latRatio);
        const ringY = centerY - latRatio * radius * Math.cos(axialTilt);
        const yRadius = ringRadius * Math.sin(axialTilt) * 0.42;

        ctx.beginPath();
        ctx.ellipse(centerX, ringY, ringRadius, Math.max(1, Math.abs(yRadius)), 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.018)";
        ctx.stroke();
      }

      // 5. Ambient Fibonacci Surface Matrix Dots
      for (let i = 0; i < FIBONACCI_DOTS.length; i++) {
        const dot = FIBONACCI_DOTS[i];
        const proj = project3D(dot.x, dot.y, dot.z, radius, rotation);

        if (proj.visible) {
          const normDepth = Math.max(0, (proj.depth + 0.22) / 1.22);
          const alpha = (0.05 + normDepth * 0.22).toFixed(3);
          const dotSize = Math.max(0.6, dot.size * proj.depthFactor * (0.6 + normDepth * 0.35));

          ctx.beginPath();
          ctx.arc(proj.screenX, proj.screenY, dotSize, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(148, 163, 184, ${alpha})`;
          ctx.fill();
        }
      }

      // 6. Project Anchor Hubs & Gateway
      const projectedHubs = PREPARED_HUBS.map((hub) => {
        const proj = project3D(hub.unit.x, hub.unit.y, hub.unit.z, radius, rotation);
        return { ...hub, proj };
      });

      const projectedGateway = {
        unit: PREPARED_GATEWAY.unit,
        proj: project3D(PREPARED_GATEWAY.unit.x, PREPARED_GATEWAY.unit.y, PREPARED_GATEWAY.unit.z, radius, rotation),
      };

      // 7. Render Streamlined Geodesic Arcs
      TELEMETRY_CORRIDORS.forEach((corridor, idx) => {
        const hA = projectedHubs[corridor.from];
        const hB = corridor.to === "gateway" ? projectedGateway : projectedHubs[corridor.to];

        if (!hA || !hB) return;
        if (!hA.proj.visible && !hB.proj.visible) return;

        const pA = hA.proj;
        const pB = hB.proj;

        // Elevated 3D midpoint for arc curvature
        const midUnitX = (hA.unit.x + hB.unit.x) * 0.5;
        const midUnitY = (hA.unit.y + hB.unit.y) * 0.5;
        const midUnitZ = (hA.unit.z + hB.unit.z) * 0.5;
        const len = Math.sqrt(midUnitX * midUnitX + midUnitY * midUnitY + midUnitZ * midUnitZ) || 1;
        const lift = corridor.lift || 1.15;
        const arcX = (midUnitX / len) * lift;
        const arcY = (midUnitY / len) * lift;
        const arcZ = (midUnitZ / len) * lift;

        const pMid = project3D(arcX, arcY, arcZ, radius, rotation);

        const avgDepth = (pA.depth + pB.depth + pMid.depth) / 3;
        const depthAlpha = Math.max(0.04, (avgDepth + 0.3) / 1.3);
        const strokeAlpha = (depthAlpha * 0.5).toFixed(3);

        ctx.beginPath();
        ctx.moveTo(pA.screenX, pA.screenY);
        ctx.quadraticCurveTo(pMid.screenX, pMid.screenY, pB.screenX, pB.screenY);
        ctx.strokeStyle = `${corridor.color}${strokeAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Traveling telemetry pulse packet
        if (motionOk && avgDepth > -0.05) {
          const t = (pulseTime * 0.35 + idx * 0.16) % 1;
          const it = 1 - t;
          const px = it * it * pA.screenX + 2 * it * t * pMid.screenX + t * t * pB.screenX;
          const py = it * it * pA.screenY + 2 * it * t * pMid.screenY + t * t * pB.screenY;

          ctx.beginPath();
          ctx.arc(px, py, 1.6 * pMid.depthFactor, 0, Math.PI * 2);
          ctx.fillStyle = `${corridor.color}${(0.8 * depthAlpha).toFixed(2)})`;
          ctx.shadowColor = `${corridor.color}0.7)`;
          ctx.shadowBlur = 4;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // 8. Render 6 Core Logistics Hubs with Directional Non-Overlapping Labels
      projectedHubs.forEach((hub, i) => {
        if (!hub.proj.visible) return;

        const { screenX, screenY, depth, depthFactor } = hub.proj;
        const normDepth = Math.max(0, (depth + 0.22) / 1.22);
        const nodeSize = hub.size * depthFactor * (0.75 + normDepth * 0.35);

        // Halo / pulsating ring on primary hubs (Istanbul, Trabzon, Ankara)
        if (hub.primary && motionOk && depth > 0) {
          const pulseRadius = nodeSize + 3.5 + Math.sin(pulseTime * 1.5 + i) * 2.5;
          ctx.beginPath();
          ctx.arc(screenX, screenY, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 204, 0, ${(0.22 * normDepth).toFixed(2)})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }

        // Inner glowing core
        ctx.beginPath();
        ctx.arc(screenX, screenY, nodeSize, 0, Math.PI * 2);
        ctx.fillStyle = hub.primary
          ? `rgba(255, 204, 0, ${(0.95 * normDepth).toFixed(2)})`
          : `rgba(0, 229, 160, ${(0.85 * normDepth).toFixed(2)})`;
        ctx.shadowColor = hub.primary ? "rgba(255, 204, 0, 0.5)" : "rgba(0, 229, 160, 0.4)";
        ctx.shadowBlur = hub.primary ? 5 : 3;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Directional Label Rendering (Guaranteed Zero Collision)
        if (depth > 0.05) {
          const labelAlpha = (0.9 * normDepth).toFixed(2);
          ctx.font = hub.primary
            ? "600 10px Inter, -apple-system, BlinkMacSystemFont, sans-serif"
            : "500 9px Inter, -apple-system, BlinkMacSystemFont, sans-serif";

          ctx.textAlign = hub.labelAlign || "left";
          ctx.textBaseline = hub.labelBaseline || "middle";

          const labelX = screenX + (hub.dx || 7);
          const labelY = screenY + (hub.dy || 0);

          // Subtle dark halo under text for maximum contrast against telemetry arcs
          ctx.strokeStyle = "rgba(7, 9, 13, 0.75)";
          ctx.lineWidth = 2.5;
          ctx.strokeText(hub.name, labelX, labelY);

          ctx.fillStyle = hub.primary
            ? `rgba(255, 255, 255, ${labelAlpha})`
            : `rgba(203, 213, 225, ${labelAlpha})`;
          ctx.fillText(hub.name, labelX, labelY);
        }
      });

      frameRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center ${className}`}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="block pointer-events-none" />

      {/* Refined Telemetry Header Badge */}
      <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-white/8 bg-black/40 px-3 py-1 backdrop-blur-md">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00E5A0] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00E5A0]" />
        </span>
        <span className="text-[9px] font-black uppercase tracking-[0.22em] text-[#9AA7B5]">
          CANLI AĞ <span className="text-white/20">·</span> Küresel Lojistik Ağı
        </span>
      </div>
    </div>
  );
}
