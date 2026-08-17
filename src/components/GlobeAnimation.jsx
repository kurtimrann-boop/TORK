"use client";

import { useEffect, useRef } from "react";

const CITIES = [
  { name: "İstanbul", lat: 41.0082, lng: 28.9784 },
  { name: "Ankara", lat: 39.9334, lng: 32.8597 },
  { name: "İzmir", lat: 38.4192, lng: 27.1287 },
  { name: "Trabzon", lat: 40.9167, lng: 39.7167 },
  { name: "Gaziantep", lat: 37.0662, lng: 37.3833 },
  { name: "Londra", lat: 51.5074, lng: -0.1278 },
  { name: "Dubai", lat: 25.2048, lng: 55.2708 },
  { name: "Berlin", lat: 52.5200, lng: 13.4050 },
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
    const radius = Math.min(width, height) * 0.35;
    const rotationSpeed = 0.002;

    let rotation = 0;
    let pulse = 0;

    function isReducedMotion() {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      const motionOk = !isReducedMotion();
      if (motionOk) {
        rotation += rotationSpeed;
        pulse += 0.015;
      }

      const glowAlpha = motionOk ? 0.08 + Math.sin(pulse) * 0.03 : 0.08;

      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.2,
        centerX,
        centerY,
        radius * 1.3
      );
      gradient.addColorStop(0, `rgba(0, 229, 160, ${glowAlpha})`);
      gradient.addColorStop(0.6, `rgba(6, 182, 212, ${glowAlpha * 0.4})`);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(11, 17, 26, 0.9)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      ctx.stroke();

      for (let i = 0; i < 24; i++) {
        const lat = (i * 15 - 90) * (Math.PI / 180);
        ctx.beginPath();
        const r = radius * Math.sin(lat);
        const y = centerY - radius * Math.cos(lat);
        ctx.ellipse(centerX, y, Math.abs(r), Math.abs(r * 0.15), 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
        ctx.stroke();
      }

      for (let i = 0; i < 24; i++) {
        const lng = i * 15 + rotation * (180 / Math.PI);
        ctx.beginPath();
        const x = centerX + radius * Math.cos(lng * Math.PI / 180);
        ctx.arc(x, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
        ctx.stroke();
      }

      const visibleCities = CITIES.map((city) => {
        const pos = latLngToVector3(city.lat, city.lng, radius);
        const rotated = {
          x: pos.x * Math.cos(rotation) - pos.z * Math.sin(rotation),
          y: pos.y,
          z: pos.x * Math.sin(rotation) + pos.z * Math.cos(rotation),
        };
        return { ...city, pos: rotated, visible: rotated.z > -radius * 0.15 };
      });

      const connections = [];
      for (let i = 0; i < visibleCities.length; i++) {
        for (let j = i + 1; j < visibleCities.length; j++) {
          const a = visibleCities[i];
          const b = visibleCities[j];
          if (a.visible && b.visible) {
            connections.push([a, b]);
          }
        }
      }

      connections.slice(0, 6).forEach(([a, b]) => {
        const ax = centerX + a.pos.x;
        const ay = centerY + a.pos.y;
        const bx = centerX + b.pos.x;
        const by = centerY + b.pos.y;

        const midX = (ax + bx) / 2;
        const midY = (ay + by) / 2 - 30;

        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(midX, midY, bx, by);
        ctx.strokeStyle = "rgba(0, 229, 160, 0.08)";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      visibleCities.forEach((city) => {
        const x = centerX + city.pos.x;
        const y = centerY + city.pos.y;

        const dotRadius = city.name === "İstanbul" || city.name === "Ankara" ? 3 : 2;
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = city.name === "İstanbul" || city.name === "Ankara"
          ? "rgba(0, 229, 160, 0.9)"
          : "rgba(6, 182, 212, 0.7)";
        ctx.fill();

        if (motionOk && city.visible) {
          ctx.beginPath();
          ctx.arc(x, y, dotRadius + 4 + Math.sin(pulse + city.lat) * 2, 0, Math.PI * 2);
          ctx.strokeStyle = city.name === "İstanbul" || city.name === "Ankara"
            ? "rgba(0, 229, 160, 0.15)"
            : "rgba(6, 182, 212, 0.1)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        if (city.name === "İstanbul" || city.name === "Ankara" || city.name === "İzmir") {
          ctx.fillStyle = "rgba(245, 247, 250, 0.8)";
          ctx.font = "10px Inter, ui-sans-serif, system-ui, sans-serif";
          ctx.fillText(city.name, x + 8, y + 3);
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
