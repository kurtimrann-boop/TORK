"use client";

import { useState } from "react";

export default function TransportCancellationModal({
  isOpen,
  onClose,
  transportId,
  userRole = "carrier",
  userId = null,
  onSuccess = null,
}) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Lütfen bir iptal gerekçesi belirtiniz.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/transports/${transportId}/cancellation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reason.trim(),
          userId,
          role: userRole,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || "İptal talebi oluşturulamadı.");
        setLoading(false);
        return;
      }

      setReason("");
      if (onSuccess) {
        onSuccess(json.request);
      }
      onClose();
    } catch (err) {
      setError("Hata: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#0F1723] p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 text-lg font-black">
              ⚠️
            </span>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Sevkiyat İptal Talebi
              </h3>
              <p className="text-[11px] text-slate-400">
                Karşılıklı onay ile sevkiyatı sonlandırma
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">
            <span className="font-bold">Önemli Bilgilendirme:</span> İptal işlemi tek taraflı değildir. Talebiniz karşı tarafa iletilecek ve karşı tarafın onayı sonrası sefer iptal edilecektir.
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              İptal Gerekçesi <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Örn: Araç teknik arızası, yükleme sahasında beklenmeyen gecikme, karşılıklı anlaşma..."
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-colors"
              required
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-black text-white hover:bg-rose-500 disabled:opacity-50 transition-colors shadow-[0_0_12px_rgba(225,29,72,0.3)]"
            >
              {loading ? "Gönderiliyor..." : "İptal Talebi Gönder →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
