/**
 * TORK — Koordinat verisi doğrulama scripti
 * 81 ilin koordinatlarının eksiksiz ve geçerli olduğunu kontrol eder.
 *
 * Kullanım: node scripts/validate-coordinates.js
 */

const { TURKEY_PROVINCE_COORDINATES } = require("../src/data/turkeyProvinceCoordinates.js");
const { TURKEY_PROVINCES } = require("../src/data/turkeyProvinces.js");

const provinces = TURKEY_PROVINCES.length;
const codes = new Set(TURKEY_PROVINCES.map((p) => p.code));
const coords = Object.keys(TURKEY_PROVINCE_COORDINATES);
const coordCodes = new Set(coords);

const missing = TURKEY_PROVINCES.filter((p) => !coordCodes.has(p.code)).map((p) => p.code + " " + p.name);
const extra = coords.filter((c) => !codes.has(c));
const invalid = coords.filter((c) => {
  const d = TURKEY_PROVINCE_COORDINATES[c];
  return (
    !d ||
    typeof d.lat !== "number" ||
    typeof d.lng !== "number" ||
    d.lat < -90 ||
    d.lat > 90 ||
    d.lng < -180 ||
    d.lng > 180
  );
});

console.log("Toplam il:", provinces);
console.log("Koordinat kayıtları:", coords.length);
console.log("Eksik koordinat:", missing.length ? missing.join(", ") : "YOK");
console.log("Fazla kod:", extra.length ? extra.join(", ") : "YOK");
console.log("Geçersiz koordinat:", invalid.length ? invalid.join(", ") : "YOK");
console.log();
console.log("Trabzon (61):", JSON.stringify(TURKEY_PROVINCE_COORDINATES["61"]));
console.log("Ankara (06):", JSON.stringify(TURKEY_PROVINCE_COORDINATES["06"]));
console.log("İstanbul (34):", JSON.stringify(TURKEY_PROVINCE_COORDINATES["34"]));

if (provinces === 81 && coords.length === 81 && missing.length === 0 && extra.length === 0 && invalid.length === 0) {
  console.log("\nSONUÇ: TÜM KONTROLLER BAŞARILI ✅");
} else {
  console.log("\nSONUÇ: HATA VAR ❌");
  process.exit(1);
}