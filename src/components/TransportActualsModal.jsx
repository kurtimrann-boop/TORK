"use client";

import { useState, useMemo } from "react";
import { formatCurrencyTR } from "../utils/turkish";

export default function TransportActualsModal({
  isOpen,
  onClose,
  onSave,
  initialActuals = {},
  estimatedCost = 30813,
}) {
  const [fuelLiters, setFuelLiters] = useState(initialActuals.fuel_liters ?? "");
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState(initialActuals.fuel_price_per_liter ?? 78.54);
  const [manualFuelCost, setManualFuelCost] = useState(initialActuals.fuel_cost ?? "");
  const [useManualFuel, setUseManualFuel] = useState(false);

  const [driverCost, setDriverCost] = useState(initialActuals.driver_cost ?? "");
  const [tollCost, setTollCost] = useState(initialActuals.toll_cost ?? "");
  const [waitingHours, setWaitingHours] = useState(initialActuals.waiting_hours ?? "");
  const [waitingCost, setWaitingCost] = useState(initialActuals.waiting_cost ?? "");
  const [maintenanceCost, setMaintenanceCost] = useState(initialActuals.maintenance_cost ?? "");
  const [depreciationCost, setDepreciationCost] = useState(initialActuals.depreciation_cost ?? "");
  const [otherCost, setOtherCost] = useState(initialActuals.other_cost ?? "");
  const [notes, setNotes] = useState(initialActuals.notes ?? "");

  // Auto-calculated Fuel Cost
  const calculatedFuelCost = useMemo(() => {
    if (useManualFuel && manualFuelCost !== "") return Number(manualFuelCost);
    const l = parseFloat(fuelLiters);
    const p = parseFloat(fuelPricePerLiter);
    if (Number.isFinite(l) && Number.isFinite(p) && l > 0 && p > 0) {
      return Math.round(l * p * 100) / 100;
    }
    return null;
  }, [fuelLiters, fuelPricePerLiter, manualFuelCost, useManualFuel]);

  // Total Realized Sum
  const totalActualSum = useMemo(() => {
    let sum = 0;
    let hasValue = false;

    const addVal = (val) => {
      const num = parseFloat(val);
      if (Number.isFinite(num) && num > 0) {
        sum += num;
        hasValue = true;
      }
    };

    if (calculatedFuelCost !== null) {
      sum += calculatedFuelCost;
      hasValue = true;
    }
    addVal(driverCost);
    addVal(tollCost);
    addVal(waitingCost);
    addVal(maintenanceCost);
    addVal(depreciationCost);
    addVal(otherCost);

    return hasValue ? Math.round(sum * 100) / 100 : null;
  }, [calculatedFuelCost, driverCost, tollCost, waitingCost, maintenanceCost, depreciationCost, otherCost]);

  if (!isOpen) return null;

  const handleSave = () => {
    const payload = {
      fuel_liters: fuelLiters !== "" ? parseFloat(fuelLiters) : null,
      fuel_price_per_liter: fuelPricePerLiter !== "" ? parseFloat(fuelPricePerLiter) : null,
      fuel_cost: calculatedFuelCost,
      driver_cost: driverCost !== "" ? parseFloat(driverCost) : null,
      toll_cost: tollCost !== "" ? parseFloat(tollCost) : null,
      waiting_hours: waitingHours !== "" ? parseFloat(waitingHours) : null,
      waiting_cost: waitingCost !== "" ? parseFloat(waitingCost) : null,
      maintenance_cost: maintenanceCost !== "" ? parseFloat(maintenanceCost) : null,
      depreciation_cost: depreciationCost !== "" ? parseFloat(depreciationCost) : null,
      other_cost: otherCost !== "" ? parseFloat(otherCost) : null,
      notes: notes.trim() !== "" ? notes.trim() : null,
    };
    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0B111A] p-6 sm:p-8 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/8 mb-6">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-400">
              Taşıyıcı Özel Harcama Girişi
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 mt-0.5">
              Gerçekleşen Sefer Maliyetleri
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Fuel Section */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                1. Gerçekleşen Yakıt Tüketimi
              </span>
              {calculatedFuelCost !== null && (
                <span className="text-xs font-black text-emerald-400">
                  {formatCurrencyTR(calculatedFuelCost)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Alınan Motorin (Litre)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="Örn: 232.4"
                  value={fuelLiters}
                  onChange={(e) => setFuelLiters(e.target.value)}
                  className="tork-input w-full px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Litre Pompa Fiyatı (₺/L)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Örn: 78.54"
                  value={fuelPricePerLiter}
                  onChange={(e) => setFuelPricePerLiter(e.target.value)}
                  className="tork-input w-full px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={() => setUseManualFuel(!useManualFuel)}
                className="text-slate-400 hover:text-emerald-400 underline"
              >
                {useManualFuel ? "Formülle hesapla" : "Toplam yakıt tutarını manuel gir"}
              </button>

              {useManualFuel && (
                <input
                  type="number"
                  placeholder="Manuel Yakıt Tutarı (₺)"
                  value={manualFuelCost}
                  onChange={(e) => setManualFuelCost(e.target.value)}
                  className="tork-input w-44 px-3 py-1.5 text-xs text-right"
                />
              )}
            </div>
          </div>

          {/* Operational Expenses Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                2. Otoyol & Köprü Geçişi (₺)
              </label>
              <input
                type="number"
                min="0"
                placeholder="Örn: 468"
                value={tollCost}
                onChange={(e) => setTollCost(e.target.value)}
                className="tork-input w-full px-3.5 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                3. Sürücü / Sefer İşçiliği (₺)
              </label>
              <input
                type="number"
                min="0"
                placeholder="Örn: 2150"
                value={driverCost}
                onChange={(e) => setDriverCost(e.target.value)}
                className="tork-input w-full px-3.5 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                4. Bekleme / Demuraj Ücreti (₺)
              </label>
              <input
                type="number"
                min="0"
                placeholder="Varsa bekleme tazminatı"
                value={waitingCost}
                onChange={(e) => setWaitingCost(e.target.value)}
                className="tork-input w-full px-3.5 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                5. Bakım & Amortisman Payı (₺)
              </label>
              <input
                type="number"
                min="0"
                placeholder="Örn: 8000"
                value={maintenanceCost}
                onChange={(e) => setMaintenanceCost(e.target.value)}
                className="tork-input w-full px-3.5 py-2.5 text-sm"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              Sefer Notları ve Ek Masraflar
            </label>
            <textarea
              rows={2}
              placeholder="Örn: Rota üzerinde ilave kantar fişi veya bekleme süresi..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="tork-input w-full px-3.5 py-2.5 text-sm resize-none"
            />
          </div>

          {/* Summary Banner */}
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Toplam Gerçekleşen Maliyet</div>
              <div className="text-xl font-black text-emerald-400 mt-0.5">
                {totalActualSum !== null ? formatCurrencyTR(totalActualSum) : "—"}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">Planlanan Tahmin</div>
              <div className="text-sm font-bold text-slate-300 mt-0.5">
                {formatCurrencyTR(estimatedCost)}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-3 text-xs font-black text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all hover:bg-emerald-500/30 hover:border-emerald-500/50"
            >
              Harcamaları Kaydet
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-slate-400 hover:bg-white/10 hover:text-white transition-all"
            >
              İptal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
