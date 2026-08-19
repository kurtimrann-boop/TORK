# TORK Production Runbook & Incident Response Guide

> **Sürüm:** 1.0.0 (Production Go-Live Ready)  
> **Hedef:** Operasyon, DevOps ve Mühendislik ekipleri için olay müdahale, sağlık denetimi ve kurtarma prosedürleri.

---

## 1. Sistem Sağlık Kontrolü (Health Checks)
- **Canlılık Endpoint'i:** `GET /api/health`
  - `status: "healthy"` $\rightarrow$ Sistem ve veritabanı aktif (HTTP 200).
  - `status: "degraded"` $\rightarrow$ Veritabanı bağlantısında gecikme veya kısmi erişim (HTTP 200).
  - `status: "unhealthy"` $\rightarrow$ Kritik bağlantı kesintisi (HTTP 503).
- **Hazırlık Endpoint'i:** `GET /api/ready`
  - Tüm çekirdek tabloların (`profiles`, `loads`, `bids`, `transports`, `settlements`, `wallet_transactions`) durumunu döner.

---

## 2. Veritabanı Kontrol Prosedürü
- **Canlılık Testi:**
  ```bash
  node scripts/probe-db.mjs
  ```
- **RLS & İzolasyon Doğrulaması:**
  ```bash
  node scripts/test-sprint10-database-smoke.mjs
  ```

---

## 3. Kimlik Doğrulama & Oturum Denetimi
- Oturum açma hataları ve token süre sonu durumlarında istemciye `401 Unauthorized` dönülür.
- Rol yetkilendirme (`admin`, `operator`, `shipper`, `carrier`) veritabanındaki `profiles.role` kaydı esas alınarak doğrulanır; istemci tarafı rol talepleri reddedilir.

---

## 4. Kritik Olay (Critical Incident) Prosedürü
1. **Olayın Tespiti:** Control Tower `/api/control-tower` üzerinden `CRITICAL` seviyeli operasyonel alarmları inceleyin.
2. **Korelasyon ID Takibi:** İstemciden veya hata loglarından gelen `requestId` (`tork-req-...`) üzerinden `audit_logs` tablosunu filtreleyin:
   ```sql
   SELECT * FROM public.audit_logs WHERE metadata->>'requestId' = 'tork-req-xyz';
   ```
3. **Müdahale & Durdurma:** Hata yayılımını önlemek için ilgili seferi askıya alın veya destek ekibine yönlendirin.

---

## 5. Mutabakat & Ödeme Olayı Prosedürü (Settlement Incident)
- **Kural:** `PAID` durumundaki bir mutabakat geriye dönük `DRAFT` veya tekrar `PAID` yapılamaz.
- **İtiraz Durumu:** Bir yük veren veya taşıyıcı anlaşmazlık bildirirse `/api/settlements/[id]/dispute` çağrılır; bakiye derhal `disputed` olarak dondurulur ve kullanılabilir cüzdandan izole edilir.

---

## 6. Cüzdan Bakiyesi & Mükerrer Ödeme Engeli (Wallet Incident)
- Cüzdan bakiyesi veritabanındaki tamamlanmış mutabakatların tekil (`UNIQUE`) `settlement_id` kayıtları üzerinden türetilir.
- Mükerrer ödeme çağrıları idempotency kuralı gereği ikinci kez kredi oluşturmaz ve yutulur/reddedilir.

---

## 7. Teslimat Kanıtı Olay Prosedürü (POD Incident)
- Yüklenen POD belgesi operatör onayından geçmeden taşıma durumu `SETTLED` veya `PAID` yapılamaz.
- POD reddedildiğinde gerekçe `rejection_reason` olarak kaydedilir ve taşıyıcıya bildirim gönderilerek yeni belge talep edilir.

---

## 8. Veritabanı Migration Prosedürü
- Migration dosyaları `supabase/migrations/` dizininde saklanır.
- Asla `DROP TABLE`, `DROP COLUMN` veya `TRUNCATE` içeren yıkıcı SQL komutları çalıştırılmaz.
- Yeni migration'lar `IF NOT EXISTS` ve `DO $$ BEGIN ... END $$;` blokları ile idempotent olarak tasarlanır.

---

## 9. Geri Alma (Rollback) Prosedürü
1. Uygulama deployment'ı bir önceki kararlı sürüme çekilir.
2. Veritabanında eklenen yeni kolonlar `nullable` veya `DEFAULT` değer içerdiği için eski uygulama sürümüyle geriye dönük uyumlu çalışır.

---

## 10. Audit İnceleme Prosedürü
- Tüm operasyonel olaylar (`LOAD_CREATED`, `BID_ACCEPTED`, `TRANSPORT_STATUS_CHANGED`, `POD_VERIFIED`, `SETTLEMENT_PAID`) `audit_logs` tablosunda saklanır.
- Hassas sırlar (şifreler, bearer token'lar, API anahtarları) `[REDACTED]` ile maskelenmiş olarak depolanır.

---

## 11. Güvenlik İhlali Müdahale Prosedürü (Security Incident)
- Yetkisiz IDOR veya rol eskalasyonu denemeleri derhal `403 Forbidden` ile engellenir ve güvenlik olayı olarak kaydedilir.
- Etkilenen kullanıcı oturumu Supabase Auth üzerinden sonlandırılır.

---

## 12. Production Deployment Kontrol Listesi (Checklist)
- [x] Tüm birim ve entegrasyon testleri başarılı (`30/30` Sprint 12 Go-Live, Sprint 1–11 regresyonu).
- [x] `npm run lint` 0 hata ile geçti.
- [x] `npm run build` başarıyla tamamlandı.
- [x] `.env.local` ve gizli anahtarlar git geçmişinde yer almıyor.
- [x] Canlı veritabanı bağlantısı ve RLS izolasyonu doğrulandı.
