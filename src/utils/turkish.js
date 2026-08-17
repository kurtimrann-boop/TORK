/**
 * TORK — Türkçe Yardımcı Fonksiyonlar
 * Kullanıcıya görünen metinlerin tutarlı Türkçe karşılıkları.
 */

/**
 * Türkçe karakterleri normalize eder (arama için).
 * Orijinal görünen isim değiştirilmez.
 */
export function normalizeTurkishText(text) {
  if (!text) return "";
  return String(text)
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u");
}

/**
 * Göreceli zamanı Türkçe formatlar.
 * Örnek: "2 dakika önce", "1 saat önce", "3 gün önce", "Az önce"
 */
export function formatRelativeTimeTR(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Az önce";
  if (diffMin < 60) return `${diffMin} dakika önce`;
  if (diffHour < 24) return `${diffHour} saat önce`;
  if (diffDay < 7) return `${diffDay} gün önce`;

  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Sayıyı Türkçe formatta gösterir.
 * Örnek: 24000 -> "24.000"
 */
export function formatNumberTR(value) {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString("tr-TR");
}

/**
 * Para tutarını Türkçe formatta gösterir.
 * Örnek: 24000 -> "₺24.000"
 */
export function formatCurrencyTR(value) {
  if (value === null || value === undefined || value === "") return "₺0";
  const num = Number(value);
  if (Number.isNaN(num)) return `₺${value}`;
  return `₺${num.toLocaleString("tr-TR")}`;
}

/**
 * Yük (load) durumu Türkçe karşılıkları.
 * Uygulamanın her yerinde aynı karşılık kullanılır.
 */
export const LOAD_STATUS_TR = {
  open: "Teklife Açık",
  assigned: "Taşıyıcı Atandı",
  completed: "Tamamlandı",
};

/**
 * Teklif (bid) durumu Türkçe karşılıkları.
 */
export const BID_STATUS_TR = {
  pending: "Bekliyor",
  accepted: "Kabul Edildi",
  rejected: "Reddedildi",
};

/**
 * Genel durum Türkçe karşılıkları (load + bid birleşik).
 */
export const STATUS_TR = {
  ...LOAD_STATUS_TR,
  ...BID_STATUS_TR,
};

/**
 * Rol Türkçe karşılıkları.
 */
export const ROLE_TR = {
  shipper: "Yük Veren",
  carrier: "Taşıyıcı",
};

/**
 * Durum metnini Türkçeye çevirir.
 * Bilinmeyen durumda orijinal metni döndürür.
 */
export function getStatusTR(status) {
  const normalized = String(status || "").toLowerCase();
  return STATUS_TR[normalized] || normalized || "Durum";
}

/**
 * Rol metnini Türkçeye çevirir.
 */
export function getRoleTR(role) {
  const normalized = String(role || "").toLowerCase();
  return ROLE_TR[normalized] || normalized || "";
}