/**
 * TORK — KGM 2026 Otoyol ve Köprü Geçiş Ücretleri Araştırma & Envanter Scripti (Hürmüz Faz 3.2)
 * 
 * Amaç:
 * 1. KGM 2026 resmi otoyol ve köprü geçiş tarifelerini modellemek
 * 2. 5 araç aks sınıfı ile gişe segmentlerini listelemek
 * 3. Offline / Yerel Gişe Eşleştirme Motoru için veri temelini oluşturmak
 */

export const KGM_TOLL_SEGMENTS_2026 = [
  {
    id: "osmangazi-koprusu",
    name: "Osmangazi Köprüsü (İzmit Körfez Geçişi)",
    operator: "Otoyol A.Ş. (KGM Denetimli KÖİ)",
    highway: "O-5 Gebze - İzmir",
    classTariffs: {
      "1": 555.0,  // 1. Sınıf (Otomobil)
      "2": 890.0,  // 2. Sınıf (Kamyonet/Minibüs)
      "3": 1055.0, // 3. Sınıf (3 akslı Kamyon)
      "4": 1400.0, // 4. Sınıf (Kırkayak)
      "5": 1765.0, // 5. Sınıf (TIR / 5+ Aks)
    },
    currency: "TRY",
  },
  {
    id: "1915-canakkale-koprusu",
    name: "1915 Çanakkale Köprüsü",
    operator: "ÇOK A.Ş. (KÖİ)",
    highway: "Kınalı - Tekirdağ - Çanakkale - Balıkesir",
    classTariffs: {
      "1": 585.0,
      "2": 935.0,
      "3": 1320.0,
      "4": 1750.0,
      "5": 2340.0,
    },
    currency: "TRY",
  },
  {
    id: "yavuz-sultan-selim-koprusu",
    name: "Yavuz Sultan Selim Köprüsü (3. Köprü - Ağır Vasıta Zorunlu)",
    operator: "ICA (KÖİ)",
    highway: "Kuzey Marmara Otoyolu (O-7)",
    classTariffs: {
      "1": 70.0,
      "2": 95.0,
      "3": 175.0,
      "4": 350.0,
      "5": 435.0,
    },
    currency: "TRY",
  },
  {
    id: "anadolu-otoyolu",
    name: "Anadolu Otoyolu (Çamlıca / İstanbul - Akıncı / Ankara)",
    operator: "KGM (Kamu İşletmesi)",
    highway: "O-4",
    maxFullRouteTariff: {
      "1": 187.0,
      "2": 238.0,
      "3": 284.0,
      "4": 374.0,
      "5": 468.0,
    },
    entryExitSample: [
      { from: "Çamlıca", to: "Akıncı", distanceKm: 380, class5: 468.0 },
      { from: "Gebze", to: "Akıncı", distanceKm: 345, class5: 430.0 },
      { from: "İzmit Doğu", to: "Akıncı", distanceKm: 300, class5: 380.0 },
      { from: "Bolu Batı", to: "Akıncı", distanceKm: 140, class5: 190.0 },
    ],
    currency: "TRY",
  },
  {
    id: "gebze-orhangazi-izmir",
    name: "Gebze - Orhangazi - İzmir Otoyolu (Köprü Hariç Tam Hat)",
    operator: "Otoyol A.Ş. (KÖİ)",
    highway: "O-5",
    maxFullRouteTariff: {
      "1": 980.0,
      "2": 1570.0,
      "3": 1860.0,
      "4": 2470.0,
      "5": 3110.0,
    },
    currency: "TRY",
  },
  {
    id: "ankara-nigde-otoyolu",
    name: "Ankara - Niğde Otoyolu",
    operator: "ERG Otoyol (KÖİ)",
    highway: "O-21",
    maxFullRouteTariff: {
      "1": 410.0,
      "2": 590.0,
      "3": 720.0,
      "4": 950.0,
      "5": 1200.0,
    },
    currency: "TRY",
  },
  {
    id: "kuzey-marmara-otoyolu",
    name: "Kuzey Marmara Otoyolu (Kınalı - Akyazı Tam Koridor)",
    operator: "KMO (Avrupa & Anadolu KÖİ)",
    highway: "O-7",
    maxFullRouteTariff: {
      "1": 490.0,
      "2": 780.0,
      "3": 950.0,
      "4": 1280.0,
      "5": 1620.0,
    },
    currency: "TRY",
  },
];

console.log("=================================================");
console.log("TORK KGM 2026 OTOYOL & GEÇİŞ ENVANTERİ");
console.log("=================================================");
console.log(`Toplam İncelenen Ana Koridor / Köprü: ${KGM_TOLL_SEGMENTS_2026.length}`);
console.log("\nSegment Listesi ve 5. Sınıf (TIR) Geçiş Tavanları:");

KGM_TOLL_SEGMENTS_2026.forEach((seg, idx) => {
  const tirTariff = seg.classTariffs?.["5"] || seg.maxFullRouteTariff?.["5"];
  console.log(`${idx + 1}. [${seg.id}] ${seg.name}`);
  console.log(`   İşletmeci: ${seg.operator} | Otoyol Kodu: ${seg.highway}`);
  console.log(`   TIR (5. Sınıf) Tavan: ₺${tirTariff?.toLocaleString("tr-TR")}`);
});

console.log("\n=================================================");
console.log("Resmi Kaynak: KGM (https://www.kgm.gov.tr/sayfalar/kgm/sitetr/otoyollar/ucretleryeni.aspx)");
console.log("=================================================");
