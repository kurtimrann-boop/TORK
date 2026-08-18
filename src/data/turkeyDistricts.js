/**
 * Turkish Districts (ilçeler) — 81 İl / 973 Seçim Birimi
 * Source: T.C. İçişleri Bakanlığı & TÜİK Resmi Mülki İdare Standardı
 * (922 Kaymakamlık + 51 Normal İl Merkez Alanı = 973 Lojistik Seçim Birimi)
 *
 * Compact data structure: { code, name, d: [district names] }
 * district id format: `${code}-${index+1}` (deterministic, unique per province)
 */

export const TURKEY_DISTRICTS = [
  // 01 - Adana
  { code: "01", name: "Adana", d: ["Aladağ","Ceyhan","Çukurova","Feke","İmamoğlu","Karaisalı","Karataş","Kozan","Pozantı","Saimbeyli","Sarıçam","Seyhan","Tufanbeyli","Yumurtalık","Yüreğir"] },
  // 02 - Adıyaman
  { code: "02", name: "Adıyaman", d: ["Besni","Çelikhan","Gerger","Gölbaşı","Kahta","Merkez","Samsat","Sincik","Tut"] },
  // 03 - Afyonkarahisar
  { code: "03", name: "Afyonkarahisar", d: ["Başmakçı","Bayat","Bolvadin","Çay","Çobanlar","Dazkırı","Dinar","Emirdağ","Evciler","Hocalar","İhsaniye","İscehisar","Kızılören","Merkez","Sandıklı","Sinanpaşa","Sultandağı","Şuhut"] },
  // 04 - Ağrı
  { code: "04", name: "Ağrı", d: ["Diyadin","Doğubayazıt","Eleşkirt","Hamur","Merkez","Patnos","Taşlıçay","Tutak"] },
  // 05 - Amasya
  { code: "05", name: "Amasya", d: ["Göynücek","Gümüşhacıköy","Hamamözü","Merkez","Merzifon","Suluova","Taşova"] },
  // 06 - Ankara
  { code: "06", name: "Ankara", d: ["Akyurt","Altındağ","Ayaş","Balâ","Beypazarı","Çamlıdere","Çankaya","Çubuk","Elmadağ","Etimesgut","Evren","Gölbaşı","Güdül","Haymana","Kahramankazan","Kalecik","Keçiören","Kızılcahamam","Mamak","Nallıhan","Polatlı","Pursaklar","Sincan","Şereflikoçhisar","Yenimahalle"] },
  // 07 - Antalya
  { code: "07", name: "Antalya", d: ["Akseki","Aksu","Alanya","Demre","Döşemealtı","Elmalı","Finike","Gazipaşa","Gündoğmuş","İbradı","Kaş","Kemer","Kepez","Konyaaltı","Korkuteli","Kumluca","Manavgat","Muratpaşa","Serik"] },
  // 08 - Artvin
  { code: "08", name: "Artvin", d: ["Ardanuç","Arhavi","Borçka","Hopa","Kemalpaşa","Merkez","Murgul","Şavşat","Yusufeli"] },
  // 09 - Aydın
  { code: "09", name: "Aydın", d: ["Bozdoğan","Buharkent","Çine","Didim","Efeler","Germencik","İncirliova","Karacasu","Karpuzlu","Koçarlı","Köşk","Kuşadası","Kuyucak","Nazilli","Söke","Sultanhisar","Yenipazar"] },
  // 10 - Balıkesir
  { code: "10", name: "Balıkesir", d: ["Altıeylül","Ayvalık","Balya","Bandırma","Bigadiç","Burhaniye","Dursunbey","Edremit","Erdek","Gömeç","Gönen","Havran","İvrindi","Karesi","Kepsut","Manyas","Marmara","Savaştepe","Sındırgı","Susurluk"] },
  // 11 - Bilecik
  { code: "11", name: "Bilecik", d: ["Bozüyük","Gölpazarı","İnhisar","Merkez","Osmaneli","Pazaryeri","Söğüt","Yenipazar"] },
  // 12 - Bingöl
  { code: "12", name: "Bingöl", d: ["Adaklı","Genç","Karlıova","Kiğı","Merkez","Solhan","Yayladere","Yedisu"] },
  // 13 - Bitlis
  { code: "13", name: "Bitlis", d: ["Adilcevaz","Ahlat","Güroymak","Hizan","Merkez","Mutki","Tatvan"] },
  // 14 - Bolu
  { code: "14", name: "Bolu", d: ["Dörtdivan","Gerede","Göynük","Kıbrıscık","Mengen","Merkez","Mudurnu","Seben","Yeniçağa"] },
  // 15 - Burdur
  { code: "15", name: "Burdur", d: ["Ağlasun","Altınyayla","Bucak","Çavdır","Çeltikçi","Gölhisar","Karamanlı","Kemer","Merkez","Tefenni","Yeşilova"] },
  // 16 - Bursa
  { code: "16", name: "Bursa", d: ["Büyükorhan","Gemlik","Gürsu","Harmancık","İnegöl","İznik","Karacabey","Keles","Kestel","Mudanya","Mustafakemalpaşa","Nilüfer","Orhaneli","Orhangazi","Osmangazi","Yenişehir","Yıldırım"] },
  // 17 - Çanakkale
  { code: "17", name: "Çanakkale", d: ["Ayvacık","Bayramiç","Biga","Bozcaada","Çan","Eceabat","Ezine","Gelibolu","Gökçeada","Lapseki","Merkez","Yenice"] },
  // 18 - Çankırı
  { code: "18", name: "Çankırı", d: ["Atkaracalar","Bayramören","Çerkeş","Eldivan","Ilgaz","Kızılırmak","Korgun","Kurşunlu","Merkez","Orta","Şabanözü","Yapraklı"] },
  // 19 - Çorum
  { code: "19", name: "Çorum", d: ["Alaca","Bayat","Boğazkale","Dodurga","İskilip","Kargı","Laçin","Mecitözü","Merkez","Oğuzlar","Ortaköy","Osmancık","Sungurlu","Uğurludağ"] },
  // 20 - Denizli
  { code: "20", name: "Denizli", d: ["Acıpayam","Babadağ","Baklan","Bekilli","Beyağaç","Bozkurt","Buldan","Çal","Çameli","Çardak","Çivril","Güney","Honaz","Kale","Merkezefendi","Pamukkale","Sarayköy","Serinhisar","Tavas"] },
  // 21 - Diyarbakır
  { code: "21", name: "Diyarbakır", d: ["Bağlar","Bismil","Çermik","Çınar","Çüngüş","Dicle","Eğil","Ergani","Hani","Hazro","Kayapınar","Kocaköy","Kulp","Lice","Silvan","Sur","Yenişehir"] },
  // 22 - Edirne
  { code: "22", name: "Edirne", d: ["Enez","Havsa","İpsala","Keşan","Lalapaşa","Meriç","Merkez","Süloğlu","Uzunköprü"] },
  // 23 - Elazığ
  { code: "23", name: "Elazığ", d: ["Ağın","Alacakaya","Arıcak","Baskil","Karakoçan","Keban","Kovancılar","Maden","Merkez","Palu","Sivrice"] },
  // 24 - Erzincan
  { code: "24", name: "Erzincan", d: ["Çayırlı","İliç","Kemah","Kemaliye","Merkez","Otlukbeli","Refahiye","Tercan","Üzümlü"] },
  // 25 - Erzurum
  { code: "25", name: "Erzurum", d: ["Aşkale","Aziziye","Çat","Hınıs","Horasan","İspir","Karaçoban","Karayazı","Köprüköy","Narman","Oltu","Olur","Palandöken","Pasinler","Pazaryolu","Şenkaya","Tekman","Tortum","Uzundere","Yakutiye"] },
  // 26 - Eskişehir
  { code: "26", name: "Eskişehir", d: ["Alpu","Beylikova","Çifteler","Günyüzü","Han","İnönü","Mahmudiye","Mihalgazi","Mihalıççık","Odunpazarı","Sarıcakaya","Seyitgazi","Sivrihisar","Tepebaşı"] },
  // 27 - Gaziantep
  { code: "27", name: "Gaziantep", d: ["Araban","İslahiye","Karkamış","Nizip","Nurdağı","Oğuzeli","Şahinbey","Şehitkamil","Yavuzeli"] },
  // 28 - Giresun
  { code: "28", name: "Giresun", d: ["Alucra","Bulancak","Çamoluk","Çanakçı","Dereli","Doğankent","Espiye","Eynesil","Görele","Güce","Keşap","Merkez","Piraziz","Şebinkarahisar","Tirebolu","Yağlıdere"] },
  // 29 - Gümüşhane
  { code: "29", name: "Gümüşhane", d: ["Kelkit","Köse","Kürtün","Merkez","Şiran","Torul"] },
  // 30 - Hakkari
  { code: "30", name: "Hakkari", d: ["Çukurca","Derecik","Merkez","Şemdinli","Yüksekova"] },
  // 31 - Hatay
  { code: "31", name: "Hatay", d: ["Altınözü","Antakya","Arsuz","Belen","Defne","Dörtyol","Erzin","Hassa","İskenderun","Kırıkhan","Kumlu","Payas","Reyhanlı","Samandağ","Yayladağı"] },
  // 32 - Isparta
  { code: "32", name: "Isparta", d: ["Aksu","Atabey","Eğirdir","Gelendost","Gönen","Keçiborlu","Merkez","Senirkent","Sütçüler","Şarkikaraağaç","Uluborlu","Yalvaç","Yenişarbademli"] },
  // 33 - Mersin
  { code: "33", name: "Mersin", d: ["Akdeniz","Anamur","Aydıncık","Bozyazı","Çamlıyayla","Erdemli","Gülnar","Mezitli","Mut","Silifke","Tarsus","Toroslar","Yenişehir"] },
  // 34 - İstanbul
  { code: "34", name: "İstanbul", d: ["Adalar","Arnavutköy","Ataşehir","Avcılar","Bağcılar","Bahçelievler","Bakırköy","Başakşehir","Bayrampaşa","Beşiktaş","Beykoz","Beylikdüzü","Beyoğlu","Büyükçekmece","Çatalca","Çekmeköy","Esenler","Esenyurt","Eyüpsultan","Fatih","Gaziosmanpaşa","Güngören","Kadıköy","Kağıthane","Kartal","Küçükçekmece","Maltepe","Pendik","Sancaktepe","Sarıyer","Silivri","Sultanbeyli","Sultangazi","Şile","Şişli","Tuzla","Ümraniye","Üsküdar","Zeytinburnu"] },
  // 35 - İzmir
  { code: "35", name: "İzmir", d: ["Aliağa","Balçova","Bayındır","Bayraklı","Bergama","Beydağ","Bornova","Buca","Çeşme","Çiğli","Dikili","Foça","Gaziemir","Güzelbahçe","Karabağlar","Karaburun","Karşıyaka","Kemalpaşa","Kınık","Kiraz","Konak","Menderes","Menemen","Narlıdere","Ödemiş","Seferihisar","Selçuk","Tire","Torbalı","Urla"] },
  // 36 - Kars
  { code: "36", name: "Kars", d: ["Akyaka","Arpaçay","Digor","Kağızman","Merkez","Sarıkamış","Selim","Susuz"] },
  // 37 - Kastamonu
  { code: "37", name: "Kastamonu", d: ["Abana","Ağlı","Araç","Azdavay","Bozkurt","Cide","Çatalzeytin","Daday","Devrekani","Doğanyurt","Hanönü","İhsangazi","İnebolu","Küre","Merkez","Pınarbaşı","Seydiler","Şenpazar","Taşköprü","Tosya"] },
  // 38 - Kayseri
  { code: "38", name: "Kayseri", d: ["Akkışla","Bünyan","Develi","Felahiye","Hacılar","İncesu","Kocasinan","Melikgazi","Özvatan","Pınarbaşı","Sarıoğlan","Sarız","Talas","Tomarza","Yahyalı","Yeşilhisar"] },
  // 39 - Kırklareli
  { code: "39", name: "Kırklareli", d: ["Babaeski","Demirköy","Kofçaz","Lüleburgaz","Merkez","Pehlivanköy","Pınarhisar","Vize"] },
  // 40 - Kırşehir
  { code: "40", name: "Kırşehir", d: ["Akçakent","Akpınar","Boztepe","Çiçekdağı","Kaman","Merkez","Mucur"] },
  // 41 - Kocaeli
  { code: "41", name: "Kocaeli", d: ["Başiskele","Çayırova","Darıca","Derince","Dilovası","Gebze","Gölcük","İzmit","Kandıra","Karamürsel","Kartepe","Körfez"] },
  // 42 - Konya
  { code: "42", name: "Konya", d: ["Ahırlı","Akören","Akşehir","Altınekin","Beyşehir","Bozkır","Cihanbeyli","Çeltik","Çumra","Derbent","Derebucak","Doğanhisar","Emirgazi","Ereğli","Güneysınır","Hadim","Halkapınar","Hüyük","Ilgın","Kadınhanı","Karapınar","Karatay","Kulu","Meram","Sarayönü","Selçuklu","Seydişehir","Taşkent","Tuzlukçu","Yalıhüyük","Yunak"] },
  // 43 - Kütahya
  { code: "43", name: "Kütahya", d: ["Altıntaş","Aslanapa","Çavdarhisar","Domaniç","Dumlupınar","Emet","Gediz","Hisarcık","Merkez","Pazarlar","Simav","Şaphane","Tavşanlı"] },
  // 44 - Malatya
  { code: "44", name: "Malatya", d: ["Akçadağ","Arapgir","Arguvan","Battalgazi","Darende","Doğanşehir","Doğanyol","Hekimhan","Kale","Kuluncak","Pütürge","Yazıhan","Yeşilyurt"] },
  // 45 - Manisa
  { code: "45", name: "Manisa", d: ["Ahmetli","Akhisar","Alaşehir","Demirci","Gölmarmara","Gördes","Kırkağaç","Köprübaşı","Kula","Salihli","Sarıgöl","Saruhanlı","Selendi","Soma","Şehzadeler","Turgutlu","Yunusemre"] },
  // 46 - Kahramanmaraş
  { code: "46", name: "Kahramanmaraş", d: ["Afşin","Andırın","Çağlayancerit","Dulkadiroğlu","Ekinözü","Elbistan","Göksun","Nurhak","Onikişubat","Pazarcık","Türkoğlu"] },
  // 47 - Mardin
  { code: "47", name: "Mardin", d: ["Artuklu","Dargeçit","Derik","Kızıltepe","Mazıdağı","Midyat","Nusaybin","Ömerli","Savur","Yeşilli"] },
  // 48 - Muğla
  { code: "48", name: "Muğla", d: ["Bodrum","Dalaman","Datça","Fethiye","Kavaklıdere","Köyceğiz","Marmaris","Menteşe","Milas","Ortaca","Seydikemer","Ula","Yatağan"] },
  // 49 - Muş
  { code: "49", name: "Muş", d: ["Bulanık","Hasköy","Korkut","Malazgirt","Merkez","Varto"] },
  // 50 - Nevşehir
  { code: "50", name: "Nevşehir", d: ["Acıgöl","Avanos","Derinkuyu","Gülşehir","Hacıbektaş","Kozaklı","Merkez","Ürgüp"] },
  // 51 - Niğde
  { code: "51", name: "Niğde", d: ["Altunhisar","Bor","Çamardı","Çiftlik","Merkez","Ulukışla"] },
  // 52 - Ordu
  { code: "52", name: "Ordu", d: ["Akkuş","Altınordu","Aybastı","Çamaş","Çatalpınar","Çaybaşı","Fatsa","Gölköy","Gülyalı","Gürgentepe","İkizce","Kabadüz","Kabataş","Korgan","Kumru","Mesudiye","Perşembe","Ulubey","Ünye"] },
  // 53 - Rize
  { code: "53", name: "Rize", d: ["Ardeşen","Çamlıhemşin","Çayeli","Derepazarı","Fındıklı","Güneysu","Hemşin","İkizdere","İyidere","Kalkandere","Merkez","Pazar"] },
  // 54 - Sakarya
  { code: "54", name: "Sakarya", d: ["Adapazarı","Akyazı","Arifiye","Erenler","Ferizli","Geyve","Hendek","Karapürçek","Karasu","Kaynarca","Kocaali","Pamukova","Sapanca","Serdivan","Söğütlü","Taraklı"] },
  // 55 - Samsun
  { code: "55", name: "Samsun", d: ["Alaçam","Asarcık","Atakum","Ayvacık","Bafra","Canik","Çarşamba","Havza","İlkadım","Kavak","Ladik","Ondokuzmayıs","Salıpazarı","Tekkeköy","Terme","Vezirköprü","Yakakent"] },
  // 56 - Siirt
  { code: "56", name: "Siirt", d: ["Baykan","Eruh","Kurtalan","Merkez","Pervari","Şirvan","Tillo"] },
  // 57 - Sinop
  { code: "57", name: "Sinop", d: ["Ayancık","Boyabat","Dikmen","Durağan","Erfelek","Gerze","Merkez","Saraydüzü","Türkeli"] },
  // 58 - Sivas
  { code: "58", name: "Sivas", d: ["Akıncılar","Altınyayla","Divriği","Doğanşar","Gemerek","Gölova","Gürün","Hafik","İmranlı","Kangal","Koyulhisar","Merkez","Suşehri","Şarkışla","Ulaş","Yıldızeli","Zara"] },
  // 59 - Tekirdağ
  { code: "59", name: "Tekirdağ", d: ["Çerkezköy","Çorlu","Ergene","Hayrabolu","Kapaklı","Malkara","Marmaraereğlisi","Muratlı","Saray","Süleymanpaşa","Şarköy"] },
  // 60 - Tokat
  { code: "60", name: "Tokat", d: ["Almus","Artova","Başçiftlik","Erbaa","Merkez","Niksar","Pazar","Reşadiye","Sulusaray","Turhal","Yeşilyurt","Zile"] },
  // 61 - Trabzon
  { code: "61", name: "Trabzon", d: ["Akçaabat","Araklı","Arsin","Beşikdüzü","Çarşıbaşı","Çaykara","Dernekpazarı","Düzköy","Hayrat","Köprübaşı","Maçka","Of","Ortahisar","Sürmene","Şalpazarı","Tonya","Vakfıkebir","Yomra"] },
  // 62 - Tunceli
  { code: "62", name: "Tunceli", d: ["Çemişgezek","Hozat","Mazgirt","Merkez","Nazımiye","Ovacık","Pertek","Pülümür"] },
  // 63 - Şanlıurfa
  { code: "63", name: "Şanlıurfa", d: ["Akçakale","Birecik","Bozova","Ceylanpınar","Eyyübiye","Halfeti","Haliliye","Harran","Hilvan","Karaköprü","Siverek","Suruç","Viranşehir"] },
  // 64 - Uşak
  { code: "64", name: "Uşak", d: ["Banaz","Eşme","Karahallı","Merkez","Sivaslı","Ulubey"] },
  // 65 - Van
  { code: "65", name: "Van", d: ["Bahçesaray","Başkale","Çaldıran","Çatak","Edremit","Erciş","Gevaş","Gürpınar","İpekyolu","Muradiye","Özalp","Saray","Tuşba"] },
  // 66 - Yozgat
  { code: "66", name: "Yozgat", d: ["Akdağmadeni","Aydıncık","Boğazlıyan","Çandır","Çayıralan","Çekerek","Kadışehri","Merkez","Saraykent","Sarıkaya","Sorgun","Şefaatli","Yenifakılı","Yerköy"] },
  // 67 - Zonguldak
  { code: "67", name: "Zonguldak", d: ["Alaplı","Çaycuma","Devrek","Gökçebey","Karadeniz Ereğli","Kilimli","Kozlu","Merkez"] },
  // 68 - Aksaray
  { code: "68", name: "Aksaray", d: ["Ağaçören","Eskil","Gülağaç","Güzelyurt","Merkez","Ortaköy","Sarıyahşi","Sultanhanı"] },
  // 69 - Bayburt
  { code: "69", name: "Bayburt", d: ["Aydıntepe","Demirözü","Merkez"] },
  // 70 - Karaman
  { code: "70", name: "Karaman", d: ["Ayrancı","Başyayla","Ermenek","Kazımkarabekir","Merkez","Sarıveliler"] },
  // 71 - Kırıkkale
  { code: "71", name: "Kırıkkale", d: ["Bahşılı","Balışeyh","Çelebi","Delice","Karakeçili","Keskin","Merkez","Sulakyurt","Yahşihan"] },
  // 72 - Batman
  { code: "72", name: "Batman", d: ["Beşiri","Gercüş","Hasankeyf","Kozluk","Merkez","Sason"] },
  // 73 - Şırnak
  { code: "73", name: "Şırnak", d: ["Beytüşşebap","Cizre","Güçlükonak","İdil","Merkez","Silopi","Uludere"] },
  // 74 - Bartın
  { code: "74", name: "Bartın", d: ["Amasra","Kurucaşile","Merkez","Ulus"] },
  // 75 - Ardahan
  { code: "75", name: "Ardahan", d: ["Çıldır","Damal","Göle","Hanak","Merkez","Posof"] },
  // 76 - Iğdır
  { code: "76", name: "Iğdır", d: ["Aralık","Karakoyunlu","Merkez","Tuzluca"] },
  // 77 - Yalova
  { code: "77", name: "Yalova", d: ["Altınova","Armutlu","Çınarcık","Çiftlikköy","Merkez","Termal"] },
  // 78 - Karabük
  { code: "78", name: "Karabük", d: ["Eflani","Eskipazar","Merkez","Ovacık","Safranbolu","Yenice"] },
  // 79 - Kilis
  { code: "79", name: "Kilis", d: ["Elbeyli","Merkez","Musabeyli","Polateli"] },
  // 80 - Osmaniye
  { code: "80", name: "Osmaniye", d: ["Bahçe","Düziçi","Hasanbeyli","Kadirli","Merkez","Sumbas","Toprakkale"] },
  // 81 - Düzce
  { code: "81", name: "Düzce", d: ["Akçakoca","Cumayeri","Çilimli","Gölyaka","Gümüşova","Kaynaşlı","Merkez","Yığılca"] }
];

export function getDistrictsByProvince(provinceCode) {
  const province = TURKEY_DISTRICTS.find((p) => p.code === provinceCode);
  return province ? province.d : [];
}
