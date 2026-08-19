"use client";

import { useEffect, useRef } from "react";

/**
 * TORK Global Logistics Intelligence Network (Conceptual Visualization)
 *
 * MİMARİ VE PRENSİP:
 * - Nokta ve yay konumları gerçek harita projeksiyonu veya operasyonel coğrafi koordinat DEĞİLDİR.
 * - Küre yüzeyine 360° dengeli biçimde dağıtılmış deterministik stilize ağ düğümleridir (Network Nodes).
 * - Dünya çevresinde 3D dönme ve veri akışı hissi sağlayan kavramsal bir lojistik zeka vizüalizasyonudur.
 */

// Stylized Global Network Nodes (Evenly and aesthetically distributed across 360° spherical coordinates)
const CONCEPT_NETWORK_NODES = [
  {
    id: "node-ist",
    name: "Istanbul",
    theta: 0.00,
    phi: 0.32,
    isPrimary: true,
    size: 3.4,
    labelAlign: "right",
    labelBaseline: "bottom",
    dx: -7,
    dy: -5,
  },
  {
    id: "node-ank",
    name: "Ankara",
    theta: 0.25,
    phi: 0.25,
    isPrimary: true,
    size: 3.0,
    labelAlign: "left",
    labelBaseline: "top",
    dx: 7,
    dy: 5,
  },
  {
    id: "node-tzx",
    name: "Trabzon",
    theta: 0.45,
    phi: 0.42,
    isPrimary: false,
    size: 2.5,
    labelAlign: "left",
    labelBaseline: "bottom",
    dx: 7,
    dy: -5,
  },
  {
    id: "node-lon",
    name: "London",
    theta: -0.60,
    phi: 0.58,
    isPrimary: false,
    size: 2.6,
    labelAlign: "right",
    labelBaseline: "bottom",
    dx: -7,
    dy: -5,
  },
  {
    id: "node-fra",
    name: "Frankfurt",
    theta: -0.30,
    phi: 0.62,
    isPrimary: false,
    size: 2.5,
    labelAlign: "left",
    labelBaseline: "bottom",
    dx: 7,
    dy: -5,
  },
  {
    id: "node-rot",
    name: "Rotterdam",
    theta: -0.45,
    phi: 0.72,
    isPrimary: false,
    size: 2.4,
    labelAlign: "right",
    labelBaseline: "top",
    dx: -7,
    dy: 5,
  },
  {
    id: "node-nyc",
    name: "New York",
    theta: -1.55,
    phi: 0.38,
    isPrimary: true,
    size: 3.2,
    labelAlign: "right",
    labelBaseline: "bottom",
    dx: -7,
    dy: -5,
  },
  {
    id: "node-tor",
    name: "Toronto",
    theta: -1.90,
    phi: 0.52,
    isPrimary: false,
    size: 2.5,
    labelAlign: "right",
    labelBaseline: "top",
    dx: -7,
    dy: 5,
  },
  {
    id: "node-sao",
    name: "São Paulo",
    theta: -1.15,
    phi: -0.42,
    isPrimary: false,
    size: 2.8,
    labelAlign: "left",
    labelBaseline: "top",
    dx: 7,
    dy: 5,
  },
  {
    id: "node-dxb",
    name: "Dubai",
    theta: 0.75,
    phi: 0.20,
    isPrimary: true,
    size: 3.0,
    labelAlign: "left",
    labelBaseline: "middle",
    dx: 7,
    dy: 0,
  },
  {
    id: "node-doh",
    name: "Doha",
    theta: 0.95,
    phi: 0.12,
    isPrimary: false,
    size: 2.3,
    labelAlign: "left",
    labelBaseline: "top",
    dx: 7,
    dy: 5,
  },
  {
    id: "node-sin",
    name: "Singapore",
    theta: 1.65,
    phi: 0.02,
    isPrimary: true,
    size: 3.1,
    labelAlign: "left",
    labelBaseline: "middle",
    dx: 7,
    dy: 0,
  },
  {
    id: "node-tyo",
    name: "Tokyo",
    theta: 2.40,
    phi: 0.36,
    isPrimary: true,
    size: 3.2,
    labelAlign: "left",
    labelBaseline: "bottom",
    dx: 7,
    dy: -5,
  },
  {
    id: "node-sel",
    name: "Seoul",
    theta: 2.10,
    phi: 0.48,
    isPrimary: false,
    size: 2.5,
    labelAlign: "right",
    labelBaseline: "bottom",
    dx: -7,
    dy: -5,
  },
  {
    id: "node-syd",
    name: "Sydney",
    theta: 2.75,
    phi: -0.48,
    isPrimary: false,
    size: 2.7,
    labelAlign: "left",
    labelBaseline: "top",
    dx: 7,
    dy: 5,
  },
];

// Conceptual Telemetry Network Arcs (Global data corridors)
const NETWORK_CORRIDORS = [
  { from: 6, to: 3, lift: 1.25, alpha: 0.18, hasPacket: true },   // New York ↔ London
  { from: 3, to: 4, lift: 1.10, alpha: 0.16, hasPacket: false },  // London ↔ Frankfurt
  { from: 4, to: 0, lift: 1.16, alpha: 0.22, hasPacket: true },   // Frankfurt ↔ Istanbul
  { from: 0, to: 1, lift: 1.08, alpha: 0.28, hasPacket: true },   // Istanbul ↔ Ankara
  { from: 1, to: 2, lift: 1.08, alpha: 0.18, hasPacket: false },  // Ankara ↔ Trabzon
  { from: 0, to: 9, lift: 1.18, alpha: 0.22, hasPacket: true },   // Istanbul ↔ Dubai
  { from: 9, to: 11, lift: 1.25, alpha: 0.18, hasPacket: true },  // Dubai ↔ Singapore
  { from: 11, to: 12, lift: 1.22, alpha: 0.20, hasPacket: true }, // Singapore ↔ Tokyo
  { from: 12, to: 13, lift: 1.10, alpha: 0.16, hasPacket: false },// Tokyo ↔ Seoul
  { from: 6, to: 8, lift: 1.22, alpha: 0.16, hasPacket: false },  // New York ↔ São Paulo
  { from: 11, to: 14, lift: 1.22, alpha: 0.16, hasPacket: false },// Singapore ↔ Sydney
  { from: 6, to: 7, lift: 1.08, alpha: 0.14, hasPacket: false },  // New York ↔ Toronto
  { from: 9, to: 10, lift: 1.06, alpha: 0.14, hasPacket: false }, // Dubai ↔ Doha
  { from: 4, to: 5, lift: 1.06, alpha: 0.14, hasPacket: false },  // Frankfurt ↔ Rotterdam
];

// Rich Fibonacci Surface Matrix (160 ambient nodes for enhanced globe density & texture)
const TOTAL_SURFACE_DOTS = 160;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export default function GlobeAnimation({ className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let rotationAngle = -0.30;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // Pre-calculate 160 surface dots (Uniform Fibonacci Sphere)
    const surfaceDots = [];
    for (let i = 0; i < TOTAL_SURFACE_DOTS; i++) {
      const y = 1 - (i / (TOTAL_SURFACE_DOTS - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = GOLDEN_ANGLE * i;
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;
      surfaceDots.push({ x, y, z });
    }

    // Convert spherical angles to 3D Unit Vector
    const sphericalToVector = (theta, phi) => {
      const cosPhi = Math.cos(phi);
      return {
        x: Math.sin(theta) * cosPhi,
        y: Math.sin(phi),
        z: Math.cos(theta) * cosPhi,
      };
    };

    const nodeVectors = CONCEPT_NETWORK_NODES.map((node) => ({
      ...node,
      vec: sphericalToVector(node.theta, node.phi),
    }));

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

      const radius = Math.min(width, height) * 0.42;
      const cx = width / 2;
      const cy = height / 2;
      const isMobile = width < 380;

      ctx.clearRect(0, 0, width, height);

      // Smooth steady rotation around Y axis
      rotationAngle += 0.0010;

      const cosRot = Math.cos(rotationAngle);
      const sinRot = Math.sin(rotationAngle);

      const project = (v) => {
        const rx = v.x * cosRot - v.z * sinRot;
        const rz = v.x * sinRot + v.z * cosRot;
        return {
          x: cx + rx * radius,
          y: cy - v.y * radius,
          z: rz,
          visible: rz > -0.18,
        };
      };

      // 1. Soft Atmospheric Halo
      const haloGrad = ctx.createRadialGradient(cx, cy, radius * 0.65, cx, cy, radius * 1.18);
      haloGrad.addColorStop(0, "rgba(0, 229, 160, 0.038)");
      haloGrad.addColorStop(0.55, "rgba(0, 229, 160, 0.010)");
      haloGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.18, 0, Math.PI * 2);
      ctx.fill();

      // 2. Conceptual Latitude / Orbital Rings (Subtle grid texture)
      const ringLatitudes = [0, 0.45, -0.45];
      ringLatitudes.forEach((lat) => {
        const rRing = Math.cos(lat) * radius;
        const yRing = cy - Math.sin(lat) * radius;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.ellipse(cx, yRing, rRing, rRing * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 3. Base Sphere Outline
      ctx.strokeStyle = "rgba(255, 255, 255, 0.045)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // 4. Render Rich Surface Background Matrix Dots (160 Points)
      surfaceDots.forEach((dot) => {
        const p = project(dot);
        if (p.z > -0.25) {
          // Foreground dots are crisp and subtle; background dots fade smoothly
          const alpha = p.z > 0 ? 0.045 + p.z * 0.095 : 0.018;
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.z > 0 ? 0.95 : 0.65, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 5. Render Conceptual Network Corridors (Data Arcs)
      NETWORK_CORRIDORS.forEach((corridor, idx) => {
        const fromNode = nodeVectors[corridor.from];
        const toNode = nodeVectors[corridor.to];

        if (!fromNode || !toNode) return;

        const v1 = fromNode.vec;
        const v2 = toNode.vec;

        const p1 = project(v1);
        const p2 = project(v2);

        if (p1.z > -0.22 || p2.z > -0.22) {
          const numSteps = 24;
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

          const arcAlpha = Math.max(0.03, Math.min(0.22, (p1.z + p2.z) * 0.16 + corridor.alpha * 0.35));
          ctx.strokeStyle = `rgba(0, 229, 160, ${arcAlpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Smooth packet pulse along active corridors
          if (corridor.hasPacket) {
            const packetProgress = (elapsed * 0.14 + idx * 0.28) % 1;
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
              ctx.arc(packetPos.x, packetPos.y, 1.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.shadowBlur = 0;
            }
          }
        }
      });

      // 6. Render Distinct City Nodes & Collision-Free Labels
      ctx.font = "500 9.5px -apple-system, BlinkMacSystemFont, 'Geist', 'Inter', sans-serif";

      // Project all nodes and sort by depth
      const renderedNodes = nodeVectors.map((node) => ({
        ...node,
        projected: project(node.vec),
      })).filter((n) => n.projected.visible);

      const placedLabels = [];

      renderedNodes.forEach((node) => {
        const p = node.projected;
        const depthScale = Math.max(0.65, (p.z + 1) / 2);
        const size = node.size * depthScale;

        // Pulse halo on primary network nodes
        if (node.isPrimary) {
          const pulse = (Math.sin(elapsed * 2.2 + node.theta * 2.0) + 1) / 2;
          ctx.strokeStyle = `rgba(0, 229, 160, ${0.22 * (1 - pulse)})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size + 1.2 + pulse * 3.2, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Node Center Core (Vibrant emerald, distinctly brighter than surface background)
        const nodeAlpha = node.isPrimary ? 0.90 : 0.50;
        ctx.fillStyle = `rgba(0, 229, 160, ${nodeAlpha})`;
        ctx.shadowColor = "rgba(0, 229, 160, 0.45)";
        ctx.shadowBlur = node.isPrimary ? 4 : 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Inner Dark Focal Core
        ctx.fillStyle = "#060B11";
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 0.35, 0, Math.PI * 2);
        ctx.fill();

        // Label collision avoidance & depth threshold
        const labelX = p.x + node.dx;
        const labelY = p.y + node.dy;
        const textWidth = ctx.measureText(node.name).width;
        const box = {
          left: node.labelAlign === "right" ? labelX - textWidth : labelX,
          right: node.labelAlign === "right" ? labelX : labelX + textWidth,
          top: labelY - 7,
          bottom: labelY + 7,
        };

        const hasOverlap = placedLabels.some((l) =>
          !(box.right < l.left - 4 || box.left > l.right + 4 || box.bottom < l.top - 2 || box.top > l.bottom + 2)
        );

        const shouldRenderLabel = (!isMobile || node.isPrimary) && p.z > 0.12 && (!hasOverlap || node.isPrimary);

        if (shouldRenderLabel) {
          placedLabels.push(box);
          const textAlpha = Math.min(0.85, (p.z - 0.08) * 1.7);
          ctx.fillStyle = node.isPrimary
            ? `rgba(245, 247, 250, ${textAlpha})`
            : `rgba(140, 152, 168, ${textAlpha * 0.85})`;
          ctx.textAlign = node.labelAlign;
          ctx.textBaseline = node.labelBaseline;
          ctx.fillText(node.name, labelX, labelY);
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
      {/* Background Ambient Radial Glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center opacity-20">
        <div className="h-[280px] w-[280px] sm:h-[360px] sm:w-[360px] rounded-full border border-white/[0.03] bg-[radial-gradient(circle,rgba(0,229,160,0.03)_0%,transparent_70%)]" />
      </div>

      <canvas
        ref={canvasRef}
        className="h-full w-full max-h-[340px] max-w-[340px] sm:max-h-[380px] sm:max-w-[380px]"
      />
    </div>
  );
}
