"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import VerificationCenter from "./VerificationCenter";
import { normalizePhoneNumber } from "../utils/phoneUtils";
import { getAuthHeader, getValidSession } from "../utils/authSessionHelper";
import { calculateCarrierTrustScore } from "../utils/carrierTrustService";
import { VEHICLE_TYPES, TRAILER_TYPES, validateVehiclePayload } from "../utils/vehicleService";
import { supabase } from "../supabase";

export default function UserProfileManager({
  userProfile,
  onProfileUpdated,
  onNavigateToTab,
}) {
  const role = userProfile?.role || "carrier";
  const isCarrier = role === "carrier";

  // Section & Mode state
  const [activeSubTab, setActiveSubTab] = useState("general"); // 'general', 'verification', 'vehicles', 'company'
  const [isEditing, setIsEditing] = useState(false);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);

  // Form states
  const [fullName, setFullName] = useState(userProfile?.full_name || userProfile?.name || "");
  const [phone, setPhone] = useState(userProfile?.phone_number || userProfile?.phone || "");
  const [companyName, setCompanyName] = useState(userProfile?.company_name || userProfile?.legal_company_name || "");
  const [taxNumber, setTaxNumber] = useState(userProfile?.tax_number || "");
  const [taxOffice, setTaxOffice] = useState(userProfile?.tax_office || "");
  const [companyAddress, setCompanyAddress] = useState(userProfile?.company_address || "");

  // Avatar states
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatar_url || null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState(null);
  const avatarInputRef = useRef(null);

  // Vehicles fleet state
  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehicleError, setVehicleError] = useState(null);
  const [newVehicle, setNewVehicle] = useState({
    plateNumber: "",
    vehicleType: "TIR",
    brand: "",
    model: "",
    modelYear: new Date().getFullYear(),
    capacityTons: 24.0,
    trailerType: "Tenteli",
  });

  // Trust score calculation (deterministic & honest)
  const trustScoreResult = calculateCarrierTrustScore({
    totalAssigned: userProfile?.completed_transports_count ?? 0,
    completedTransports: userProfile?.completed_transports_count ?? 0,
    totalPods: userProfile?.verified_pod_count ?? 0,
    verifiedPods: userProfile?.verified_pod_count ?? 0,
    totalSettlements: userProfile?.completed_transports_count ?? 0,
    disputedSettlements: userProfile?.disputes_count ?? 0,
    cancelledTransports: userProfile?.cancellations_count ?? 0,
  });

  const isPhoneVerified = Boolean(userProfile?.phone_verified ?? userProfile?.phoneVerified);
  const isIdentityVerified = Boolean(userProfile?.identity_verified ?? userProfile?.identityVerified);
  const isFullyVerified = isPhoneVerified && isIdentityVerified;

  // Load Carrier Vehicles
  const loadVehicles = useCallback(async () => {
    if (!isCarrier) return;
    try {
      const authHeaders = await getAuthHeader();
      if (!authHeaders?.Authorization) return;
      setVehiclesLoading(true);
      const res = await fetch("/api/carriers/vehicles", { headers: authHeaders });
      const data = await res.json();
      if (data.success && Array.isArray(data.vehicles)) {
        setVehicles(data.vehicles);
      }
    } catch {
      // safe fallback
    } finally {
      setVehiclesLoading(false);
    }
  }, [isCarrier]);

  useEffect(() => {
    let isCancelled = false;
    async function fetchFleet() {
      if (!userProfile?.id || !isCarrier) return;
      try {
        const authHeaders = await getAuthHeader();
        if (!authHeaders?.Authorization || isCancelled) return;
        const res = await fetch("/api/carriers/vehicles", { headers: authHeaders });
        const data = await res.json();
        if (!isCancelled && data.success && Array.isArray(data.vehicles)) {
          setVehicles(data.vehicles);
        }
      } catch {
        // safe fallback
      }
    }
    fetchFleet();
    return () => {
      isCancelled = true;
    };
  }, [userProfile?.id, isCarrier]);

  // Avatar Upload Handler
  const handleAvatarSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);
    setAvatarLoading(true);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const authHeaders = await getAuthHeader();
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: {
          Authorization: authHeaders.Authorization,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Profil fotoğrafı yüklenemedi.");
      }

      setAvatarUrl(data.avatarUrl);
      setAvatarError(null);
      if (onProfileUpdated) {
        onProfileUpdated({ ...userProfile, avatar_url: data.avatarUrl });
      }
    } catch (err) {
      setAvatarError(err.message);
    } finally {
      setAvatarLoading(false);
    }
  };

  // Save General Profile Info
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const session = await getValidSession();
      if (!session?.user?.id) {
        alert("Oturum süresi dolmuş. Lütfen tekrar giriş yapın.");
        return;
      }

      const updates = {
        full_name: fullName,
        phone_number: phone ? normalizePhoneNumber(phone) : null,
        company_name: companyName,
        tax_number: taxNumber,
        tax_office: taxOffice,
        company_address: companyAddress,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", session.user.id);

      if (error) throw error;

      setIsEditing(false);
      if (onProfileUpdated) {
        onProfileUpdated({ ...userProfile, ...updates });
      }
    } catch (err) {
      alert(`Güncelleme hatası: ${err.message}`);
    }
  };

  // Add Vehicle Handler
  const handleAddVehicle = async (e) => {
    e.preventDefault();
    setVehicleError(null);

    const validation = validateVehiclePayload(newVehicle);
    if (!validation.isValid) {
      setVehicleError(validation.error);
      return;
    }

    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch("/api/carriers/vehicles", {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newVehicle),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Araç eklenemedi.");
      }

      setVehicles((prev) => [data.vehicle, ...prev]);
      setShowAddVehicleModal(false);
      setNewVehicle({
        plateNumber: "",
        vehicleType: "TIR",
        brand: "",
        model: "",
        modelYear: new Date().getFullYear(),
        capacityTons: 24.0,
        trailerType: "Tenteli",
      });
    } catch (err) {
      setVehicleError(err.message);
    }
  };

  // Delete Vehicle Handler
  const handleDeleteVehicle = async (vehicleId) => {
    if (!confirm("Bu aracı filonuzdan kaldırmak istediğinize emin misiniz?")) return;

    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch(`/api/carriers/vehicles/${vehicleId}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Araç silinemedi.");
      }

      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
    } catch (err) {
      alert(`Araç silme hatası: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. HERO / PROFILE BANNER CARD */}
      <div className="rounded-xl bg-[#1F2937] border border-[#374151] p-6 md:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          
          {/* Avatar & User Details */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            {/* Avatar with Upload Trigger */}
            <div className="relative group">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-2 border-[#374151] bg-[#111827] flex items-center justify-center shadow-lg">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={fullName || "Profil Fotoğrafı"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-black text-[#F5A400]">
                    {(fullName?.[0] || userProfile?.email?.[0] || "T").toUpperCase()}
                  </span>
                )}

                {avatarLoading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <svg className="animate-spin h-6 w-6 text-[#F5A400]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                )}
              </div>

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarSelected}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                title="Profil Fotoğrafı Değiştir"
                aria-label="Profil Fotoğrafı Değiştir"
                className="absolute -bottom-2 -right-2 p-2 rounded-lg bg-[#F5A400] hover:bg-[#D98200] text-[#111827] shadow-lg transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>

            {/* Titles & Badges */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg bg-[#111827] text-[#F3F4F6] border border-[#374151]">
                  {isCarrier ? "TAŞIYICI FİLO" : "YÜK VEREN KURUMSAL"}
                </span>

                <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${
                  isFullyVerified
                    ? "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/40"
                    : "bg-[#F5A400]/15 text-[#F5A400] border-[#F5A400]/40"
                }`}>
                  {isFullyVerified ? "✓ TORK VERIFIED" : "DOĞRULAMA BEKLENİYOR"}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-[#F3F4F6]">
                {fullName || companyName || userProfile?.email || "TORK Kullanıcısı"}
              </h1>

              <p className="text-sm text-[#A0AEC0]">
                {companyName ? `${companyName} • ` : ""}
                <span className="font-mono text-[#F3F4F6]">{userProfile?.email}</span>
              </p>
            </div>
          </div>

          {/* Edit Profile CTA */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="tork-btn-secondary text-xs"
            >
              <svg className="w-4 h-4 text-[#F5A400]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>{isEditing ? "Vazgeç" : "Profili Düzenle"}</span>
            </button>
          </div>
        </div>

        {avatarError && (
          <p className="text-xs text-[#EF4444] mt-4 text-center sm:text-left">{avatarError}</p>
        )}

        {/* 2. KPI / TRUST / PERFORMANCE CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-[#374151]">
          
          {/* TORK Trust Score (Carrier Only) */}
          {isCarrier ? (
            <div className="p-4 rounded-xl bg-[#111827] border border-[#374151] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider">TORK Trust Score</p>
                <p className="text-lg font-black text-[#F3F4F6] mt-1">
                  {trustScoreResult.status === "insufficient_data" ? (
                    <span className="text-[#A0AEC0] text-sm font-semibold">Yetersiz Veri</span>
                  ) : (
                    <span className="text-[#22C55E]">{trustScoreResult.score} / 100</span>
                  )}
                </p>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  {trustScoreResult.status === "insufficient_data" ? "En az 1 teslimat gerekli" : trustScoreResult.tierLabel}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#F5A400]/15 text-[#F5A400] flex items-center justify-center font-bold text-base">
                ★
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#111827] border border-[#374151] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider">İlan Sayısı</p>
                <p className="text-lg font-black text-[#F3F4F6] mt-1">Aktif Yükler</p>
                <p className="text-xs text-[#6B7280] mt-0.5">Operasyon Merkezi</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#F5A400]/15 text-[#F5A400] flex items-center justify-center font-bold text-base">
                📦
              </div>
            </div>
          )}

          {/* Müşteri Değerlendirmesi (Gerçek Veri) */}
          <div className="p-4 rounded-xl bg-[#111827] border border-[#374151] flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider">Müşteri Puanı</p>
              <p className="text-sm font-semibold text-[#F3F4F6] mt-1">
                {userProfile?.rating_count && userProfile.rating_count > 0 ? (
                  `★ ${userProfile.average_rating || 5.0} / 5 (${userProfile.rating_count})`
                ) : (
                  "Henüz değerlendirme yok"
                )}
              </p>
              <p className="text-xs text-[#6B7280] mt-0.5">Doğrulanmış sefer yorumları</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#F5A400]/15 text-[#F5A400] flex items-center justify-center font-bold text-base">
              ⭐
            </div>
          </div>

          {/* Telefon Doğrulama */}
          <div className="p-4 rounded-xl bg-[#111827] border border-[#374151] flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider">Telefon Doğrulaması</p>
              <p className="text-sm font-bold text-[#F3F4F6] mt-1">
                {isPhoneVerified ? "✓ Doğrulandı" : "Doğrulama Bekliyor"}
              </p>
              <p className="text-xs text-[#6B7280] mt-0.5">
                {userProfile?.phone_number || "Numara girilmedi"}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-base ${
              isPhoneVerified ? "bg-[#22C55E]/15 text-[#22C55E]" : "bg-[#F5A400]/15 text-[#F5A400]"
            }`}>
              📱
            </div>
          </div>

          {/* Kimlik & Ehliyet */}
          <div className="p-4 rounded-xl bg-[#111827] border border-[#374151] flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider">Kimlik & Ehliyet</p>
              <p className="text-sm font-bold text-[#F3F4F6] mt-1">
                {isIdentityVerified ? "✓ Doğrulandı" : "Belge Bekleniyor"}
              </p>
              <p className="text-xs text-[#6B7280] mt-0.5">OCR sürücü analizi</p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-base ${
              isIdentityVerified ? "bg-[#22C55E]/15 text-[#22C55E]" : "bg-[#F5A400]/15 text-[#F5A400]"
            }`}>
              🪪
            </div>
          </div>
        </div>
      </div>

      {/* 3. PROFILE SUB-NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-[#374151] pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab("general")}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeSubTab === "general"
              ? "bg-[#F5A400] text-[#111827] shadow-md shadow-[#F5A400]/20"
              : "text-[#A0AEC0] hover:text-[#F3F4F6] hover:bg-[#1F2937]"
          }`}
        >
          Genel Bilgiler
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("verification")}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === "verification"
              ? "bg-[#F5A400] text-[#111827] shadow-md shadow-[#F5A400]/20"
              : "text-[#A0AEC0] hover:text-[#F3F4F6] hover:bg-[#1F2937]"
          }`}
        >
          <span>Doğrulama Merkezi</span>
          {isFullyVerified ? (
            <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-[#F5A400] animate-pulse" />
          )}
        </button>

        {isCarrier && (
          <button
            type="button"
            onClick={() => {
              setActiveSubTab("vehicles");
              loadVehicles();
            }}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === "vehicles"
                ? "bg-[#F5A400] text-[#111827] shadow-md shadow-[#F5A400]/20"
                : "text-[#A0AEC0] hover:text-[#F3F4F6] hover:bg-[#1F2937]"
            }`}
          >
            <span>Araç Bilgileri & Filo</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded bg-[#111827] text-[#A0AEC0]">
              {vehicles.length}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveSubTab("company")}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeSubTab === "company"
              ? "bg-[#F5A400] text-[#111827] shadow-md shadow-[#F5A400]/20"
              : "text-[#A0AEC0] hover:text-[#F3F4F6] hover:bg-[#1F2937]"
          }`}
        >
          Kurumsal & Fatura
        </button>
      </div>

      {/* 4. SUB-TAB CONTENT PANELS */}

      {/* A) GENERAL INFORMATION */}
      {activeSubTab === "general" && (
        <div className="rounded-xl bg-[#1F2937] border border-[#374151] p-6 md:p-8 space-y-6 shadow-xl">
          <div className="border-b border-[#374151] pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#F3F4F6]">Hesap & İletişim Bilgileri</h2>
              <p className="text-xs text-[#A0AEC0]">Platform operasyonlarında kullanılan temel iletişim verileri.</p>
            </div>
            {isEditing && (
              <span className="text-xs font-bold text-[#F5A400] bg-[#F5A400]/10 px-2.5 py-1 rounded border border-[#F5A400]/30">
                Düzenleme Modu
              </span>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-full-name" className="block text-xs font-medium text-[#A0AEC0] mb-1">
                    Yetkili Adı Soyadı
                  </label>
                  <input
                    id="edit-full-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="tork-input text-xs"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="edit-phone" className="block text-xs font-medium text-[#A0AEC0] mb-1">
                    Telefon Numarası
                  </label>
                  <input
                    id="edit-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05XX XXX XX XX"
                    className="tork-input text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="edit-company-name" className="block text-xs font-medium text-[#A0AEC0] mb-1">
                    Firma / Ticari Ünvan
                  </label>
                  <input
                    id="edit-company-name"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="tork-input text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#374151]">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="tork-btn-secondary text-xs"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="tork-btn-primary text-xs"
                >
                  Değişiklikleri Kaydet
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
              <div>
                <span className="text-[#A0AEC0] block mb-1">Ad Soyad</span>
                <p className="font-semibold text-sm text-[#F3F4F6]">{fullName || "Belirtilmedi"}</p>
              </div>

              <div>
                <span className="text-[#A0AEC0] block mb-1">E-Posta Adresi</span>
                <p className="font-mono text-sm text-[#F3F4F6]">{userProfile?.email}</p>
              </div>

              <div>
                <span className="text-[#A0AEC0] block mb-1">Telefon Numarası</span>
                <p className="font-mono text-sm text-[#F3F4F6]">
                  {userProfile?.phone_number || phone || "Girilmedi"}
                </p>
              </div>

              <div>
                <span className="text-[#A0AEC0] block mb-1">Firma / Ünvan</span>
                <p className="font-semibold text-sm text-[#F3F4F6]">{companyName || "Bireysel Taşıyıcı"}</p>
              </div>

              <div>
                <span className="text-[#A0AEC0] block mb-1">Hesap Türü</span>
                <p className="font-semibold text-sm text-[#F5A400]">
                  {isCarrier ? "Taşıyıcı / Lojistik Filosu" : "Yük Veren Kurumsal"}
                </p>
              </div>

              <div>
                <span className="text-[#A0AEC0] block mb-1">Kayıt Tarihi</span>
                <p className="text-sm text-[#A0AEC0]">
                  {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString("tr-TR") : "2026"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* B) EMBEDDED VERIFICATION CENTER */}
      {activeSubTab === "verification" && (
        <div className="space-y-4">
          <VerificationCenter
            userProfile={userProfile}
            onNavigateToMarketplace={() => {
              if (onNavigateToTab) {
                onNavigateToTab(isCarrier ? "board" : "loads");
              }
            }}
            onVerificationComplete={(updatedStatus) => {
              if (onProfileUpdated) {
                onProfileUpdated({ ...userProfile, ...updatedStatus });
              }
            }}
          />
        </div>
      )}

      {/* C) CARRIER FLEET & VEHICLES MANAGEMENT */}
      {activeSubTab === "vehicles" && isCarrier && (
        <div className="rounded-xl bg-[#1F2937] border border-[#374151] p-6 md:p-8 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#374151] pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#F3F4F6]">Araç Filosu ve Taşımacılık Kapasitesi</h2>
              <p className="text-xs text-[#A0AEC0]">Taşıyıcı hesabınıza kayıtlı çekici, kamyon ve dorse bilgileri.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddVehicleModal(true)}
              className="tork-btn-primary text-xs"
            >
              + Yeni Araç Ekle
            </button>
          </div>

          {vehiclesLoading ? (
            <div className="p-8 text-center text-xs text-[#A0AEC0]">Araçlar yükleniyor...</div>
          ) : vehicles.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-[#374151] rounded-xl space-y-3">
              <span className="text-4xl block">🚛</span>
              <p className="text-sm font-bold text-[#F3F4F6]">Kayıtlı Araç Bulunmuyor</p>
              <p className="text-xs text-[#A0AEC0] max-w-md mx-auto">
                TORK yük borsasında sefer alırken taşıma kapasitesi ve dorse tipinize uygun yükleri görebilmek için aracınızı ekleyin.
              </p>
              <button
                type="button"
                onClick={() => setShowAddVehicleModal(true)}
                className="tork-btn-primary text-xs"
              >
                İlk Aracınızı Ekleyin
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {vehicles.map((v) => (
                <div
                  key={v.id}
                  className="rounded-xl bg-[#111827] border border-[#374151] p-5 space-y-4 hover:border-[#4B5563] transition shadow-lg flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Turkish License Plate Badge + Status */}
                    <div className="flex items-center justify-between border-b border-[#374151] pb-3">
                      <div className="tork-plate-badge">
                        <span className="tork-plate-tr">TR</span>
                        <span className="tork-plate-text">{v.plate_number}</span>
                      </div>
                      <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded border ${
                        v.verification_status === "verified"
                          ? "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30"
                          : "bg-[#F5A400]/15 text-[#F5A400] border-[#F5A400]/30"
                      }`}>
                        {v.verification_status === "verified" ? "Doğrulandı" : "İnceleme Bekliyor"}
                      </span>
                    </div>

                    {/* Vehicle Details */}
                    <div className="mt-4 space-y-2 text-xs">
                      <p className="text-base font-black text-[#F3F4F6]">
                        {v.brand} {v.model} <span className="text-xs text-[#A0AEC0]">({v.model_year})</span>
                      </p>

                      <div className="grid grid-cols-2 gap-2 pt-2 text-[#A0AEC0]">
                        <div>
                          <span className="text-[#6B7280]">Araç Tipi:</span>
                          <p className="font-semibold text-[#F3F4F6]">{v.vehicle_type}</p>
                        </div>
                        <div>
                          <span className="text-[#6B7280]">Kapasite:</span>
                          <p className="font-semibold text-[#F5A400]">{v.capacity_tons} Ton</p>
                        </div>
                        <div>
                          <span className="text-[#6B7280]">Dorse Tipi:</span>
                          <p className="font-semibold text-[#F3F4F6]">{v.trailer_type || "Tenteli"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-[#374151] flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleDeleteVehicle(v.id)}
                      className="text-xs text-[#EF4444] hover:text-red-300 font-bold"
                    >
                      Aracı Kaldır
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* D) COMPANY & INVOICE INFORMATION */}
      {activeSubTab === "company" && (
        <div className="rounded-xl bg-[#1F2937] border border-[#374151] p-6 md:p-8 space-y-6 shadow-xl">
          <div className="border-b border-[#374151] pb-4">
            <h2 className="text-lg font-bold text-[#F3F4F6]">Kurumsal ve Fatura Bilgileri</h2>
            <p className="text-xs text-[#A0AEC0]">Resmi taşımacılık mutabakatları ve e-fatura düzenlemeleri için kullanılır.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <span className="text-[#A0AEC0] text-xs block mb-1">Vergi Dairesi</span>
              <p className="font-semibold text-sm text-[#F3F4F6]">{userProfile?.tax_office || taxOffice || "Belirtilmedi"}</p>
            </div>

            <div>
              <span className="text-[#A0AEC0] text-xs block mb-1">Vergi Numarası / TCKN</span>
              <p className="font-mono font-semibold text-sm text-[#F3F4F6]">{userProfile?.tax_number || taxNumber || "Belirtilmedi"}</p>
            </div>

            <div className="sm:col-span-2">
              <span className="text-[#A0AEC0] text-xs block mb-1">Resmi Fatura Adresi</span>
              <p className="text-sm text-[#F3F4F6]">{userProfile?.company_address || companyAddress || "Adres kaydı bulunamadı."}</p>
            </div>
          </div>
        </div>
      )}

      {/* ADD VEHICLE MODAL */}
      {showAddVehicleModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-xl bg-[#1F2937] border border-[#374151] p-6 max-w-md w-full shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#374151] pb-3">
              <h3 className="text-base font-bold text-[#F3F4F6]">Yeni Araç Ekle</h3>
              <button
                type="button"
                onClick={() => setShowAddVehicleModal(false)}
                className="text-[#A0AEC0] hover:text-[#F3F4F6]"
              >
                ✕
              </button>
            </div>

            {vehicleError && (
              <p className="text-xs text-[#EF4444] bg-[#EF4444]/10 p-2.5 rounded border border-[#EF4444]/20">
                {vehicleError}
              </p>
            )}

            <form onSubmit={handleAddVehicle} className="space-y-3 text-xs">
              <div>
                <label htmlFor="modal-plate-number" className="block text-xs font-medium text-[#A0AEC0] mb-1">
                  Plaka (Örn: 34 ABC 123)
                </label>
                <input
                  id="modal-plate-number"
                  type="text"
                  placeholder="34 ABC 123"
                  value={newVehicle.plateNumber}
                  onChange={(e) => setNewVehicle({ ...newVehicle, plateNumber: e.target.value })}
                  className="tork-input font-mono uppercase"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="modal-vehicle-type" className="block text-xs font-medium text-[#A0AEC0] mb-1">
                    Araç Tipi
                  </label>
                  <select
                    id="modal-vehicle-type"
                    value={newVehicle.vehicleType}
                    onChange={(e) => setNewVehicle({ ...newVehicle, vehicleType: e.target.value })}
                    className="tork-input"
                  >
                    {Object.keys(VEHICLE_TYPES).map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="modal-capacity-tons" className="block text-xs font-medium text-[#A0AEC0] mb-1">
                    Kapasite (Ton)
                  </label>
                  <input
                    id="modal-capacity-tons"
                    type="number"
                    step="0.5"
                    value={newVehicle.capacityTons}
                    onChange={(e) => setNewVehicle({ ...newVehicle, capacityTons: parseFloat(e.target.value) || 0 })}
                    className="tork-input"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="modal-brand" className="block text-xs font-medium text-[#A0AEC0] mb-1">
                    Marka
                  </label>
                  <input
                    id="modal-brand"
                    type="text"
                    placeholder="Mercedes, Scania vb."
                    value={newVehicle.brand}
                    onChange={(e) => setNewVehicle({ ...newVehicle, brand: e.target.value })}
                    className="tork-input"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="modal-model" className="block text-xs font-medium text-[#A0AEC0] mb-1">
                    Model & Yıl
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      id="modal-model"
                      type="text"
                      placeholder="Actros"
                      value={newVehicle.model}
                      onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                      className="tork-input flex-1"
                      required
                    />
                    <input
                      type="number"
                      value={newVehicle.modelYear}
                      onChange={(e) => setNewVehicle({ ...newVehicle, modelYear: parseInt(e.target.value, 10) || 2024 })}
                      className="tork-input w-18"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="modal-trailer-type" className="block text-xs font-medium text-[#A0AEC0] mb-1">
                  Dorse Tipi
                </label>
                <select
                  id="modal-trailer-type"
                  value={newVehicle.trailerType}
                  onChange={(e) => setNewVehicle({ ...newVehicle, trailerType: e.target.value })}
                  className="tork-input"
                >
                  {TRAILER_TYPES.map((trailer) => (
                    <option key={trailer} value={trailer}>{trailer}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#374151]">
                <button
                  type="button"
                  onClick={() => setShowAddVehicleModal(false)}
                  className="tork-btn-secondary text-xs"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="tork-btn-primary text-xs"
                >
                  Aracı Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
