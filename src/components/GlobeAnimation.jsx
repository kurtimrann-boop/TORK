"use client";

import { useEffect, useRef } from "react";

// Major Logistics Hubs
const ANCHOR_HUBS = [
  { name: "İstanbul", lat: 41.0082, lng: 28.9784, primary: true, size: 3.8 },
  { name: "Ankara", lat: 39.9334, lng: 32.8597, primary: true, size: 3.4 },
  { name: "İzmir", lat: 38.4192, lng: 27.1287, primary: false, size: 2.8 },
  { name: "Trabzon", lat: 40.9167, lng: 39.7167, primary: true, size: 3.0 },
  { name: "Gaziantep", lat: 37.0662, lng: 37.3833, primary: false, size: 2.8 },
  { name: "Antalya", lat: 36.8969, lng: 30.7133, primary: false, size: 2.6 },
  { name: "Londra", lat: 51.5074, lng: -0.1278, primary: false, size: 2.8 },
  { name: "Dubai", lat: 25.2048, lng: 55.2708, primary: false, size: 2.8 },
  { name: "Berlin", lat: 52.5200, lng: 13.4050, primary: false, size: 2.8 },
  { name: "Şangay", lat: 31.2304, lng: 121.4737, primary: false, size: 2.8 },
];

// Telemetry Logistics Routes
const TELEMETRY_ROUTES = [
  { from: 0, to: 1, color: "rgba(255, 204, 0, " }, // Istanbul -> Ankara (Yellow)
  { from: 0, to: 2, color: "rgba(0, 229, 160, " },  // Istanbul -> Izmir (Emerald)
  { from: 1, to: 3, color: "rgba(6, 182, 212, " },  // Ankara -> Trabzon (Cyan)
  { from: 1, to: 4, color: "rgba(255, 204, 0, " }, // Ankara -> Gaziantep
  { from: 2, to: 5, color: "rgba(0, 229, 160, " },  // Izmir -> Antalya
  { from: 6, to: 0, color: "rgba(0, 229, 160, " },  // London -> Istanbul
  { from: 8, to: 0, color: "rgba(6, 182, 212, " },  // Berlin -> Istanbul
  { from: 0, to: 7, color: "rgba(255, 204, 0, " }, // Istanbul -> Dubai
  { from: 7, to: 9, color: "rgba(6, 182, 212, " },  // Dubai -> Shanghai
  { from: 3, to: 0, color: "rgba(255, 204, 0, " }, // Trabzon -> Istanbul
];

// Mathematical Fibonacci Sphere Dot Distribution
const TOTAL_SURFACE_DOTS = 180;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const FIBONACCI_DOTS = Array.from({ length: TOTAL_SURFACE_DOTS }, (_, i) => {
  const y = 1 - (i / (TOTAL_SURFACE_DOTS - 1)) * 2; // y goes from 1 to -1
  const radiusAtY = Math.sqrt(1 - y * y);
  const theta = GOLDEN_ANGLE * i;
  const x = Math.cos(theta) * radiusAtY;
  const z = Math.sin(theta) * radiusAtY;
  return { x, y, z, size: 1.1 };
});

function latLngToUnitVector(lat, lng) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(Math.sin(phi) * Math.cos(theta));
  const z = Math.sin(phi) * Math.sin(theta);
  const y = Math.cos(phi);
  return { x, y, z };
}

const PREPARED_HUBS = ANCHOR_HUBS.map((hub) => {
  const unit = latLngToUnitVector(hub.lat, hub.lng);
  return { ...hub, unit };
});

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

    let rotation = 0.4;
    let pulseTime = 0;
    const rotationSpeed = 0.0018;
    const axialTilt = 0.22; // ~12.6 degrees axial tilt

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
        depth: tiltedZ, // -1 to 1
        visible: tiltedZ > -0.25,
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

      // 1. Atmosphere / Outer Radial Glow
      const glowGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.3,
        centerX,
        centerY,
        radius * 1.55
      );
      glowGrad.addColorStop(0, "rgba(255, 204, 0, 0.04)");
      glowGrad.addColorStop(0.45, "rgba(0, 229, 160, 0.03)");
      glowGrad.addColorStop(0.85, "rgba(6, 182, 212, 0.015)");
      glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // 2. Dark Sphere Body
      const bodyGrad = ctx.createRadialGradient(
        centerX - radius * 0.3,
        centerY - radius * 0.3,
        radius * 0.1,
        centerX,
        centerY,
        radius
      );
      bodyGrad.addColorStop(0, "rgba(18, 25, 36, 0.95)");
      bodyGrad.addColorStop(0.7, "rgba(10, 14, 21, 0.96)");
      bodyGrad.addColorStop(1, "rgba(6, 9, 14, 0.98)");

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      // 3. Fine Rim Border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // 4. Subtle Latitude & Longitude Coordinate Lines
      ctx.lineWidth = 0.5;
      const numLatBands = 7;
      for (let i = 1; i < numLatBands; i++) {
        const latRatio = (i / numLatBands) * 2 - 1; // -1 to 1
        const ringRadius = radius * Math.sqrt(1 - latRatio * latRatio);
        const ringY = centerY - latRatio * radius * Math.cos(axialTilt);
        const yRadius = ringRadius * Math.sin(axialTilt) * 0.45;

        ctx.beginPath();
        ctx.ellipse(centerX, ringY, ringRadius, Math.max(1, Math.abs(yRadius)), 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.022)";
        ctx.stroke();
      }

      // 5. Fibonacci Surface Grid Dots (Telemetry Matrix)
      for (let i = 0; i < FIBONACCI_DOTS.length; i++) {
        const dot = FIBONACCI_DOTS[i];
        const proj = project3D(dot.x, dot.y, dot.z, radius, rotation);

        if (proj.visible) {
          // Normalize alpha based on depth (front is bright, edges fade)
          const normDepth = Math.max(0, (proj.depth + 0.25) / 1.25);
          const alpha = (0.08 + normDepth * 0.35).toFixed(3);
          const dotSize = Math.max(0.6, dot.size * proj.depthFactor * (0.6 + normDepth * 0.4));

          ctx.beginPath();
          ctx.arc(proj.screenX, proj.screenY, dotSize, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(148, 163, 184, ${alpha})`;
          ctx.fill();
        }
      }

      // 6. Project Anchor Hubs
      const projectedHubs = PREPARED_HUBS.map((hub) => {
        const proj = project3D(hub.unit.x, hub.unit.y, hub.unit.z, radius, rotation);
        return { ...hub, proj };
      });

      // 7. Render Telemetry Great-Circle Arcs
      TELEMETRY_ROUTES.forEach((route, idx) => {
        const hA = projectedHubs[route.from];
        const hB = projectedHubs[route.to];

        if (!hA || !hB) return;
        // Draw arc if at least one node is in front or partially visible
        if (!hA.proj.visible && !hB.proj.visible) return;

        const pA = hA.proj;
        const pB = hB.proj;

        // Calculate 3D mid-point lifted above surface for arching effect
        const midUnitX = (hA.unit.x + hB.unit.x) * 0.5;
        const midUnitY = (hA.unit.y + hB.unit.y) * 0.5;
        const midUnitZ = (hA.unit.z + hB.unit.z) * 0.5;
        const len = Math.sqrt(midUnitX * midUnitX + midUnitY * midUnitY + midUnitZ * midUnitZ) || 1;
        const lift = 1.18; // 18% arc elevation above sphere surface
        const arcX = (midUnitX / len) * lift;
        const arcY = (midUnitY / len) * lift;
        const arcZ = (midUnitZ / len) * lift;

        const pMid = project3D(arcX, arcY, arcZ, radius, rotation);

        const avgDepth = (pA.depth + pB.depth + pMid.depth) / 3;
        const depthAlpha = Math.max(0.04, (avgDepth + 0.3) / 1.3);
        const strokeAlpha = (depthAlpha * 0.55).toFixed(3);

        ctx.beginPath();
        ctx.moveTo(pA.screenX, pA.screenY);
        ctx.quadraticCurveTo(pMid.screenX, pMid.screenY, pB.screenX, pB.screenY);
        ctx.strokeStyle = `${route.color}${strokeAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Animated telemetry pulse particle traveling on the arc
        if (motionOk && avgDepth > -0.1) {
          const cycleSpeed = 0.0035;
          const t = (pulseTime * 0.4 + idx * 0.14) % 1;

          // Quadratic Bezier interpolation point
          const it = 1 - t;
          const px = it * it * pA.screenX + 2 * it * t * pMid.screenX + t * t * pB.screenX;
          const py = it * it * pA.screenY + 2 * it * t * pMid.screenY + t * t * pB.screenY;

          // Pulse head
          ctx.beginPath();
          ctx.arc(px, py, 1.8 * pMid.depthFactor, 0, Math.PI * 2);
          ctx.fillStyle = `${route.color}${(0.75 * depthAlpha).toFixed(2)})`;
          ctx.shadowColor = `${route.color}0.8)`;
          ctx.shadowBlur = 4;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // 8. Render Anchor Hub Nodes & Labels
      projectedHubs.forEach((hub, i) => {
        if (!hub.proj.visible) return;

        const { screenX, screenY, depth, depthFactor } = hub.proj;
        const normDepth = Math.max(0, (depth + 0.25) / 1.25);
        const nodeSize = hub.size * depthFactor * (0.7 + normDepth * 0.4);

        // Halo / pulsating ring on primary hubs (e.g. Istanbul, Trabzon, Ankara)
        if (hub.primary && motionOk && depth > 0) {
          const pulseRadius = nodeSize + 4 + Math.sin(pulseTime * 1.5 + i) * 3;
          ctx.beginPath();
          ctx.arc(screenX, screenY, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 204, 0, ${(0.25 * normDepth).toFixed(2)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Inner glowing core
        ctx.beginPath();
        ctx.arc(screenX, screenY, nodeSize, 0, Math.PI * 2);
        ctx.fillStyle = hub.primary
          ? `rgba(255, 204, 0, ${(0.95 * normDepth).toFixed(2)})`
          : `rgba(0, 229, 160, ${(0.85 * normDepth).toFixed(2)})`;
        ctx.shadowColor = hub.primary ? "rgba(255, 204, 0, 0.6)" : "rgba(0, 229, 160, 0.5)";
        ctx.shadowBlur = hub.primary ? 6 : 4;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Clean typography label for major hubs
        if (hub.primary && depth > 0.1) {
          ctx.font = "600 10px Inter, -apple-system, BlinkMacSystemFont, sans-serif";
          ctx.fillStyle = `rgba(248, 250, 252, ${(0.88 * normDepth).toFixed(2)})`;
          ctx.fillText(hub.name, screenX + nodeSize + 5, screenY + 3.5);
        } else if (!hub.primary && depth > 0.35) {
          ctx.font = "500 8.5px Inter, -apple-system, BlinkMacSystemFont, sans-serif";
          ctx.fillStyle = `rgba(148, 163, 184, ${(0.6 * normDepth).toFixed(2)})`;
          ctx.fillText(hub.name, screenX + nodeSize + 4, screenY + 3);
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
