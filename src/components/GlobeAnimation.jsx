"use client";

import { useEffect, useRef } from "react";

const NODES = [
  { name: "İstanbul", lat: 41.0082, lng: 28.9784, size: 3.5 },
  { name: "Ankara", lat: 39.9334, lng: 32.8597, size: 3.2 },
  { name: "İzmir", lat: 38.4192, lng: 27.1287, size: 2.8 },
  { name: "Trabzon", lat: 40.9167, lng: 39.7167, size: 2.4 },
  { name: "Gaziantep", lat: 37.0662, lng: 37.3833, size: 2.4 },
  { name: "Antalya", lat: 36.8969, lng: 30.7133, size: 2.2 },
  { name: "Londra", lat: 51.5074, lng: -0.1278, size: 2.6 },
  { name: "Dubai", lat: 25.2048, lng: 55.2708, size: 2.6 },
  { name: "Berlin", lat: 52.5200, lng: 13.4050, size: 2.4 },
  { name: "Şangay", lat: 31.2304, lng: 121.4737, size: 2.6 },
];

const ARCS = [
  [0, 1],
  [0, 2],
  [1, 3],
  [1, 4],
  [2, 5],
  [6, 0],
  [7, 4],
  [8, 1],
  [9, 0],
  [2, 7],
];

function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return { x, y, z };
}

export default function GlobeAnimation({ className = "" }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const width = container.clientWidth;
    const height = container.clientHeight || 400;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.32;
    const rotationSpeed = 0.0015;

    let rotation = 0;
    let pulse = 0;
    let arcProgress = 0;

    function isReducedMotion() {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      const motionOk = !isReducedMotion();
      if (motionOk) {
        rotation += rotationSpeed;
        pulse += 0.012;
        arcProgress += 0.004;
      }

      // Subtle outer glow
      const glowAlpha = motionOk ? 0.06 + Math.sin(pulse) * 0.02 : 0.05;
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.1,
        centerX,
        centerY,
        radius * 1.6
      );
      gradient.addColorStop(0, `rgba(0, 229, 160, ${glowAlpha})`);
      gradient.addColorStop(0.5, `rgba(6, 182, 212, ${glowAlpha * 0.3})`);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Globe base
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(11, 17, 26, 0.92)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Latitude lines - thinner and more elegant
      ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 18; i++) {
        const lat = (i * 10 - 90) * (Math.PI / 180);
        ctx.beginPath();
        const r = radius * Math.sin(lat);
        const y = centerY - radius * Math.cos(lat);
        ctx.ellipse(centerX, y, Math.abs(r), Math.abs(r * 0.12), 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Longitude lines
      for (let i = 0; i < 18; i++) {
        const lng = i * 20 + rotation * (180 / Math.PI);
        ctx.beginPath();
        const x = centerX + radius * Math.cos(lng * Math.PI / 180);
        ctx.arc(x, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Calculate node positions
      const visibleNodes = NODES.map((node) => {
        const pos = latLngToVector3(node.lat, node.lng, radius);
        const rotated = {
          x: pos.x * Math.cos(rotation) - pos.z * Math.sin(rotation),
          y: pos.y,
          z: pos.x * Math.sin(rotation) + pos.z * Math.cos(rotation),
        };
        return { ...node, pos: rotated, visible: rotated.z > -radius * 0.2 };
      });

      // Draw arcs between connected nodes
      ARCS.forEach(([fromIdx, toIdx], idx) => {
        const a = visibleNodes[fromIdx];
        const b = visibleNodes[toIdx];
        if (!a.visible || !b.visible) return;

        const ax = centerX + a.pos.x;
        const ay = centerY + a.pos.y;
        const bx = centerX + b.pos.x;
        const by = centerY + b.pos.y;

        const dist = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
        const midX = (ax + bx) / 2;
        const midY = (ay + by) / 2 - dist * 0.25;

        const arcAlpha = motionOk ? 0.06 + Math.sin(arcProgress + idx) * 0.03 : 0.04;

        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(midX, midY, bx, by);
        ctx.strokeStyle = `rgba(0, 229, 160, ${arcAlpha})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Moving dot along arc
        if (motionOk) {
          const t = (arcProgress + idx * 0.5) % 1;
          const dotX = (1 - t) * (1 - t) * ax + 2 * (1 - t) * t * midX + t * t * bx;
          const dotY = (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * midY + t * t * by;

          ctx.beginPath();
          ctx.arc(dotX, dotY, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 229, 160, ${0.5 + Math.sin(arcProgress + idx) * 0.2})`;
          ctx.fill();
        }
      });

      // Draw nodes
      visibleNodes.forEach((node) => {
        const x = centerX + node.pos.x;
        const y = centerY + node.pos.y;

        // Node glow
        if (motionOk) {
          ctx.beginPath();
          ctx.arc(x, y, node.size + 3 + Math.sin(pulse + node.lat) * 1.5, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(0, 229, 160, 0.06)";
          ctx.fill();
        }

        // Node dot
        ctx.beginPath();
        ctx.arc(x, y, node.size, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 229, 160, 0.85)";
        ctx.fill();

        // Label for major nodes
        if (node.size >= 3) {
          ctx.fillStyle = "rgba(245, 247, 250, 0.7)";
          ctx.font = "9px Inter, ui-sans-serif, system-ui, sans-serif";
          ctx.fillText(node.name, x + node.size + 4, y + 3);
        }
      });

      frameRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="tork-eyebrow mb-2">Canlı Ağ</div>
          <div className="text-xs font-bold text-[#9AA7B5]">
            Küresel Lojistik Ağı
          </div>
        </div>
      </div>
    </div>
  );
}
