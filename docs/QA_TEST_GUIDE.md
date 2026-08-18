# TORK — QA Test & Validation Guide

Bu doküman, TORK B2B Akıllı Navlun Pazaryeri için oluşturulan QA test ortamını, sentetik kullanıcı hesaplarını, veri setini ve test senaryolarını açıklar.

> [!IMPORTANT]
> **GÜVENLİK & GİZLİLİK POLİTİKASI**
> Bu test ortamı tamamen sentetik verilerle izole edilmiştir. Gerçek kullanıcı veya şirket verisi içermez. Şifreler ve API anahtarları bu dokümanda yer almaz; yerel ortam değişkenleri (`QA_PASSWORD`) üzerinden yönetilir.

---

## 1. QA Kullanıcı Hesapları (Personalar)

| Persona | E-posta | Rol | Şirket Adı | Telefon |
| :--- | :--- | :--- | :--- | :--- |
| **QA Yük Veren (Shipper)** | `qa-shipper@tork.test` | `shipper` | TORK QA Shipper | `+90 555 000 0001` |
| **QA Nakliyeci (Carrier)** | `qa-carrier@tork.test` | `carrier` | TORK QA Carrier | `+90 555 000 0002` |

---

## 2. Sentetik Test Veri Seti

### A. Yük İlanları (`loads`)

| # | Başlangıç (Origin) | Varış (Destination) | Tonaj | Araç Tipi | Durum | Açıklama |
| :- | :--- | :--- | :- | :--- | :- | :--- |
| **1** | Trabzon / Ortahisar | İstanbul / Arnavutköy | 24 Ton | TIR (Tenteli) | `open` | 1.069 km Karadeniz - Marmara ana rotası, bekleyen teklif var. |
| **2** | Ankara / Çankaya | İzmir / Bornova | 18 Ton | Kamyon (Kapalı Kasa) | `open` | 585 km İç Anadolu - Ege rotası, reddedilen teklif örneği. |
| **3** | Gaziantep / Şehitkamil | Antalya / Kepez | 22 Ton | TIR (Damperli) | `open` | 745 km Güneydoğu - Akdeniz dökme yük rotası, bekleyen teklif var. |
| **4** | İstanbul / Arnavutköy | Trabzon / Ortahisar | 20 Ton | TIR (Tenteli) | `assigned` | Atanmış aktif sevkiyat (Kabul edilmiş teklife bağlı). |

### B. Teklifler (`bids`)

| # | İlgili Yük | Teklif Tutarı | Teklif Durumu | Açıklama |
| :- | :--- | :- | :--- | :--- |
| **1** | Trabzon $\rightarrow$ İstanbul | ₺48.500 | `pending` | QA Carrier tarafından verilen aktif teklif. |
| **2** | Ankara $\rightarrow$ İzmir | ₺36.000 | `rejected` | QA Shipper tarafından reddedilen teklif. |
| **3** | Gaziantep $\rightarrow$ Antalya | ₺42.000 | `pending` | İnceleme bekleyen açık teklif. |
| **4** | İstanbul $\rightarrow$ Trabzon | ₺46.000 | `accepted` | Kabul edilmiş ve yükü `assigned` durumuna getirmiş teklif. |

---

## 3. QA Test Senaryoları & Kontrol Listesi

### Senaryo 1: Yük Veren (Shipper) Akışı

1. **Giriş (Auth):**
   - Giriş ekranında **"Yük Veren"** rolünü seçin.
   - `qa-shipper@tork.test` ve test şifrenizle giriş yapın.
   - Dashboard'da **"TORK QA Shipper"** şirket adını ve Canlı Operasyon Hub'ını doğrulayın.

2. **İlanları Görüntüleme & Yönetme:**
   - Sol menüden **"İlanlarım"** sekmesine geçin.
   - 3 adet açık (`open`) ve 1 adet atanmış (`assigned`) ilanı listeleyin.
   - Filtreleri test edin: *Tümü*, *Teklife Açık*, *Atanmış*.

3. **Yeni Yük Oluşturma & Rota Haritası:**
   - **"+ Yeni Yük"** butonuna tıklayın.
   - Yükleme ili olarak **"Trabzon"**, ilçesi olarak **"Ortahisar"** seçin $\rightarrow$ Haritada yeşil origin pini odaklanmalı.
   - Teslimat ili olarak **"İstanbul"**, ilçesi olarak **"Arnavutköy"** seçin $\rightarrow$ Haritada sarı destination pini ve 1.069 km'lik çift katmanlı zümrüt rota çizgisi belirmeli.
   - Adımları ilerleyip ilanı kaydedin.

4. **Gelen Teklifleri İnceleme, Karşılaştırma & Kabul/Red:**
   - **"Gelen Teklifler"** sekmesine geçin.
   - Teklif kartlarındaki **₺/km (Birim Fiyat)** etiketlerini kontrol edin.
   - **"Teklifleri Karşılaştır"** butonuna basarak modal tablosunu inceleyin.
   - Açık tekliflerden birini **Kabul Et** veya **Reddet** yaparak RPC tetiklenmesini doğrulayın.

---

### Senaryo 2: Nakliyeci / Taşıyıcı (Carrier) Akışı

1. **Giriş (Auth):**
   - Giriş ekranında **"Nakliyeci"** rolünü seçin.
   - `qa-carrier@tork.test` ve test şifrenizle giriş yapın.
   - Terminalde **"Taşıyıcı Filo Terminali"** başlığını doğrulayın.

2. **Açık Yükleri Arama & Teklif Verme:**
   - **"Uygun Yükler"** pazaryeri sekmesine geçin.
   - Ağdaki açık yükleri inceleyin.
   - Bir yüke tıklayarak detayını ve rota haritasını görüntüleyin.
   - **"Teklif Ver"** ile yeni bir navlun tutarı iletin.

3. **Aktif Taşımalar & Sevkiyat İzleme:**
   - **"Aktif Taşımalar"** sekmesine geçin.
   - Atanmış sevkiyatı (İstanbul $\rightarrow$ Trabzon, ₺46.000) listeleyin.
   - Rota ve teslimat bilgilerini kontrol edin.

---

## 4. RLS & Veri İzolasyon Doğrulaması

- **Shipper İzolasyonu:** Shipper yalnızca kendi oluşturduğu yükleri ve o yüklere gelen teklifleri görebilir. Başka yük verenlerin ilanlarını veya tekliflerini göremez.
- **Carrier İzolasyonu:** Carrier yalnızca açık (`status = 'open'`) yükleri görebilir; diğer taşıyıcıların teklif tutarlarını doğrudan göremez. Yalnızca kendi verdiği teklifleri yönetebilir.
- **Kritik Durum Geçişleri:** Teklif kabul ve yük atama işlemleri doğrudan istemci güncellemesi ile değil, atomik Supabase RPC (`accept_bid_and_assign_load`) fonksiyonu ile güvenle yürütülür.

---

## 5. QA Veri Sıfırlama (Seed / Reset) Komutu

Test verilerini ilk durumuna getirmek veya yeniden oluşturmak için yerel ortamda aşağıdaki komutu çalıştırabilirsiniz:

```bash
TORK_QA_MODE=true node scripts/seed-qa-data.mjs --qa
```

> **Not:** Script `TORK_QA_MODE=true` ortam değişkeni olmadan çalışmaz; yanlışlıkla üretim ortamına uygulanması engellenmiştir.
