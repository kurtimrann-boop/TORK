"use client";

import { useState } from "react";

const DOC_TYPES = [
  { id: "POD", label: "Teslimat Kanıtı (POD / Islak İmzalı Fiş)" },
  { id: "WAYBILL", label: "Sevk İrsaliyesi" },
  { id: "INVOICE", label: "Taşıma Faturası" },
  { id: "DISPATCH_NOTE", label: "Kantar Fişi / Teslim Tutanağı" },
];

export default function TransportPodUpload({
  transportId,
  documents = [],
  onUploadDocument,
  isCarrier = true,
}) {
  const [docType, setDocType] = useState("POD");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showInput, setShowInput] = useState(false);

  const handleSimulatedUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Allowed types: PDF, JPG, JPEG, PNG
    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(file.type.toLowerCase()) && !file.name.match(/\.(pdf|jpg|jpeg|png)$/i)) {
      alert("Yalnızca PDF, JPG ve PNG formatları desteklenmektedir.");
      return;
    }

    // Check size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert("Dosya boyutu 10MB'dan küçük olmalıdır.");
      return;
    }

    setIsUploading(true);
    setFileName(file.name);

    // Read and prepare structured storage metadata
    setTimeout(() => {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
      const storagePath = `transport-documents/${transportId}/carrier/${Date.now()}-${sanitizedName}`;
      setFileUrl(`https://storage.tork.test/${storagePath}`);
      setIsUploading(false);
    }, 400);
  };

  const handleSaveDoc = () => {
    if (!fileName && !fileUrl) return;

    const sanitizedName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const docId = `doc-${Date.now()}`;
    const storagePath = `transport-documents/${transportId}/carrier/${docId}-${sanitizedName}`;

    onUploadDocument({
      id: docId,
      transport_id: transportId,
      document_type: docType,
      file_name: fileName,
      storage_path: storagePath,
      document_url: fileUrl || `https://storage.tork.test/${storagePath}`,
      created_at: new Date().toISOString(),
    });

    setFileName("");
    setFileUrl("");
    setShowInput(false);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0F1723]/90 p-5 sm:p-6 backdrop-blur-md">
      <div className="flex items-center justify-between pb-4 border-b border-white/8 mb-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-400">
            Resmi Evrak & Teslimat Kanıtı
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-100 mt-0.5">
            Sefer Belgeleri (POD & İrsaliye)
          </h3>
        </div>

        {isCarrier && !showInput && (
          <button
            onClick={() => setShowInput(true)}
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-xs font-black text-emerald-400 hover:bg-emerald-500/25 transition-all shadow-[0_0_8px_rgba(16,185,129,0.2)]"
          >
            + Belge Ekle
          </button>
        )}
      </div>

      {/* Upload Form (If active) */}
      {showInput && (
        <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5">
          <div className="text-xs font-black text-emerald-400 uppercase tracking-wider mb-3">
            Yeni Belge Yükle
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Belge Türü</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="tork-input w-full px-3 py-2 text-xs"
              >
                {DOC_TYPES.map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Dosya Seç (PDF, JPG, PNG - Max 10MB)
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleSimulatedUpload}
                className="block w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-emerald-500/20 file:text-emerald-300 hover:file:bg-emerald-500/30"
              />
            </div>
          </div>

          {isUploading && (
            <div className="text-xs text-emerald-400 animate-pulse mb-3">
              Dosya işleniyor ve güvenli depolama meta verisi oluşturuluyor...
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSaveDoc}
              disabled={!fileName && !fileUrl}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-xs font-black text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-40 transition-all"
            >
              Belgeyi Kaydet
            </button>
            <button
              onClick={() => {
                setShowInput(false);
                setFileName("");
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-400 hover:bg-white/10"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Uploaded Documents List */}
      {documents.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-500">
          Henüz yüklenmiş teslim belgesi (POD) veya irsaliye bulunmuyor.
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id || doc.created_at}
              className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.02] p-3 hover:border-white/12 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs">
                  📄
                </span>
                <div>
                  <div className="text-xs font-black text-slate-200">
                    {doc.document_type === "POD"
                      ? "Teslimat Kanıtı (POD)"
                      : doc.document_type === "WAYBILL"
                        ? "Sevk İrsaliyesi"
                        : doc.document_type === "INVOICE"
                          ? "Taşıma Faturası"
                          : "Ek Sefer Belgesi"}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {doc.file_name || "Belge eklendi"} · {new Date(doc.created_at).toLocaleDateString("tr-TR")}
                  </div>
                </div>
              </div>

              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/8 px-2.5 py-1 text-[10px] font-black text-emerald-400">
                ✓ Doğrulandı
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
