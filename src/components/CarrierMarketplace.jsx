"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import StatusBadge from "./StatusBadge";
import CarrierSmartBiddingWidget from "./CarrierSmartBiddingWidget";
import { formatRelativeTimeTR, formatCurrencyTR } from "../utils/turkish";
import { setRouteDistance, resolveLoadLocations } from "../utils/location";
import { calculateOperatingPricing, evaluateCarrierBid } from "../utils/pricingService";

// Dynamic SSR-safe Leaflet Marketplace Map
const TorkMarketplaceMap = dynamic(() => import("./TorkMarketplaceMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] sm:h-[400px] w-full items-center justify-center rounded-xl border border-[#374151] bg-[#111827] text-sm text-[#A0AEC0]">
      <div className="flex items-center gap-2.5 rounded-lg border border-[#374151] bg-[#1F2937] px-4 py-2 text-xs font-bold text-[#F3F4F6]">
        <span className="h-2 w-2 rounded-full bg-[#F5A400] animate-pulse" />
        Lojistik Pazaryeri Haritası Yükleniyor...
      </div>
    </div>
  ),
});

export default function CarrierMarketplace({
  loads = [],
  carrierBids = [],
  activeTransports = [],
  userDashboard = null,
  onViewLoadDetails = null,
  onSendBid = null,
  loading = false,
}) {
  const [selectedLoadIdState, setSelectedLoadIdState] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [originFilter, setOriginFilter] = useState("");
  const [destinationFilter, setDestinationFilter] = useState("");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("all");
  const [returnLoadOnly, setReturnLoadOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest"); // newest | highest_price | shortest | longest
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeBidLoadId, setActiveBidLoadId] = useState(null);
  const [bidAmount, setBidAmount] = useState("");
  const drawerRef = useRef(null);

  // Derive carrier's last known destination from active transports for return load filtering
  const carrierReturnOrigin = useMemo(() => {
    if (activeTransports && activeTransports.length > 0) {
      const latest = activeTransports[0];
      return latest.destination || latest.load?.destination || null;
    }
    return null;
  }, [activeTransports]);

  const selectedLoad = useMemo(() => {
    if (selectedLoadIdState) {
      const match = loads.find((l) => l.id === selectedLoadIdState);
      if (match) return match;
    }
    return loads[0] || null;
  }, [loads, selectedLoadIdState]);

  // Handle ESC key to close drawer
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && drawerOpen) {
        setDrawerOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen]);

  // Distinct cities for filter dropdowns
  const availableOrigins = useMemo(() => {
    const set = new Set(loads.map((l) => l.origin).filter(Boolean));
    return Array.from(set).sort();
  }, [loads]);

  const availableDestinations = useMemo(() => {
    const set = new Set(loads.map((l) => l.destination).filter(Boolean));
    return Array.from(set).sort();
  }, [loads]);

  // Filter & Sort loads
  const filteredLoads = useMemo(() => {
    return loads.filter((load) => {
      // Return load filter
      if (returnLoadOnly) {
        if (carrierReturnOrigin) {
          if (!load.origin?.toLowerCase().includes(carrierReturnOrigin.toLowerCase())) {
            return false;
          }
        }
      }

      // Origin filter
      if (originFilter && !load.origin?.toLowerCase().includes(originFilter.toLowerCase())) {
        return false;
      }

      // Destination filter
      if (destinationFilter && !load.destination?.toLowerCase().includes(destinationFilter.toLowerCase())) {
        return false;
      }

      // Vehicle type filter
      if (vehicleTypeFilter !== "all") {
        if (load.vehicle_type && load.vehicle_type !== vehicleTypeFilter) {
          return false;
        }
      }

      // Search query (origin, dest, title, company)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${load.origin} ${load.destination} ${load.title || ""} ${load.cargo_type || ""} ${load.company_name || ""}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "highest_price") {
        return (Number(b.price || b.target_price || 0)) - (Number(a.price || a.target_price || 0));
      }
      if (sortBy === "shortest") {
        return (Number(a.distance_km || 0)) - (Number(b.distance_km || 0));
      }
      if (sortBy === "longest") {
        return (Number(b.distance_km || 0)) - (Number(a.distance_km || 0));
      }
      // default newest
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }, [loads, searchQuery, originFilter, destinationFilter, vehicleTypeFilter, returnLoadOnly, carrierReturnOrigin, sortBy]);

  const handleSelectLoad = (load) => {
    setSelectedLoadIdState(load.id);
  };

  const handleOpenDetailsDrawer = (load) => {
    setSelectedLoadIdState(load.id);
    setDrawerOpen(true);
  };

  const handleStartBid = (load, e) => {
    if (e) e.stopPropagation();
    setSelectedLoadIdState(load.id);
    setActiveBidLoadId(load.id);

    // Check if carrier already has a bid on this load and pre-fill with that amount
    const existingBid = carrierBids.find(b => b.load_id === load.id && b.status === "pending");
    setBidAmount(existingBid ? String(existingBid.amount) : (load.target_price ? String(load.target_price) : ""));

    setDrawerOpen(true);
  };

  const handleSubmitBid = () => {
    if (!onSendBid || !selectedLoad || !bidAmount) return;
    onSendBid(selectedLoad.id, parseFloat(bidAmount));
    setActiveBidLoadId(null);
  };

  return (
    <div className="space-y-5 pb-24 lg:pb-8">
      {/* 1. Header & Return Load Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#374151] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-[#F3F4F6]">
              Açık Yük Borsası
            </h2>
            <span className="rounded bg-[#F5A400]/15 px-2.5 py-0.5 text-xs font-bold text-[#F5A400] border border-[#F5A400]/30">
              {filteredLoads.length} İlan
            </span>
          </div>
          <p className="mt-0.5 text-sm text-[#A0AEC0]">
            Türkiye genelindeki uygun yükleri inceleyin, akıllı maliyet analizini görerek teklif verin.
          </p>
        </div>

        {/* Return Load Quick Toggle */}
        {carrierReturnOrigin && (
          <button
            type="button"
            onClick={() => setReturnLoadOnly(!returnLoadOnly)}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition border ${
              returnLoadOnly
                ? "bg-[#F5A400] text-[#111827] border-[#F5A400] shadow-md shadow-[#F5A400]/20"
                : "bg-[#1F2937] text-[#F3F4F6] border-[#374151] hover:border-[#F5A400]/40"
            }`}
          >
            <span>🔄 Dönüş Yükü: {carrierReturnOrigin}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${returnLoadOnly ? "bg-[#111827]/20" : "bg-[#283548]"}`}>
              {returnLoadOnly ? "Aktif" : "Filtrele"}
            </span>
          </button>
        )}
      </div>

      {/* 2. Filter Bar */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5 bg-[#1F2937] p-3 rounded-xl border border-[#374151]">
        {/* Search */}
        <div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Şehir, yük cinsi veya firma ara..."
            className="tork-input text-xs"
          />
        </div>

        {/* Origin Filter */}
        <div>
          <select
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value)}
            className="tork-input text-xs"
          >
            <option value="">Çıkış: Tümü</option>
            {availableOrigins.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {/* Destination Filter */}
        <div>
          <select
            value={destinationFilter}
            onChange={(e) => setDestinationFilter(e.target.value)}
            className="tork-input text-xs"
          >
            <option value="">Varış: Tümü</option>
            {availableDestinations.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {/* Vehicle Type */}
        <div>
          <select
            value={vehicleTypeFilter}
            onChange={(e) => setVehicleTypeFilter(e.target.value)}
            className="tork-input text-xs"
          >
            <option value="all">Araç Tipi: Tümü</option>
            <option value="TIR">TIR</option>
            <option value="KAMYON">Kamyon</option>
            <option value="KAMYONET">Kamyonet</option>
            <option value="ONTEKER">Onteker</option>
          </select>
        </div>

        {/* Sort */}
        <div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="tork-input text-xs"
          >
            <option value="newest">En Yeni İlanlar</option>
            <option value="highest_price">En Yüksek Navlun</option>
            <option value="shortest">En Kısa Mesafe</option>
            <option value="longest">En Uzun Mesafe</option>
          </select>
        </div>
      </div>

      {/* 3. Main Split View: Left List (50-60%) + Right Interactive Map (40-50%) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        {/* Left Load List */}
        <div className="space-y-3 lg:col-span-7">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-28 rounded-xl tork-skeleton border border-[#374151]" />
              ))}
            </div>
          ) : filteredLoads.length === 0 ? (
            <div className="rounded-xl border border-[#374151] bg-[#1F2937] p-8 text-center text-[#A0AEC0]">
              <div className="text-3xl mb-2">📦</div>
              <div className="text-base font-bold text-[#F3F4F6]">Aranan kriterlere uygun yük bulunamadı.</div>
              <p className="text-xs mt-1">Filtreleri sıfırlayarak tüm Türkiye geneli açık yükleri görüntüleyebilirsiniz.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setOriginFilter("");
                  setDestinationFilter("");
                  setVehicleTypeFilter("all");
                  setReturnLoadOnly(false);
                }}
                className="mt-4 tork-btn-secondary text-xs"
              >
                Filtreleri Temizle
              </button>
            </div>
          ) : (
            filteredLoads.map((load) => {
              const isSelected = selectedLoad?.id === load.id;
              const hasBid = carrierBids.some((b) => b.load_id === load.id || b.loadId === load.id);

              return (
                <div
                  key={load.id}
                  onClick={() => handleSelectLoad(load)}
                  className={`cursor-pointer rounded-xl border p-4 transition duration-150 ${
                    isSelected
                      ? "border-[#F5A400] bg-[#1F2937] shadow-lg shadow-[#F5A400]/10"
                      : "border-[#374151] bg-[#111827] hover:border-[#4B5563] hover:bg-[#1F2937]"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Origin -> Destination & Metadata */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-[#F3F4F6]">
                          {load.origin}
                        </span>
                        <span className="text-[#F5A400] font-bold">→</span>
                        <span className="text-base font-black text-[#F3F4F6]">
                          {load.destination}
                        </span>
                        {load.is_urgent && (
                          <span className="rounded bg-[#EF4444]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#EF4444] border border-[#EF4444]/30">
                            ACİL
                          </span>
                        )}
                        {hasBid && (
                          <span className="rounded bg-[#22C55E]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#22C55E] border border-[#22C55E]/30">
                            TEKLİF VERİLDİ
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#A0AEC0]">
                        <span>⚖️ {load.tonnage || load.weight_tons || "—"} Ton</span>
                        <span>🚛 {load.vehicle_type || "TIR"}</span>
                        <span>📦 {load.cargo_type || "Genel Yük"}</span>
                        <span>⏱️ {formatRelativeTimeTR(load.created_at)}</span>
                      </div>
                    </div>

                    {/* Price & Action */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#374151]">
                      <div className="text-left sm:text-right">
                        <span className="text-[11px] font-bold uppercase text-[#A0AEC0] block">
                          Hedef Navlun
                        </span>
                        <span className="text-lg font-black font-mono text-[#F5A400]">
                          {formatCurrencyTR(load.target_price || load.price || 0)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetailsDrawer(load);
                          }}
                          className="tork-btn-secondary text-xs py-1.5 px-3 min-h-[36px]"
                        >
                          Detay
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleStartBid(load, e)}
                          className="tork-btn-primary text-xs py-1.5 px-4 min-h-[36px]"
                        >
                          Teklif Ver
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Interactive Map with Real Road Geometry */}
        <div className="lg:col-span-5 sticky top-4">
          <TorkMarketplaceMap
            loads={filteredLoads}
            selectedLoad={selectedLoad}
            onSelectLoad={handleSelectLoad}
            className="w-full h-[420px] lg:h-[600px]"
          />
        </div>
      </div>

      {/* 4. Slide-Over Right Drawer for Load Details & Bidding (Phase 19 Requirement) */}
      {drawerOpen && selectedLoad && (
        <div className="tork-drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div
            ref={drawerRef}
            className="tork-drawer-right p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-[#374151] pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#F5A400]">
                  SEVKİYAT DETAYI & TEKLİF
                </span>
                <h3 className="text-xl font-black text-[#F3F4F6] mt-0.5">
                  {selectedLoad.origin} → {selectedLoad.destination}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#374151] bg-[#1F2937] text-[#A0AEC0] hover:text-[#F3F4F6]"
              >
                ✕
              </button>
            </div>

            {/* Load Spec Badges */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-[#1F2937] p-3 border border-[#374151]">
                <span className="text-[#A0AEC0] uppercase font-bold text-[10px]">Ağırlık / Tonaj</span>
                <div className="text-sm font-black text-[#F3F4F6] mt-0.5">{selectedLoad.tonnage || selectedLoad.weight_tons} Ton</div>
              </div>
              <div className="rounded-lg bg-[#1F2937] p-3 border border-[#374151]">
                <span className="text-[#A0AEC0] uppercase font-bold text-[10px]">Araç Gereksinimi</span>
                <div className="text-sm font-black text-[#F3F4F6] mt-0.5">{selectedLoad.vehicle_type || "TIR (Standart)"}</div>
              </div>
              <div className="rounded-lg bg-[#1F2937] p-3 border border-[#374151]">
                <span className="text-[#A0AEC0] uppercase font-bold text-[10px]">Yük Cinsi</span>
                <div className="text-sm font-black text-[#F3F4F6] mt-0.5">{selectedLoad.cargo_type || "Genel Yük"}</div>
              </div>
              <div className="rounded-lg bg-[#1F2937] p-3 border border-[#374151]">
                <span className="text-[#A0AEC0] uppercase font-bold text-[10px]">Hedef Fiyat</span>
                <div className="text-sm font-black font-mono text-[#F5A400] mt-0.5">
                  {formatCurrencyTR(selectedLoad.target_price || selectedLoad.price || 0)}
                </div>
              </div>
            </div>

            {/* Smart Bidding Assistant Embedded in Drawer */}
            <CarrierSmartBiddingWidget
              load={selectedLoad}
              bidAmount={bidAmount}
              distanceKm={selectedLoad.distance_km || 730}
              durationMinutes={selectedLoad.duration_minutes || 525}
            />

            {/* Bid Input & Submission */}
            <div className="rounded-xl border border-[#374151] bg-[#1F2937] p-4 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[#A0AEC0] block">
                Teklif Tutarınız (₺)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder="Örn: 42500"
                  className="tork-input text-base font-black font-mono pr-12"
                />
                <span className="absolute right-4 top-2.5 text-sm font-bold text-[#A0AEC0]">
                  ₺
                </span>
              </div>

              <button
                type="button"
                onClick={handleSubmitBid}
                disabled={!bidAmount || parseFloat(bidAmount) <= 0}
                className="w-full tork-btn-primary"
              >
                <span>🚀 Teklifi Yük Verene Gönder</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Mobile Sticky Bottom Action Bar (Phase 18 Requirement) */}
      {selectedLoad && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#374151] bg-[#1F2937]/95 p-3 backdrop-blur-md flex items-center justify-between gap-3 shadow-2xl">
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-bold text-[#F3F4F6]">
              {selectedLoad.origin} → {selectedLoad.destination}
            </div>
            <div className="text-xs font-mono font-black text-[#F5A400]">
              {formatCurrencyTR(selectedLoad.target_price || selectedLoad.price || 0)}
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenDetailsDrawer(selectedLoad)}
            className="tork-btn-primary min-h-[44px] px-6 text-sm whitespace-nowrap"
          >
            Hızlı Teklif Ver
          </button>
        </div>
      )}
    </div>
  );
}
