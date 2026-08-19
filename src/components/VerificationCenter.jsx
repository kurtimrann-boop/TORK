"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { normalizePhoneNumber } from "../utils/phoneUtils";
import { getAuthHeader, getValidSession } from "../utils/authSessionHelper";
import { supabase } from "../supabase";

export default function VerificationCenter({
  userProfile,
  onNavigateToMarketplace,
  onVerificationUpdate,
}) {
  const isInitiallyPhoneVerified = Boolean(userProfile?.phone_verified ?? userProfile?.phoneVerified);
  const isInitiallyIdentityVerified = Boolean(userProfile?.identity_verified ?? userProfile?.identityVerified);
  const initialPhone = userProfile?.phone_number || userProfile?.phone || "";

  // Global verification state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verificationData, setVerificationData] = useState({
    phoneVerified: isInitiallyPhoneVerified,
    identityVerified: isInitiallyIdentityVerified,
    phoneNumber: initialPhone || null,
    verificationLevel: isInitiallyPhoneVerified && isInitiallyIdentityVerified ? "FULLY_VERIFIED" : "UNVERIFIED",
    isEligibleForMarketplace: isInitiallyPhoneVerified && isInitiallyIdentityVerified,
    missingSteps: [
      !isInitiallyPhoneVerified ? "PHONE_VERIFICATION_REQUIRED" : null,
      !isInitiallyIdentityVerified ? "IDENTITY_DOCUMENT_REQUIRED" : null,
    ].filter(Boolean),
    documentStatus: "not_uploaded",
  });

  // Phone state
  const [rawPhone, setRawPhone] = useState(initialPhone);
  const [phoneStep, setPhoneStep] = useState(isInitiallyPhoneVerified ? "verified" : "input"); // 'input', 'otp', 'verified', 'locked'
  const [verificationId, setVerificationId] = useState(null);
  const [otpCode, setOtpCode] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState(null);
  const [phoneSuccessMsg, setPhoneSuccessMsg] = useState(null);
  const [countdown, setCountdown] = useState(0);

  // Document / OCR state
  const [docFile, setDocFile] = useState(null);
  const [docDragActive, setDocDragActive] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState(null);
  const [docSuccessMsg, setDocSuccessMsg] = useState(null);
  const [documentDetails, setDocumentDetails] = useState(null);
  const fileInputRef = useRef(null);

  const fetchDocumentStatus = useCallback(async () => {
    try {
      const authHeaders = await getAuthHeader();
      if (!authHeaders?.Authorization) return;
      const res = await fetch("/api/verification/document/status", { headers: authHeaders });
      const data = await res.json();
      if (data.success && data.document) {
        setDocumentDetails(data.document);
      }
    } catch {
      // safe fallback
    }
  }, []);

  const fetchVerificationStatus = useCallback(async () => {
    try {
      const authHeaders = await getAuthHeader();
      if (!authHeaders?.Authorization) return;
      const res = await fetch("/api/verification/status", { headers: authHeaders });
      const data = await res.json();
      if (data.success && data.verification) {
        setVerificationData(data.verification);
        if (data.verification.phoneVerified) {
          setPhoneStep("verified");
          setRawPhone(data.verification.phoneNumber || "");
        }
        if (data.verification.documentStatus) {
          fetchDocumentStatus();
        }
      }
    } catch {
      setError("Doğrulama durumu alınırken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [fetchDocumentStatus]);

  // Fetch initial verification status on mount or when userProfile updates
  useEffect(() => {
    if (!userProfile?.id) return;
    let isMounted = true;
    async function loadStatus() {
      try {
        const authHeaders = await getAuthHeader();
        if (!authHeaders?.Authorization) return;
        const res = await fetch("/api/verification/status", { headers: authHeaders });
        const data = await res.json();
        if (isMounted && data.success && data.verification) {
          setVerificationData(data.verification);
          if (data.verification.phoneVerified) {
            setPhoneStep("verified");
            setRawPhone(data.verification.phoneNumber || "");
          }
          if (data.verification.documentStatus) {
            const docRes = await fetch("/api/verification/document/status", { headers: authHeaders });
            const docData = await docRes.json();
            if (isMounted && docData.success && docData.document) {
              setDocumentDetails(docData.document);
            }
          }
        }
      } catch {
        // Fallback gracefully on profile props
      }
    }

    loadStatus();
    return () => {
      isMounted = false;
    };
  }, [userProfile]);

  // Countdown timer effect
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // 1. Phone OTP Request
  const handleRequestOtp = async (e) => {
    e?.preventDefault();
    setPhoneError(null);
    setPhoneSuccessMsg(null);

    const norm = normalizePhoneNumber(rawPhone);
    if (!norm.valid) {
      setPhoneError(norm.error);
      return;
    }

    setPhoneLoading(true);
    try {
      const authHeaders = await getAuthHeaders();
      const headers = {
        "Content-Type": "application/json",
        ...authHeaders,
      };
      const res = await fetch("/api/verification/phone/request", {
        method: "POST",
        headers,
        body: JSON.stringify({ phoneNumber: norm.e164 }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setPhoneError(data.error || "SMS kodu gönderilemedi.");
        return;
      }

      setVerificationId(data.verificationId);
      setPhoneStep("otp");
      setCountdown(300); // 5 minutes
      setPhoneSuccessMsg("6 haneli SMS doğrulama kodu telefonunuza iletildi.");
    } catch {
      setPhoneError("Sunucu bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setPhoneLoading(false);
    }
  };

  // 2. Phone OTP Confirm
  const handleConfirmOtp = async (e) => {
    e?.preventDefault();
    setPhoneError(null);
    setPhoneSuccessMsg(null);

    if (!otpCode || otpCode.trim().length !== 6) {
      setPhoneError("Lütfen 6 haneli doğrulama kodunu eksiksiz giriniz.");
      return;
    }

    setPhoneLoading(true);
    try {
      const authHeaders = await getAuthHeaders();
      const headers = {
        "Content-Type": "application/json",
        ...authHeaders,
      };
      const res = await fetch("/api/verification/phone/confirm", {
        method: "POST",
        headers,
        body: JSON.stringify({
          verificationId,
          otpCode: otpCode.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.code === "RATE_LIMITED" || data.error?.includes("kilitlendi")) {
          setPhoneStep("locked");
        }
        setPhoneError(data.error || "Hatalı doğrulama kodu.");
        return;
      }

      setPhoneStep("verified");
      setPhoneSuccessMsg("Telefon numaranız başarıyla doğrulandı!");
      fetchVerificationStatus();
      if (onVerificationUpdate) onVerificationUpdate();
    } catch {
      setPhoneError("Doğrulama onaylanırken bir hata oluştu.");
    } finally {
      setPhoneLoading(false);
    }
  };

  // 3. Document File Selection & Drag-Drop
  const handleFileDrop = (e) => {
    e.preventDefault();
    setDocDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    setDocError(null);
    setDocSuccessMsg(null);

    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setDocError("Yalnızca JPG, JPEG, PNG veya PDF formatındaki ehliyet dosyaları kabul edilmektedir.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setDocError("Dosya boyutu en fazla 10MB olabilir.");
      return;
    }

    setDocFile(file);
  };

  // 4. Document Upload & OCR Trigger
  const handleUploadDocument = async () => {
    if (!docFile) {
      setDocError("Lütfen yüklenecek ehliyet belgesini seçin.");
      return;
    }

    setDocLoading(true);
    setDocError(null);
    setDocSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", docFile);

      const authHeaders = await getAuthHeaders();
      const res = await fetch("/api/verification/document/upload", {
        method: "POST",
        headers: authHeaders,
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setDocError(data.error || "Belge yüklenemedi veya okunamadı.");
        return;
      }

      setDocumentDetails(data);
      setDocSuccessMsg(data.message || "Ehliyet belgesi başarıyla işlendi.");
      fetchVerificationStatus();
      if (onVerificationUpdate) onVerificationUpdate();
    } catch {
      setDocError("Belge yükleme sırasında bağlantı hatası oluştu.");
    } finally {
      setDocLoading(false);
    }
  };

  const isMarketplaceUnlocked =
    verificationData.phoneVerified && verificationData.identityVerified;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 p-4 md:p-6 lg:p-8 animate-fadeIn text-slate-100">
      {/* HEADER & OVERVIEW BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                TORK ÜYELİK VE GÜVENLİK MERKEZİ
              </span>
              <span className={`px-3 py-1 text-xs font-medium rounded-full border ${
                isMarketplaceUnlocked
                  ? "bg-emerald-900/40 text-emerald-300 border-emerald-700/50"
                  : "bg-amber-900/40 text-amber-300 border-amber-700/50"
              }`}>
                {isMarketplaceUnlocked ? "TAM DOĞRULANDI" : "DOĞRULAMA BEKLİYOR"}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Taşıyıcı Doğrulama Merkezi
            </h1>
            <p className="mt-2 text-sm text-slate-400 max-w-2xl">
              TORK Yük Borsası&apos;nda navlun teklifi verebilmek ve sefer alabilmek için telefon ve sürücü belgesi (ehliyet) doğrulama adımlarını tamamlayınız.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {isMarketplaceUnlocked ? (
              <button
                onClick={onNavigateToMarketplace}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Yük Borsasına Git</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            ) : (
              <div className="px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Teklif vermek için doğrulama zorunludur</span>
              </div>
            )}
          </div>
        </div>

        {/* SECTION A: KPI / STATUS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-800/80">
          {/* Phone KPI */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Telefon Doğrulaması</p>
              <p className="text-base font-semibold text-white mt-1">
                {verificationData.phoneVerified ? "Doğrulandı" : "Doğrulama Gerekli"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {verificationData.phoneNumber || "Henüz kaydedilmedi"}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              verificationData.phoneVerified ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
            }`}>
              {verificationData.phoneVerified ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              )}
            </div>
          </div>

          {/* Sürücü Belgesi KPI */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Sürücü Belgesi (Ehliyet)</p>
              <p className="text-base font-semibold text-white mt-1">
                {verificationData.identityVerified
                  ? "Doğrulandı"
                  : documentDetails?.status === "manual_review"
                  ? "Manuel İnceleme"
                  : documentDetails?.status === "processing"
                  ? "İşleniyor"
                  : documentDetails?.status === "rejected"
                  ? "Yeniden Yükleyin"
                  : "Belge Bekleniyor"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {documentDetails?.ocr_confidence ? `OCR Güveni: %${documentDetails.ocr_confidence}` : "OCR Analizi"}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              verificationData.identityVerified
                ? "bg-emerald-500/20 text-emerald-400"
                : documentDetails?.status === "manual_review"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-amber-500/20 text-amber-400"
            }`}>
              {verificationData.identityVerified ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
            </div>
          </div>

          {/* Marketplace Access Status */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Yük Borsası Yetkisi</p>
              <p className={`text-base font-semibold mt-1 ${isMarketplaceUnlocked ? "text-emerald-400" : "text-amber-400"}`}>
                {isMarketplaceUnlocked ? "Teklif Verme Açık" : "Kilitli (Doğrulama Eksik)"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {isMarketplaceUnlocked ? "Aktif Sefer Alabilir" : "Teklif verilemez"}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isMarketplaceUnlocked ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400"
            }`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* TWO COLUMN INTERACTIVE FORM SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* SECTION B: TELEFON DOĞRULAMA */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <h2 className="text-lg font-bold text-white">Telefon Doğrulaması</h2>
              </div>
              {verificationData.phoneVerified && (
                <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                  ✓ Doğrulandı
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Yük verenler ve operasyon merkezinin acil durumlarda size ulaşabilmesi için Türkiye cep telefonu numaranızı doğrulayınız.
            </p>

            {phoneError && (
              <div className="p-3.5 mb-4 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{phoneError}</span>
              </div>
            )}

            {phoneSuccessMsg && (
              <div className="p-3.5 mb-4 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{phoneSuccessMsg}</span>
              </div>
            )}

            {phoneStep === "locked" ? (
              <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-center space-y-3">
                <p className="text-sm font-semibold text-red-300">Güvenlik Sebebiyle Kilitlendi</p>
                <p className="text-xs text-slate-400">
                  3 kez hatalı kod girildiği için doğrulama işlemi kilitlenmiştir. Lütfen yeni bir kod talep ediniz.
                </p>
                <button
                  onClick={() => {
                    setPhoneStep("input");
                    setOtpCode("");
                    setPhoneError(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white font-medium cursor-pointer"
                >
                  Yeniden Numara Gir
                </button>
              </div>
            ) : phoneStep === "verified" ? (
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Kayıtlı ve Doğrulanmış Numara</p>
                  <p className="text-base font-bold text-emerald-300 mt-1">{verificationData.phoneNumber || rawPhone}</p>
                </div>
                <span className="text-emerald-400 text-xs font-semibold">Aktif</span>
              </div>
            ) : phoneStep === "input" ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label htmlFor="phone-input" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Cep Telefonu Numarası
                  </label>
                  <div className="relative">
                    <input
                      id="phone-input"
                      type="tel"
                      value={rawPhone}
                      onChange={(e) => setRawPhone(e.target.value)}
                      placeholder="05XX XXX XX XX"
                      aria-label="Cep Telefonu Numarası"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Örnek: 0532 123 45 67 veya +905321234567</p>
                </div>

                <button
                  type="submit"
                  disabled={phoneLoading || !rawPhone.trim()}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {phoneLoading ? "Kod Gönderiliyor..." : "Doğrulama Kodu Gönder"}
                </button>
              </form>
            ) : (
              /* OTP Code Step */
              <form onSubmit={handleConfirmOtp} className="space-y-4 animate-fadeIn">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="otp-input" className="text-xs font-medium text-slate-300">
                      6 Haneli SMS Kodu
                    </label>
                    <span className="text-xs text-amber-400 font-mono">
                      {countdown > 0 ? `${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, "0")}` : "Süre Doldu"}
                    </span>
                  </div>
                  <input
                    id="otp-input"
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    aria-label="6 Haneli Doğrulama Kodu"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-center tracking-widest font-mono text-lg placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPhoneStep("input")}
                    className="w-1/3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                  >
                    Geri
                  </button>
                  <button
                    type="submit"
                    disabled={phoneLoading || otpCode.length !== 6 || countdown <= 0}
                    className="w-2/3 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm transition-all cursor-pointer"
                  >
                    {phoneLoading ? "Doğrulanıyor..." : "Doğrula"}
                  </button>
                </div>

                {countdown <= 0 && (
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    className="w-full text-center text-xs text-emerald-400 hover:underline pt-2 cursor-pointer"
                  >
                    Yeni Kod Gönder
                  </button>
                )}
              </form>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Numaranız gizli tutulur, SHA-256 OTP doğrulaması ile güvence altındadır.</span>
          </div>
        </div>

        {/* SECTION C: EHLİYET & KİMLİK OCR DOĞRULAMA */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <h2 className="text-lg font-bold text-white">Sürücü Belgesi (Ehliyet)</h2>
              </div>
              {verificationData.identityVerified && (
                <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                  ✓ Doğrulandı
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Sürücü belgenizin (Ehliyet) ön yüz fotoğrafını yükleyiniz. TORK akıllı OCR motoru bilgileri otomatik olarak okur.
            </p>

            {docError && (
              <div className="p-3.5 mb-4 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{docError}</span>
              </div>
            )}

            {docSuccessMsg && (
              <div className="p-3.5 mb-4 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{docSuccessMsg}</span>
              </div>
            )}

            {/* Extracted Details Card if available */}
            {documentDetails?.ocr_data ? (
              <div className="p-4 mb-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-medium text-slate-400">OCR Okuma Sonucu</span>
                  <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                    %{documentDetails.ocr_confidence || 95} Güven
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Adı Soyadı:</span>
                    <p className="font-semibold text-white">
                      {documentDetails.ocr_data.firstName || ""} {documentDetails.ocr_data.surname || ""}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Belge No:</span>
                    <p className="font-semibold text-white font-mono">
                      {documentDetails.ocr_data.documentNumber
                        ? `****${documentDetails.ocr_data.documentNumber.slice(-4)}`
                        : "******"}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Sınıf:</span>
                    <p className="font-semibold text-emerald-400">
                      {documentDetails.ocr_data.licenseClasses?.join(", ") || "C, CE"}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Geçerlilik:</span>
                    <p className="font-semibold text-white">
                      {documentDetails.ocr_data.expiryDate || "Geçerli"}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Upload Area */}
            {!verificationData.identityVerified && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDocDragActive(true);
                }}
                onDragLeave={() => setDocDragActive(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  docDragActive
                    ? "border-emerald-500 bg-emerald-950/20"
                    : "border-slate-700 bg-slate-950/50 hover:border-slate-600"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
                  }}
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 mx-auto flex items-center justify-center text-slate-400 mb-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>

                <p className="text-xs font-semibold text-white">
                  {docFile ? docFile.name : "Belgeyi buraya sürükleyin veya seçin"}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  JPG, PNG veya PDF (Maksimum 10MB)
                </p>
              </div>
            )}

            {!verificationData.identityVerified && (
              <button
                onClick={handleUploadDocument}
                disabled={docLoading || !docFile}
                className="w-full mt-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {docLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>OCR Analizi Yapılıyor...</span>
                  </>
                ) : (
                  "Belgeyi Yükle ve Doğrula"
                )}
              </button>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Yüklenen belgeler özel izolasyonlu depolamada saklanır, üçüncü taraflarla paylaşılmaz.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
