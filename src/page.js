"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

/* =========================================================
   NAVIGATION
========================================================= */

const SHIPPER_TABS = [
  { id: "overview", label: "Genel Bakış", icon: "⌂" },
  { id: "loads", label: "İlanlarım", icon: "▣" },
  { id: "create", label: "Yeni Yük", icon: "+" },
  { id: "bids", label: "Gelen Teklifler", icon: "◇" },
  { id: "wallet", label: "Cüzdan", icon: "₺" },
  { id: "profile", label: "Profilim", icon: "○" },
  { id: "settings", label: "Ayarlar", icon: "⚙" },
];

const CARRIER_TABS = [
  { id: "overview", label: "Genel Bakış", icon: "⌂" },
  { id: "board", label: "Uygun Yükler", icon: "◫" },
  { id: "wallet", label: "Cüzdan", icon: "₺" },
  { id: "profile", label: "Profilim", icon: "○" },
  { id: "settings", label: "Ayarlar", icon: "⚙" },
];

/* =========================================================
   SMALL UI COMPONENTS
========================================================= */

function TorkLogo({ compact = false }) {
  return (
    <div
      className={`tork-logo flex items-center justify-center rounded-2xl ${
        compact ? "h-10 w-10" : "h-12 w-12"
      }`}
    >
      <span
        className={`font-black tracking-[-0.08em] text-[#ffcc00] ${
          compact ? "text-xl" : "text-2xl"
        }`}
      >
        T
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  accent = "yellow",
}) {
  const valueClass =
    accent === "orange"
      ? "text-[#f59e0b]"
      : accent === "green"
        ? "text-emerald-400"
        : "text-[#ffcc00]";

  return (
    <div className="tork-panel tork-panel-hover rounded-2xl p-5">
      <div className="tork-eyebrow mb-2">{label}</div>

      <div
        className={`text-3xl font-black tracking-tight ${valueClass}`}
      >
        {value}
      </div>

      {detail ? (
        <div className="mt-1.5 text-xs text-slate-500">
          {detail}
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({
  title,
  text,
  action,
}) {
  return (
    <div className="tork-panel rounded-3xl p-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#ffcc00]/10 bg-[#ffcc00]/5 text-xl font-black text-[#ffcc00]">
        T
      </div>

      <h3 className="text-lg font-black text-white">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {text}
      </p>

      {action ? (
        <div className="mt-6">
          {action}
        </div>
      ) : null}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="tork-eyebrow mb-1.5">
          {eyebrow}
        </div>

        <h2 className="text-2xl font-black tracking-[-0.03em] text-white">
          {title}
        </h2>

        {description ? (
          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        ) : null}
      </div>

      {action ? (
        <div className="shrink-0">
          {action}
        </div>
      ) : null}
    </div>
  );
}

function SettingRow({
  title,
  description,
  children,
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-white/6 py-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-2xl">
        <div className="text-sm font-bold text-white">
          {title}
        </div>

        {description ? (
          <div className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </div>
        ) : null}
      </div>

      <div className="shrink-0">
        {children}
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled = false,
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative h-7 w-12 rounded-full border transition ${
        checked
          ? "border-[#ffcc00]/40 bg-[#ffcc00]"
          : "border-white/10 bg-white/[0.05]"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full transition ${
          checked
            ? "left-6 bg-[#16120a]"
            : "left-1 bg-slate-400"
        }`}
      />
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
}) {
  return (
    <div>
      <label className="tork-eyebrow mb-2 block">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        disabled={disabled}
        className="tork-input px-4 py-3.5 text-sm"
      />
    </div>
  );
}

/* =========================================================
   APP
========================================================= */

export default function TorkApp() {
  /* =======================================================
     AUTH
  ======================================================= */

  const [authMode, setAuthMode] =
    useState("login");

  const [loginRole, setLoginRole] =
    useState("shipper");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [rememberMe, setRememberMe] =
    useState(false);

  const [companyName, setCompanyName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [role, setRole] =
    useState("shipper");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [userDashboard, setUserDashboard] =
    useState(null);

  const [activeTab, setActiveTab] =
    useState("overview");

  /* =======================================================
     LOADS / BIDS
  ======================================================= */

  const [origin, setOrigin] =
    useState("");

  const [destination, setDestination] =
    useState("");

  const [tonnage, setTonnage] =
    useState("");

  const [vehicle, setVehicle] =
    useState("TIR (Tenteli)");

  const [cargoType, setCargoType] =
    useState("Paletli Ürün");

  const [packageCount, setPackageCount] =
    useState("");

  const [loadDescription, setLoadDescription] =
    useState("");

  const [loads, setLoads] =
    useState([]);

  const [myLoads, setMyLoads] =
    useState([]);

  const [incomingBids, setIncomingBids] =
    useState([]);

  const [activeBidLoadId, setActiveBidLoadId] =
    useState(null);

  const [bidAmount, setBidAmount] =
    useState("");

  /* =======================================================
     PROFILE
  ======================================================= */

  const [profileSection, setProfileSection] =
    useState("company");

  const [legalCompanyName, setLegalCompanyName] =
    useState("");

  const [taxNumber, setTaxNumber] =
    useState("");

  const [taxOffice, setTaxOffice] =
    useState("");

  const [mersisNumber, setMersisNumber] =
    useState("");

  const [commercialRegistryNumber, setCommercialRegistryNumber] =
    useState("");

  const [companyAddress, setCompanyAddress] =
    useState("");

  const [iban, setIban] =
    useState("");

  const [ibanChangeRequested, setIbanChangeRequested] =
    useState(false);

  const [ibanOtpSent, setIbanOtpSent] =
    useState(false);

  const [ibanOtp, setIbanOtp] =
    useState("");

  const [notifications, setNotifications] =
    useState({
      sms: true,
      email: true,
      push: true,
    });

  const [kvkkMarketingConsent, setKvkkMarketingConsent] =
    useState(false);

  const [dataDeletionRequested, setDataDeletionRequested] =
    useState(false);

  /* =======================================================
     SETTINGS
  ======================================================= */

  const [settingsSection, setSettingsSection] =
    useState("operations");

  const [commissionRate, setCommissionRate] =
    useState(5);

  const [gpsFrequency, setGpsFrequency] =
    useState(30);

  const [delayThreshold, setDelayThreshold] =
    useState(30);

  const [trustWeightLocation, setTrustWeightLocation] =
    useState(25);

  const [trustWeightVehicle, setTrustWeightVehicle] =
    useState(20);

  const [trustWeightPrice, setTrustWeightPrice] =
    useState(20);

  const [trustWeightPerformance, setTrustWeightPerformance] =
    useState(20);

  const [trustWeightReliability, setTrustWeightReliability] =
    useState(15);

  const [tomtomEnabled, setTomtomEnabled] =
    useState(true);

  const [mapsEnabled, setMapsEnabled] =
    useState(true);

  const [paymentIntegrationEnabled, setPaymentIntegrationEnabled] =
    useState(false);

  const [apiGatewayEnabled, setApiGatewayEnabled] =
    useState(true);

  const [mfaRequired, setMfaRequired] =
    useState(true);

  const [sessionTimeout, setSessionTimeout] =
    useState(30);

  const [multiUserEnabled, setMultiUserEnabled] =
    useState(true);

  const [employees, setEmployees] =
    useState([
      {
        id: 1,
        name: "Operasyon Yöneticisi",
        email: "operasyon@firma.com",
        role: "OPERATIONS",
      },
    ]);

  const [newEmployeeName, setNewEmployeeName] =
    useState("");

  const [newEmployeeEmail, setNewEmployeeEmail] =
    useState("");

  /* =======================================================
     WALLET
  ======================================================= */

  const [walletBalance] =
    useState(0);

  /* =======================================================
     LOAD DATA
  ======================================================= */

  const fetchOpenLoads = async () => {
    const { data, error } =
      await supabase
        .from("loads")
        .select("*")
        .eq("status", "open")
        .order("created_at", {
          ascending: false,
        });

    if (!error && data) {
      setLoads(data);
    }
  };

  const fetchShipperData = async (
    userId,
  ) => {
    const { data: loadsData } =
      await supabase
        .from("loads")
        .select("*")
        .eq("shipper_id", userId)
        .order("created_at", {
          ascending: false,
        });

    setMyLoads(loadsData || []);

    const loadIds =
      loadsData?.map(
        (load) => load.id,
      ) || [];

    if (loadIds.length === 0) {
      setIncomingBids([]);
      return;
    }

    const { data: bidsData } =
      await supabase
        .from("bids")
        .select(
          "*, loads(origin, destination, cargo_type, tonnage), profiles(company_name, phone)",
        )
        .in(
          "load_id",
          loadIds,
        )
        .order("created_at", {
          ascending: false,
        });

    setIncomingBids(
      bidsData || [],
    );
  };

  useEffect(() => {
    if (!userDashboard) {
      return;
    }

    if (
      userDashboard.role ===
      "carrier"
    ) {
      fetchOpenLoads();
    } else {
      fetchShipperData(
        userDashboard.id,
      );
    }
  }, [
    userDashboard,
    activeTab,
  ]);

  useEffect(() => {
    const savedEmail =
      localStorage.getItem(
        "tork_remember_email",
      );

    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  /* =======================================================
     AUTH HANDLERS
  ======================================================= */

  const handleSignUp = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const {
      data,
      error,
    } =
      await supabase.auth.signUp({
        email,
        password,
      });

    if (error) {
      setMessage(
        "Kayıt hatası: " +
          error.message,
      );

      setLoading(false);
      return;
    }

    if (!data.user) {
      setMessage(
        "Kullanıcı oluşturulamadı.",
      );

      setLoading(false);
      return;
    }

    const {
      error: profileError,
    } =
      await supabase
        .from("profiles")
        .insert({
          id: data.user.id,
          role,
          company_name:
            companyName,
          phone,
        });

    if (profileError) {
      setMessage(
        "Profil hatası: " +
          profileError.message,
      );
    } else {
      setMessage(
        "Kayıt başarılı. Şimdi giriş yapabilirsiniz.",
      );

      setAuthMode("login");
    }

    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const {
      data,
      error,
    } =
      await supabase.auth.signInWithPassword(
        {
          email,
          password,
        },
      );

    if (error) {
      setMessage(
        "Giriş hatası: " +
          error.message,
      );

      setLoading(false);
      return;
    }

    const {
      data: profile,
      error: profileError,
    } =
      await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

    if (
      profileError ||
      !profile
    ) {
      setMessage(
        "Profil bulunamadı.",
      );

      setLoading(false);
      return;
    }

    if (
      profile.role !==
      loginRole
    ) {
      setMessage(
        `Bu hesap bir ${
          profile.role ===
          "shipper"
            ? "Yük Veren"
            : "Nakliyeci"
        } hesabıdır. Lütfen doğru sekmeden giriş yapın.`,
      );

      await supabase.auth.signOut();

      setLoading(false);
      return;
    }

    if (rememberMe) {
      localStorage.setItem(
        "tork_remember_email",
        email,
      );
    } else {
      localStorage.removeItem(
        "tork_remember_email",
      );
    }

    setUserDashboard(
      profile,
    );

    setActiveTab(
      "overview",
    );

    setLoading(false);
  };

  const handleLogout =
    async () => {
      await supabase.auth.signOut();

      setUserDashboard(null);
      setActiveTab("overview");
      setMessage("");
    };

  /* =======================================================
     LOAD HANDLERS
  ======================================================= */

  const handleCreateLoad =
    async (e) => {
      e.preventDefault();

      setLoading(true);
      setMessage("");

      const { error } =
        await supabase
          .from("loads")
          .insert({
            shipper_id:
              userDashboard.id,
            origin,
            destination,
            tonnage,
            vehicle_type:
              vehicle,
            status: "open",
          });

      if (error) {
        setMessage(
          "Hata: " +
            error.message,
        );
      } else {
        setMessage(
          "Yük ilanı başarıyla yayınlandı.",
        );

        setOrigin("");
        setDestination("");
        setTonnage("");
        setPackageCount("");
        setLoadDescription("");

        await fetchShipperData(
          userDashboard.id,
        );

        setActiveTab(
          "loads",
        );
      }

      setLoading(false);
    };

  const handleSendBid =
    async (loadId) => {
      if (!bidAmount) {
        return;
      }

      setLoading(true);

      const { error } =
        await supabase
          .from("bids")
          .insert({
            load_id: loadId,
            carrier_id:
              userDashboard.id,
            amount: bidAmount,
            status: "pending",
          });

      if (error) {
        setMessage(
          "Teklif verme hatası: " +
            error.message,
        );
      } else {
        setMessage(
          "Navlun teklifiniz başarıyla iletildi.",
        );

        setActiveBidLoadId(
          null,
        );

        setBidAmount("");
      }

      setLoading(false);
    };

  const handleUpdateBidStatus =
    async (
      bidId,
      loadId,
      newStatus,
    ) => {
      setLoading(true);

      const {
        error: bidError,
      } =
        await supabase
          .from("bids")
          .update({
            status:
              newStatus,
          })
          .eq(
            "id",
            bidId,
          );

      if (bidError) {
        setMessage(
          "Teklif güncellenemedi: " +
            bidError.message,
        );

        setLoading(false);
        return;
      }

      if (
        newStatus ===
        "accepted"
      ) {
        await supabase
          .from("loads")
          .update({
            status:
              "assigned",
          })
          .eq(
            "id",
            loadId,
          );
      }

      await fetchShipperData(
        userDashboard.id,
      );

      setLoading(false);
    };

  /* =======================================================
     PROFILE HANDLERS
  ======================================================= */

  const initializeProfile =
    () => {
      if (!userDashboard) {
        return;
      }

      setLegalCompanyName(
        userDashboard.company_name ||
          "",
      );

      setCompanyAddress(
        userDashboard.company_address ||
          "",
      );

      setPhone(
        userDashboard.phone ||
          "",
      );
    };

  useEffect(() => {
    initializeProfile();
  }, [userDashboard]);

  const handleProfileSave =
    async () => {
      setLoading(true);
      setMessage("");

      /*
       * Mevcut profiles tablosunda
       * bildiğimiz alanları güncelliyoruz.
       *
       * Yeni yasal/finansal alanlar
       * migration sonrasında ayrıca
       * ayrı tablolara taşınacak.
       */

      const { data, error } =
        await supabase
          .from("profiles")
          .update({
            company_name:
              legalCompanyName,
            phone,
          })
          .eq(
            "id",
            userDashboard.id,
          )
          .select()
          .single();

      if (error) {
        setMessage(
          "Profil kaydedilemedi: " +
            error.message,
        );
      } else {
        setUserDashboard(
          data,
        );

        setMessage(
          "Profil bilgileriniz güncellendi.",
        );
      }

      setLoading(false);
    };

  const requestIbanChange =
    () => {
      setIbanChangeRequested(
        true,
      );

      setIbanOtpSent(false);
      setIbanOtp("");

      setMessage(
        "IBAN değişikliği için güvenlik doğrulaması başlatıldı.",
      );
    };

  const sendIbanOtp =
    () => {
      setIbanOtpSent(true);

      setMessage(
        "Tek kullanımlık doğrulama kodu gönderildi.",
      );
    };

  const verifyIbanOtp =
    () => {
      if (
        ibanOtp.length !== 6
      ) {
        setMessage(
          "6 haneli OTP kodunu girin.",
        );
        return;
      }

      setIbanChangeRequested(
        false,
      );

      setIbanOtpSent(false);
      setIbanOtp("");

      setMessage(
        "IBAN değişikliği doğrulandı. Güvenlik nedeniyle soğuma süresi uygulanacak.",
      );
    };

  const requestDataDeletion =
    () => {
      setDataDeletionRequested(
        true,
      );

      setMessage(
        "Veri silme talebiniz alındı. Talep yasal saklama gereklilikleri doğrultusunda incelenecektir.",
      );
    };

  /* =======================================================
     SETTINGS HANDLERS
  ======================================================= */

  const addEmployee =
    () => {
      if (
        !newEmployeeName ||
        !newEmployeeEmail
      ) {
        return;
      }

      setEmployees(
        (current) => [
          ...current,
          {
            id:
              Date.now(),
            name:
              newEmployeeName,
            email:
              newEmployeeEmail,
            role:
              "OPERATOR",
          },
        ],
      );

      setNewEmployeeName(
        "",
      );

      setNewEmployeeEmail("");

      setMessage(
        "Kullanıcı geçici olarak eklendi.",
      );
    };

  const removeEmployee =
    (id) => {
      setEmployees(
        (current) =>
          current.filter(
            (employee) =>
              employee.id !==
              id,
          ),
      );
    };

  const saveOperationalSettings =
    () => {
      const totalTrustWeight =
        Number(
          trustWeightLocation,
        ) +
        Number(
          trustWeightVehicle,
        ) +
        Number(
          trustWeightPrice,
        ) +
        Number(
          trustWeightPerformance,
        ) +
        Number(
          trustWeightReliability,
        );

      if (
        totalTrustWeight !==
        100
      ) {
        setMessage(
          `Güven skoru ağırlıkları toplamı %100 olmalı. Şu an %${totalTrustWeight}.`,
        );

        return;
      }

      setMessage(
        "Operasyonel parametreler kaydedildi.",
      );
    };

  const saveSystemSettings =
    () => {
      setMessage(
        "Sistem ve entegrasyon ayarları kaydedildi.",
      );
    };

  /* =======================================================
     MEMOS
  ======================================================= */

  const shipperOpenCount =
    useMemo(
      () =>
        myLoads.filter(
          (load) =>
            load.status ===
            "open",
        ).length,
      [myLoads],
    );

  const tabs =
    userDashboard?.role ===
    "carrier"
      ? CARRIER_TABS
      : SHIPPER_TABS;

  /* =======================================================
     AUTH SCREEN
  ======================================================= */

  if (!userDashboard) {
    return (
      <main className="tork-shell flex min-h-screen items-center justify-center overflow-hidden px-5 py-8 sm:px-8">
        <div className="tork-grid" />
        <div className="tork-noise" />

        <div className="pointer-events-none absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-[#ffcc00]/5 blur-3xl" />

        <div className="pointer-events-none absolute -right-24 bottom-1/4 h-80 w-80 rounded-full bg-[#f59e0b]/6 blur-3xl" />

        <div className="relative z-10 grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.08fr_470px]">

          <div className="hidden lg:block">
            <div className="mb-7 flex items-center gap-4">
              <TorkLogo />

              <div>
                <div className="text-2xl font-black tracking-[-0.04em] text-white">
                  Tork
                  <span className="text-[#ffcc00]">
                    .
                  </span>
                </div>

                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-600">
                  Freight Operations Platform
                </div>
              </div>
            </div>

            <div className="tork-eyebrow mb-4">
              B2B Akıllı Navlun Pazaryeri
            </div>

            <h1 className="max-w-2xl text-5xl font-black leading-[0.95] tracking-[-0.055em] text-white xl:text-7xl">
              Yükü yönet.
              <br />
              <span className="tork-brand">
                Operasyonu hızlandır.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-7 text-slate-500">
              Yük verenler ve
              nakliyeciler için
              navlun, teklif, taşıma
              ve finans operasyonlarını
              tek platformda birleştiren
              Tork.
            </p>
          </div>

          <div className="tork-panel tork-fade-up rounded-[28px] p-6 sm:p-8">

            <div className="mb-7 lg:hidden">
              <div className="flex items-center gap-3">
                <TorkLogo compact />

                <div>
                  <div className="text-xl font-black text-white">
                    Tork
                    <span className="text-[#ffcc00]">
                      .
                    </span>
                  </div>

                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                    Freight Operations
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="tork-eyebrow mb-2">
                {authMode === "login"
                  ? "Hoş geldiniz"
                  : "Tork'a katılın"}
              </div>

              <h2 className="text-2xl font-black tracking-[-0.03em] text-white">
                {authMode ===
                "login"
                  ? "Operasyon merkezine giriş yap."
                  : "Tork hesabını oluştur."}
              </h2>
            </div>

            <div className="grid grid-cols-2 rounded-2xl border border-white/6 bg-black/15 p-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(
                    "login",
                  );
                  setMessage(
                    "",
                  );
                }}
                className={`rounded-xl px-4 py-2.5 text-xs font-black ${
                  authMode ===
                  "login"
                    ? "bg-white/[0.08] text-white"
                    : "text-slate-600"
                }`}
              >
                Giriş Yap
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode(
                    "register",
                  );
                  setMessage(
                    "",
                  );
                }}
                className={`rounded-xl px-4 py-2.5 text-xs font-black ${
                  authMode ===
                  "register"
                    ? "bg-white/[0.08] text-white"
                    : "text-slate-600"
                }`}
              >
                Kayıt Ol
              </button>
            </div>

            {authMode ===
            "login" ? (
              <div className="mt-4 grid grid-cols-2 rounded-2xl border border-white/6 bg-black/15 p-1">

                <button
                  type="button"
                  onClick={() =>
                    setLoginRole(
                      "shipper",
                    )
                  }
                  className={`rounded-xl px-3 py-2.5 text-[11px] font-bold ${
                    loginRole ===
                    "shipper"
                      ? "bg-[#ffcc00]/10 text-[#ffcc00]"
                      : "text-slate-600"
                  }`}
                >
                  📦 Yük Veren
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setLoginRole(
                      "carrier",
                    )
                  }
                  className={`rounded-xl px-3 py-2.5 text-[11px] font-bold ${
                    loginRole ===
                    "carrier"
                      ? "bg-[#ffcc00]/10 text-[#ffcc00]"
                      : "text-slate-600"
                  }`}
                >
                  🚚 Nakliyeci
                </button>

              </div>
            ) : null}

            <form
              onSubmit={
                authMode ===
                "login"
                  ? handleLogin
                  : handleSignUp
              }
              className="mt-6 space-y-4"
            >
              {authMode ===
              "register" ? (
                <>
                  <Field
                    label="Şirket adı"
                    value={
                      companyName
                    }
                    onChange={
                      setCompanyName
                    }
                    placeholder="Şirketinizin adı"
                  />

                  <Field
                    label="Telefon"
                    value={phone}
                    onChange={
                      setPhone
                    }
                    placeholder="0532 000 00 00"
                  />

                  <div>
                    <label className="tork-eyebrow mb-2 block">
                      Hesap tipi
                    </label>

                    <select
                      className="tork-input px-4 py-3.5 text-sm"
                      value={role}
                      onChange={(e) =>
                        setRole(
                          e.target
                            .value,
                        )
                      }
                    >
                      <option value="shipper">
                        📦 Yük Veren
                      </option>

                      <option value="carrier">
                        🚚 Nakliyeci
                      </option>
                    </select>
                  </div>
                </>
              ) : null}

              <Field
                label="E-posta"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="ornek@tork.com"
              />

              <Field
                label="Şifre"
                type="password"
                value={
                  password
                }
                onChange={
                  setPassword
                }
                placeholder="••••••••"
              />

              {authMode ===
              "login" ? (
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={
                      rememberMe
                    }
                    onChange={(e) =>
                      setRememberMe(
                        e.target
                          .checked,
                      )
                    }
                    className="h-4 w-4 accent-[#ffcc00]"
                  />

                  Beni hatırla
                </label>
              ) : null}

              <button
                type="submit"
                disabled={
                  loading
                }
                className="tork-button-primary mt-2 w-full rounded-2xl py-4 text-sm font-black"
              >
                {loading
                  ? "İşleniyor..."
                  : authMode ===
                      "login"
                    ? loginRole ===
                      "shipper"
                      ? "Yük Veren Girişi →"
                      : "Nakliyeci Girişi →"
                    : "Hesap Oluştur →"}
              </button>
            </form>

            {message ? (
              <div className="mt-5 rounded-2xl border border-[#ffcc00]/10 bg-[#ffcc00]/5 px-4 py-3 text-xs text-[#ffd633]">
                {message}
              </div>
            ) : null}
          </div>
        </div>
      </main>
    );
  }

  /* =======================================================
     APPLICATION
  ======================================================= */

  return (
    <main className="tork-shell min-h-screen text-slate-100">

      <div className="tork-grid" />
      <div className="tork-noise" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1540px]">

        {/* =================================================
            SIDEBAR
        ================================================= */}

        <aside className="hidden w-[270px] shrink-0 border-r border-white/6 px-6 py-6 lg:flex lg:flex-col">

          <div className="flex items-center gap-3">
            <TorkLogo compact />

            <div>
              <div className="text-[15px] font-black text-white">
                Tork
                <span className="text-[#ffcc00]">
                  .
                </span>
              </div>

              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                Freight Operations
              </div>
            </div>
          </div>

          <div className="my-7 tork-accent-line" />

          <div className="tork-eyebrow mb-3">
            Çalışma alanı
          </div>

          <nav className="space-y-1.5">
            {tabs.map(
              (tab) => {
                const active =
                  activeTab ===
                  tab.id;

                return (
                  <button
                    key={
                      tab.id
                    }
                    onClick={() => {
                      setActiveTab(
                        tab.id,
                      );
                      setMessage(
                        "",
                      );
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold transition ${
                      active
                        ? "border border-[#ffcc00]/15 bg-[#ffcc00]/8 text-white"
                        : "text-slate-500 hover:bg-white/[0.03] hover:text-white"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs ${
                        active
                          ? "bg-[#ffcc00] font-black text-[#17130a]"
                          : "bg-white/[0.035] text-slate-500"
                      }`}
                    >
                      {
                        tab.icon
                      }
                    </span>

                    {
                      tab.label
                    }
                  </button>
                );
              },
            )}
          </nav>

          <div className="mt-auto space-y-3">

            <div className="tork-panel rounded-2xl p-4">
              <div className="tork-eyebrow mb-2">
                Hesap
              </div>

              <div className="truncate text-sm font-bold text-white">
                {userDashboard.company_name ||
                  "Tork kullanıcısı"}
              </div>

              <div className="mt-1 text-xs text-slate-600">
                {userDashboard.role ===
                "shipper"
                  ? "Yük Veren"
                  : "Nakliyeci"}
              </div>
            </div>

            <button
              onClick={
                handleLogout
              }
              className="w-full rounded-xl border border-red-500/15 bg-red-500/5 px-4 py-3 text-xs font-black text-red-400"
            >
              Çıkış Yap
            </button>
          </div>
        </aside>

        {/* =================================================
            MAIN
        ================================================= */}

        <section className="min-w-0 flex-1 px-5 py-5 sm:px-7 lg:px-10">

          <header className="mb-8 flex flex-col gap-5 border-b border-white/6 pb-6 md:flex-row md:items-center md:justify-between">

            <div>
              <div className="tork-eyebrow mb-1.5">
                Tork Operations
              </div>

              <h1 className="text-2xl font-black tracking-[-0.03em] text-white sm:text-3xl">
                {tabs.find(
                  (tab) =>
                    tab.id ===
                    activeTab,
                )?.label ||
                  "Tork"}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {userDashboard.company_name ||
                  "Tork kullanıcısı"}{" "}
                · canlı operasyon merkezi
              </p>
            </div>

            <div className="flex items-center gap-3">

              <span className="tork-status-live">
                NETWORK LIVE
              </span>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] text-sm font-black text-[#ffcc00]">
                {userDashboard.company_name
                  ?.slice(
                    0,
                    1,
                  )
                  ?.toUpperCase() ||
                  "T"}
              </div>

            </div>
          </header>

          {/* =================================================
              OVERVIEW
          ================================================= */}

          {activeTab ===
            "overview" && (
            <div className="tork-fade-up space-y-6">

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                <StatCard
                  label={
                    userDashboard.role ===
                    "shipper"
                      ? "Açık ilan"
                      : "Açık yük"
                  }
                  value={
                    userDashboard.role ===
                    "shipper"
                      ? shipperOpenCount
                      : loads.length
                  }
                  detail="Tork marketplace"
                />

                <StatCard
                  label="Cüzdan"
                  value={`₺${walletBalance.toLocaleString(
                    "tr-TR",
                  )}`}
                  detail="Kullanılabilir bakiye"
                  accent="green"
                />

                <StatCard
                  label={
                    userDashboard.role ===
                    "shipper"
                      ? "Teklif"
                      : "Aktif ağ"
                  }
                  value={
                    userDashboard.role ===
                    "shipper"
                      ? incomingBids.length
                      : "LIVE"
                  }
                  detail={
                    userDashboard.role ===
                    "shipper"
                      ? "Gelen teklifler"
                      : "Nakliyeci ağı"
                  }
                  accent="orange"
                />

                <StatCard
                  label="Güvenlik"
                  value="AKTİF"
                  detail="Platform güvenlik politikaları"
                  accent="green"
                />

              </div>

              <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">

                <div className="tork-panel rounded-3xl p-6">
                  <SectionHeading
                    eyebrow="Operations"
                    title="Operasyon merkezi"
                    description="Tork üzerindeki temel operasyonlarınıza hızlı erişim."
                  />

                  <div className="grid gap-4 md:grid-cols-2">

                    <button
                      onClick={() =>
                        setActiveTab(
                          userDashboard.role ===
                            "shipper"
                            ? "loads"
                            : "board",
                        )
                      }
                      className="rounded-2xl border border-white/6 bg-white/[0.02] p-5 text-left transition hover:border-[#ffcc00]/15 hover:bg-[#ffcc00]/[0.025]"
                    >
                      <div className="text-2xl text-[#ffcc00]">
                        {userDashboard.role ===
                        "shipper"
                          ? "▣"
                          : "◫"}
                      </div>

                      <div className="mt-4 text-sm font-black text-white">
                        {userDashboard.role ===
                        "shipper"
                          ? "İlanlarım"
                          : "Uygun Yükler"}
                      </div>

                      <div className="mt-1 text-xs leading-5 text-slate-600">
                        {userDashboard.role ===
                        "shipper"
                          ? "Mevcut yüklerinizi ve ilan durumlarını yönetin."
                          : "Taşımaya uygun açık yükleri inceleyin."}
                      </div>
                    </button>

                    <button
                      onClick={() =>
                        setActiveTab(
                          "wallet",
                        )
                      }
                      className="rounded-2xl border border-white/6 bg-white/[0.02] p-5 text-left transition hover:border-[#ffcc00]/15 hover:bg-[#ffcc00]/[0.025]"
                    >
                      <div className="text-2xl text-[#ffcc00]">
                        ₺
                      </div>

                      <div className="mt-4 text-sm font-black text-white">
                        Cüzdan ve Ödemeler
                      </div>

                      <div className="mt-1 text-xs leading-5 text-slate-600">
                        Bakiye, hakediş ve ödeme hareketlerini yönetin.
                      </div>
                    </button>

                  </div>
                </div>

                <div className="tork-panel rounded-3xl p-6">

                  <div className="tork-eyebrow">
                    Platform
                  </div>

                  <div className="mt-1 text-lg font-black text-white">
                    Tork güvenlik merkezi
                  </div>

                  <div className="mt-5 space-y-3">

                    <div className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.02] p-3">
                      <span className="text-xs text-slate-500">
                        MFA politikası
                      </span>

                      <span className="text-[10px] font-black text-emerald-400">
                        AKTİF
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.02] p-3">
                      <span className="text-xs text-slate-500">
                        Kritik bildirimler
                      </span>

                      <span className="text-[10px] font-black text-emerald-400">
                        ZORUNLU
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.02] p-3">
                      <span className="text-xs text-slate-500">
                        Ağ durumu
                      </span>

                      <span className="tork-status-live">
                        LIVE
                      </span>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          )}

          {/* =================================================
              LOADS
          ================================================= */}

          {userDashboard.role ===
            "shipper" &&
            activeTab ===
              "loads" && (
              <div className="tork-fade-up">

                <SectionHeading
                  eyebrow="Marketplace"
                  title="İlanlarım"
                  description="Tork üzerinde oluşturduğunuz aktif ve geçmiş yükler."
                  action={
                    <button
                      onClick={() =>
                        setActiveTab(
                          "create",
                        )
                      }
                      className="tork-button-primary rounded-xl px-4 py-2.5 text-xs font-black"
                    >
                      + Yeni yük
                    </button>
                  }
                />

                {myLoads.length ===
                0 ? (
                  <EmptyState
                    title="Henüz bir yük yayınlamadınız"
                    text="İlk yükünüzü oluşturun ve taşıyıcılardan teklif almaya başlayın."
                  />
                ) : (
                  <div className="grid gap-4">
                    {myLoads.map(
                      (load) => (
                        <div
                          key={
                            load.id
                          }
                          className="tork-panel tork-panel-hover rounded-3xl p-5"
                        >
                          <div className="flex items-center justify-between gap-4">

                            <div>
                              <div className="text-lg font-black text-white">
                                {
                                  load.origin
                                }

                                <span className="mx-2 text-[#ffcc00]">
                                  →
                                </span>

                                {
                                  load.destination
                                }
                              </div>

                              <div className="mt-2 text-xs text-slate-500">
                                {
                                  load.tonnage
                                }{" "}
                                Ton ·{" "}
                                {
                                  load.vehicle_type
                                }
                              </div>
                            </div>

                            <span className="rounded-full border border-[#ffcc00]/15 bg-[#ffcc00]/8 px-3 py-1.5 text-[10px] font-black uppercase text-[#ffcc00]">
                              {
                                load.status
                              }
                            </span>

                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            )}

          {/* =================================================
              CREATE LOAD
          ================================================= */}

          {userDashboard.role ===
            "shipper" &&
            activeTab ===
              "create" && (
              <div className="tork-fade-up max-w-4xl">

                <SectionHeading
                  eyebrow="Marketplace"
                  title="Yeni yük oluştur"
                  description="Taşımanın temel operasyon bilgilerini girin."
                />

                <form
                  onSubmit={
                    handleCreateLoad
                  }
                  className="tork-panel rounded-3xl p-6 sm:p-8"
                >

                  <div className="grid gap-5 md:grid-cols-2">

                    <Field
                      label="Yükleme noktası"
                      value={
                        origin
                      }
                      onChange={
                        setOrigin
                      }
                      placeholder="Trabzon Arsin OSB"
                    />

                    <Field
                      label="Teslimat noktası"
                      value={
                        destination
                      }
                      onChange={
                        setDestination
                      }
                      placeholder="Ankara Sincan OSB"
                    />

                    <Field
                      label="Tonaj"
                      type="number"
                      value={
                        tonnage
                      }
                      onChange={
                        setTonnage
                      }
                      placeholder="24"
                    />

                    <div>
                      <label className="tork-eyebrow mb-2 block">
                        Araç tipi
                      </label>

                      <select
                        className="tork-input px-4 py-3.5 text-sm"
                        value={
                          vehicle
                        }
                        onChange={(e) =>
                          setVehicle(
                            e.target.value,
                          )
                        }
                      >
                        <option>
                          TIR (Tenteli)
                        </option>
                        <option>
                          Kamyon
                        </option>
                        <option>
                          Frigo
                        </option>
                        <option>
                          Kırkayak
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="tork-eyebrow mb-2 block">
                        Yük cinsi
                      </label>

                      <select
                        className="tork-input px-4 py-3.5 text-sm"
                        value={
                          cargoType
                        }
                        onChange={(e) =>
                          setCargoType(
                            e.target.value,
                          )
                        }
                      >
                        <option>
                          Paletli Ürün
                        </option>
                        <option>
                          Dökme Yük
                        </option>
                        <option>
                          Konteyner
                        </option>
                        <option>
                          Çuval / Paket
                        </option>
                        <option>
                          Makine / Ekipman
                        </option>
                      </select>
                    </div>

                    <Field
                      label="Koli / Palet"
                      value={
                        packageCount
                      }
                      onChange={
                        setPackageCount
                      }
                      placeholder="33 Euro Palet"
                    />

                    <div className="md:col-span-2">
                      <label className="tork-eyebrow mb-2 block">
                        Açıklama
                      </label>

                      <textarea
                        rows={5}
                        value={
                          loadDescription
                        }
                        onChange={(e) =>
                          setLoadDescription(
                            e.target.value,
                          )
                        }
                        className="tork-input resize-none px-4 py-3.5 text-sm"
                        placeholder="Operasyon notları..."
                      />
                    </div>
                  </div>

                  <div className="mt-7 flex justify-end border-t border-white/6 pt-6">
                    <button
                      type="submit"
                      disabled={
                        loading
                      }
                      className="tork-button-primary rounded-xl px-6 py-3.5 text-xs font-black"
                    >
                      {loading
                        ? "Yayınlanıyor..."
                        : "İlanı yayınla →"}
                    </button>
                  </div>
                </form>
              </div>
            )}

          {/* =================================================
              BIDS
          ================================================= */}

          {userDashboard.role ===
            "shipper" &&
            activeTab ===
              "bids" && (
              <div className="tork-fade-up">

                <SectionHeading
                  eyebrow="Marketplace"
                  title="Gelen teklifler"
                  description="Yüklerinize gelen taşıyıcı teklifleri."
                />

                {incomingBids.length ===
                0 ? (
                  <EmptyState
                    title="Henüz teklif yok"
                    text="Yayınladığınız yükler taşıyıcılar tarafından görüldükçe burada teklifler oluşacak."
                  />
                ) : (
                  <div className="grid gap-4">

                    {incomingBids.map(
                      (bid) => (
                        <div
                          key={
                            bid.id
                          }
                          className="tork-panel rounded-3xl p-6"
                        >

                          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                            <div>
                              <div className="tork-eyebrow mb-2">
                                Navlun
                              </div>

                              <div className="text-3xl font-black text-[#ffcc00]">
                                {
                                  bid.amount
                                }{" "}
                                TL
                              </div>

                              <div className="mt-2 text-sm font-bold text-white">
                                {
                                  bid.loads
                                    ?.origin
                                }

                                <span className="mx-2 text-[#ffcc00]">
                                  →
                                </span>

                                {
                                  bid.loads
                                    ?.destination
                                }
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                {
                                  bid.profiles
                                    ?.company_name ||
                                  "Nakliyeci"
                                }
                              </div>
                            </div>

                            {bid.status ===
                            "pending" ? (
                              <div className="flex gap-2">

                                <button
                                  onClick={() =>
                                    handleUpdateBidStatus(
                                      bid.id,
                                      bid.load_id,
                                      "accepted",
                                    )
                                  }
                                  className="tork-button-primary rounded-xl px-5 py-3 text-xs font-black"
                                >
                                  Kabul et
                                </button>

                                <button
                                  onClick={() =>
                                    handleUpdateBidStatus(
                                      bid.id,
                                      bid.load_id,
                                      "rejected",
                                    )
                                  }
                                  className="rounded-xl border border-red-500/15 bg-red-500/5 px-5 py-3 text-xs font-bold text-red-400"
                                >
                                  Reddet
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs font-black uppercase text-slate-500">
                                {
                                  bid.status
                                }
                              </span>
                            )}
                          </div>
                        </div>
                      ),
                    )}

                  </div>
                )}
              </div>
            )}

          {/* =================================================
              CARRIER BOARD
          ================================================= */}

          {userDashboard.role ===
            "carrier" &&
            activeTab ===
              "board" && (
              <div className="tork-fade-up">

                <SectionHeading
                  eyebrow="Marketplace"
                  title="Uygun yükler"
                  description="Tork ağına açılmış aktif taşıma talepleri."
                />

                {loads.length ===
                0 ? (
                  <EmptyState
                    title="Şu anda açık yük yok"
                    text="Yeni yükler yayınlandığında burada görünecek."
                  />
                ) : (
                  <div className="grid gap-4">

                    {loads.map(
                      (load) => (
                        <div
                          key={
                            load.id
                          }
                          className="tork-panel rounded-3xl p-6"
                        >

                          <div className="flex flex-col gap-5">

                            <div className="flex items-center justify-between gap-4">

                              <div>
                                <div className="text-xl font-black text-white">
                                  {
                                    load.origin
                                  }

                                  <span className="mx-2 text-[#ffcc00]">
                                    →
                                  </span>

                                  {
                                    load.destination
                                  }
                                </div>

                                <div className="mt-2 text-xs text-slate-500">
                                  {
                                    load.tonnage
                                  }{" "}
                                  Ton ·{" "}
                                  {
                                    load.vehicle_type
                                  }
                                </div>
                              </div>

                              <button
                                onClick={() =>
                                  setActiveBidLoadId(
                                    load.id,
                                  )
                                }
                                className="tork-button-primary rounded-xl px-5 py-3 text-xs font-black"
                              >
                                Teklif ver
                              </button>

                            </div>

                            {activeBidLoadId ===
                              load.id && (
                              <div className="flex flex-col gap-3 border-t border-white/6 pt-4 sm:flex-row">

                                <input
                                  type="number"
                                  value={
                                    bidAmount
                                  }
                                  onChange={(e) =>
                                    setBidAmount(
                                      e.target.value,
                                    )
                                  }
                                  className="tork-input flex-1 px-4 py-3 text-sm"
                                  placeholder="Navlun teklifiniz (TL)"
                                />

                                <button
                                  onClick={() =>
                                    handleSendBid(
                                      load.id,
                                    )
                                  }
                                  className="tork-button-primary rounded-xl px-5 py-3 text-xs font-black"
                                >
                                  Gönder
                                </button>

                                <button
                                  onClick={() => {
                                    setActiveBidLoadId(
                                      null,
                                    );
                                    setBidAmount(
                                      "",
                                    );
                                  }}
                                  className="tork-button-secondary rounded-xl px-5 py-3 text-xs font-bold"
                                >
                                  İptal
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ),
                    )}

                  </div>
                )}
              </div>
            )}

          {/* =================================================
              WALLET
          ================================================= */}

          {activeTab ===
            "wallet" && (
            <div className="tork-fade-up max-w-5xl">

              <SectionHeading
                eyebrow="Finans"
                title="Cüzdan"
                description="Bakiye, hakediş ve ödeme süreçleri."
              />

              <div className="grid gap-5 md:grid-cols-[1.2fr_.8fr]">

                <div className="tork-panel rounded-3xl p-7">

                  <div className="tork-eyebrow">
                    Kullanılabilir bakiye
                  </div>

                  <div className="mt-3 text-5xl font-black tracking-[-0.05em] text-[#ffcc00]">
                    ₺
                    {walletBalance.toLocaleString(
                      "tr-TR",
                      {
                        minimumFractionDigits: 2,
                      },
                    )}
                  </div>

                  <div className="mt-2 text-sm text-slate-500">
                    Tork cüzdanı
                  </div>

                  <div className="mt-7 grid gap-3 sm:grid-cols-2">

                    <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
                      <div className="text-xs text-slate-600">
                        Bekleyen ödeme
                      </div>

                      <div className="mt-2 text-xl font-black text-white">
                        ₺0
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
                      <div className="text-xs text-slate-600">
                        Toplam hakediş
                      </div>

                      <div className="mt-2 text-xl font-black text-white">
                        ₺0
                      </div>
                    </div>

                  </div>
                </div>

                <div className="tork-panel rounded-3xl p-6">

                  <div className="tork-eyebrow">
                    Finansal güvenlik
                  </div>

                  <div className="mt-2 text-lg font-black text-white">
                    Güvenli ödeme altyapısı
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Gerçek ödeme sağlayıcısı ve escrow entegrasyonu bağlandığında hakediş, ödeme ve işlem geçmişi burada yönetilecek.
                  </p>

                  <div className="mt-6 rounded-2xl border border-[#ffcc00]/10 bg-[#ffcc00]/5 p-4">
                    <div className="text-xs font-black text-[#ffcc00]">
                      HAZIR
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      Finans modülü için arayüz hazır.
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* =================================================
              PROFILE
          ================================================= */}

          {activeTab ===
            "profile" && (
            <div className="tork-fade-up">

              <SectionHeading
                eyebrow="Hesap & Güvenlik"
                title="Profil ve kurumsal bilgiler"
                description="Kimlik, şirket, finansal güvenlik, bildirim ve KVKK yönetimi."
              />

              <div className="grid gap-6 lg:grid-cols-[230px_1fr]">

                {/* PROFILE NAV */}

                <div className="tork-panel h-fit rounded-3xl p-3">

                  {[
                    {
                      id: "company",
                      label:
                        "Kurumsal Bilgiler",
                    },
                    {
                      id: "finance",
                      label:
                        "IBAN & Ödemeler",
                    },
                    {
                      id: "notifications",
                      label:
                        "Bildirimler",
                    },
                    {
                      id: "kvkk",
                      label:
                        "KVKK & Veri",
                    },
                    {
                      id: "security",
                      label:
                        "Güvenlik",
                    },
                  ].map(
                    (item) => (
                      <button
                        key={
                          item.id
                        }
                        onClick={() =>
                          setProfileSection(
                            item.id,
                          )
                        }
                        className={`w-full rounded-xl px-3 py-3 text-left text-xs font-bold transition ${
                          profileSection ===
                          item.id
                            ? "bg-[#ffcc00]/8 text-[#ffcc00]"
                            : "text-slate-500 hover:bg-white/[0.03] hover:text-white"
                        }`}
                      >
                        {
                          item.label
                        }
                      </button>
                    ),
                  )}

                </div>

                {/* PROFILE CONTENT */}

                <div className="tork-panel rounded-3xl p-6 sm:p-8">

                  {profileSection ===
                    "company" && (
                    <div>
                      <div className="tork-eyebrow">
                        Kurumsal & Kimlik
                      </div>

                      <h3 className="mt-1 text-xl font-black text-white">
                        Şirket bilgileri
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Resmi şirket ve kimlik bilgilerinizin yönetimi.
                      </p>

                      <div className="mt-7 grid gap-5 md:grid-cols-2">

                        <Field
                          label="Şirket unvanı"
                          value={
                            legalCompanyName
                          }
                          onChange={
                            setLegalCompanyName
                          }
                          placeholder="ABC Lojistik A.Ş."
                        />

                        <Field
                          label="Telefon"
                          value={
                            phone
                          }
                          onChange={
                            setPhone
                          }
                          placeholder="0532 000 00 00"
                        />

                        <Field
                          label="Vergi numarası"
                          value={
                            taxNumber
                          }
                          onChange={
                            setTaxNumber
                          }
                          placeholder="1234567890"
                        />

                        <Field
                          label="Vergi dairesi"
                          value={
                            taxOffice
                          }
                          onChange={
                            setTaxOffice
                          }
                          placeholder="Çankaya"
                        />

                        <Field
                          label="MERSİS numarası"
                          value={
                            mersisNumber
                          }
                          onChange={
                            setMersisNumber
                          }
                          placeholder="0000000000000000"
                        />

                        <Field
                          label="Ticaret sicil numarası"
                          value={
                            commercialRegistryNumber
                          }
                          onChange={
                            setCommercialRegistryNumber
                          }
                          placeholder="123456"
                        />

                        <div className="md:col-span-2">
                          <Field
                            label="Merkez adresi"
                            value={
                              companyAddress
                            }
                            onChange={
                              setCompanyAddress
                            }
                            placeholder="Şirket merkez adresi"
                          />
                        </div>

                      </div>

                      <div className="mt-7 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-4">
                        <div className="text-xs font-black text-emerald-400">
                          DOĞRULAMA DURUMU
                        </div>

                        <div className="mt-1 text-xs leading-5 text-slate-500">
                          Şirket bilgilerinin resmi kaynaklarla doğrulanması sonraki KYC/KYB modülüne bağlanacaktır.
                        </div>
                      </div>

                      <div className="mt-7 flex justify-end">
                        <button
                          onClick={
                            handleProfileSave
                          }
                          disabled={
                            loading
                          }
                          className="tork-button-primary rounded-xl px-6 py-3 text-xs font-black"
                        >
                          {loading
                            ? "Kaydediliyor..."
                            : "Bilgileri kaydet"}
                        </button>
                      </div>
                    </div>
                  )}

                  {profileSection ===
                    "finance" && (
                    <div>
                      <div className="tork-eyebrow">
                        Finansal Güvenlik
                      </div>

                      <h3 className="mt-1 text-xl font-black text-white">
                        IBAN ve ödeme hesabı
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Hakediş ve ticari ödeme hesabınızı güvenli şekilde yönetin.
                      </p>

                      <div className="mt-7 rounded-2xl border border-white/6 bg-black/15 p-5">

                        <div className="tork-eyebrow mb-2">
                          Mevcut IBAN
                        </div>

                        <div className="text-base font-bold tracking-wide text-white">
                          {iban
                            ? iban.replace(
                                /\d(?=\d{4})/g,
                                "•",
                              )
                            : "Henüz IBAN tanımlanmadı"}
                        </div>

                      </div>

                      <div className="mt-5 grid gap-5 md:grid-cols-2">

                        <Field
                          label="IBAN"
                          value={
                            iban
                          }
                          onChange={
                            setIban
                          }
                          placeholder="TR00 0000 0000 0000 0000 0000 00"
                          disabled={
                            !ibanChangeRequested
                          }
                        />

                        <div className="rounded-2xl border border-[#ffcc00]/10 bg-[#ffcc00]/5 p-4">

                          <div className="text-xs font-black text-[#ffcc00]">
                            GÜVENLİ DEĞİŞİKLİK
                          </div>

                          <div className="mt-1 text-xs leading-5 text-slate-500">
                            IBAN değişikliği OTP ve soğuma süresi ile korunur.
                          </div>

                        </div>

                      </div>

                      {!ibanChangeRequested ? (
                        <button
                          onClick={
                            requestIbanChange
                          }
                          className="tork-button-secondary mt-6 rounded-xl px-5 py-3 text-xs font-black"
                        >
                          IBAN değişikliğini başlat
                        </button>
                      ) : (
                        <div className="mt-6 space-y-4">

                          {!ibanOtpSent ? (
                            <button
                              onClick={
                                sendIbanOtp
                              }
                              className="tork-button-primary rounded-xl px-5 py-3 text-xs font-black"
                            >
                              OTP gönder
                            </button>
                          ) : (
                            <>
                              <Field
                                label="6 haneli OTP"
                                value={
                                  ibanOtp
                                }
                                onChange={
                                  setIbanOtp
                                }
                                placeholder="123456"
                              />

                              <button
                                onClick={
                                  verifyIbanOtp
                                }
                                className="tork-button-primary rounded-xl px-5 py-3 text-xs font-black"
                              >
                                OTP'yi doğrula
                              </button>
                            </>
                          )}

                        </div>
                      )}

                      <div className="mt-6 rounded-2xl border border-red-500/10 bg-red-500/5 p-4">
                        <div className="text-xs font-black text-red-400">
                          SOĞUMA SÜRESİ
                        </div>

                        <div className="mt-1 text-xs leading-5 text-slate-500">
                          Güvenlik nedeniyle IBAN değişikliklerinden sonra ödeme işlemlerine geçici kısıt uygulanabilir.
                        </div>
                      </div>

                    </div>
                  )}

                  {profileSection ===
                    "notifications" && (
                    <div>
                      <div className="tork-eyebrow">
                        Bildirim Merkezi
                      </div>

                      <h3 className="mt-1 text-xl font-black text-white">
                        Bildirim tercihleri
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Tork'un sizinle hangi kanallardan iletişim kuracağını yönetin.
                      </p>

                      <div className="mt-6">

                        <SettingRow
                          title="SMS bildirimleri"
                          description="Operasyon ve standart sistem bildirimleri."
                        >
                          <Toggle
                            checked={
                              notifications.sms
                            }
                            onChange={(
                              value,
                            ) =>
                              setNotifications(
                                (
                                  current,
                                ) => ({
                                  ...current,
                                  sms: value,
                                }),
                              )
                            }
                          />
                        </SettingRow>

                        <SettingRow
                          title="E-posta bildirimleri"
                          description="Operasyon, rapor ve hesap bildirimleri."
                        >
                          <Toggle
                            checked={
                              notifications.email
                            }
                            onChange={(
                              value,
                            ) =>
                              setNotifications(
                                (
                                  current,
                                ) => ({
                                  ...current,
                                  email:
                                    value,
                                }),
                              )
                            }
                          />
                        </SettingRow>

                        <SettingRow
                          title="Anlık bildirimler"
                          description="Mobil/web push bildirimleri."
                        >
                          <Toggle
                            checked={
                              notifications.push
                            }
                            onChange={(
                              value,
                            ) =>
                              setNotifications(
                                (
                                  current,
                                ) => ({
                                  ...current,
                                  push: value,
                                }),
                              )
                            }
                          />
                        </SettingRow>

                        <SettingRow
                          title="Kritik güvenlik ve ödeme uyarıları"
                          description="Bu bildirimler güvenlik nedeniyle zorunludur."
                        >
                          <Toggle
                            checked
                            disabled
                            onChange={() => {}}
                          />
                        </SettingRow>

                      </div>
                    </div>
                  )}

                  {profileSection ===
                    "kvkk" && (
                    <div>

                      <div className="tork-eyebrow">
                        KVKK & Veri Yönetimi
                      </div>

                      <h3 className="mt-1 text-xl font-black text-white">
                        Gizlilik ve veri hakları
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Kişisel verileriniz ve hesap kapatma talepleriniz burada yönetilir.
                      </p>

                      <div className="mt-6">

                        <SettingRow
                          title="Pazarlama iletişimi"
                          description="Kampanya ve tanıtım iletişimi için açık rıza."
                        >
                          <Toggle
                            checked={
                              kvkkMarketingConsent
                            }
                            onChange={(
                              value,
                            ) =>
                              setKvkkMarketingConsent(
                                value,
                              )
                            }
                          />
                        </SettingRow>

                        <SettingRow
                          title="Veri silme / anonimleştirme talebi"
                          description="Yasal saklama yükümlülükleri dikkate alınarak hesabınızın veri yönetim talebini başlatır."
                        >
                          <button
                            onClick={
                              requestDataDeletion
                            }
                            className="rounded-xl border border-red-500/15 bg-red-500/5 px-4 py-2.5 text-xs font-black text-red-400"
                          >
                            {dataDeletionRequested
                              ? "TALEP ALINDI"
                              : "Talep oluştur"}
                          </button>
                        </SettingRow>

                      </div>

                      <div className="mt-6 rounded-2xl border border-white/6 bg-white/[0.02] p-5">
                        <div className="text-xs font-black text-white">
                          Veri erişim ve silme
                        </div>

                        <p className="mt-2 text-xs leading-5 text-slate-600">
                          Kimlik, şirket, iletişim ve işlem verileri yasal gereklilikler doğrultusunda saklanabilir. Silme talepleri gerekli hukuki inceleme sonrasında uygulanır.
                        </p>
                      </div>

                    </div>
                  )}

                  {profileSection ===
                    "security" && (
                    <div>

                      <div className="tork-eyebrow">
                        Hesap Güvenliği
                      </div>

                      <h3 className="mt-1 text-xl font-black text-white">
                        Güvenlik merkezi
                      </h3>

                      <div className="mt-6">

                        <SettingRow
                          title="Çok faktörlü doğrulama"
                          description="Hesap girişlerini ikinci bir doğrulama katmanıyla korur."
                        >
                          <span className="rounded-full border border-emerald-500/10 bg-emerald-500/5 px-3 py-1.5 text-[10px] font-black text-emerald-400">
                            AKTİF
                          </span>
                        </SettingRow>

                        <SettingRow
                          title="Kritik değişiklik koruması"
                          description="IBAN ve ödeme bilgisi değişikliklerinde OTP ve soğuma süresi uygulanır."
                        >
                          <span className="rounded-full border border-[#ffcc00]/10 bg-[#ffcc00]/5 px-3 py-1.5 text-[10px] font-black text-[#ffcc00]">
                            AKTİF
                          </span>
                        </SettingRow>

                        <SettingRow
                          title="Oturum güvenliği"
                          description="Şüpheli oturumlar ve kritik hesap hareketleri izlenir."
                        >
                          <span className="rounded-full border border-emerald-500/10 bg-emerald-500/5 px-3 py-1.5 text-[10px] font-black text-emerald-400">
                            İZLENİYOR
                          </span>
                        </SettingRow>

                      </div>

                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

          {/* =================================================
              SETTINGS
          ================================================= */}

          {activeTab ===
            "settings" && (
            <div className="tork-fade-up">

              <SectionHeading
                eyebrow="Platform Configuration"
                title="Ayarlar"
                description="Operasyon kuralları, entegrasyonlar, güvenlik ve yetkilendirme."
              />

              <div className="grid gap-6 lg:grid-cols-[240px_1fr]">

                {/* SETTINGS NAV */}

                <div className="tork-panel h-fit rounded-3xl p-3">

                  {[
                    {
                      id: "operations",
                      label:
                        "Operasyonel Parametreler",
                    },
                    {
                      id: "system",
                      label:
                        "Sistem & Entegrasyon",
                    },
                    {
                      id: "roles",
                      label:
                        "Rol & Yetkilendirme",
                    },
                    {
                      id: "security",
                      label:
                        "Güvenlik Politikaları",
                    },
                  ].map(
                    (item) => (
                      <button
                        key={
                          item.id
                        }
                        onClick={() =>
                          setSettingsSection(
                            item.id,
                          )
                        }
                        className={`w-full rounded-xl px-3 py-3 text-left text-xs font-bold ${
                          settingsSection ===
                          item.id
                            ? "bg-[#ffcc00]/8 text-[#ffcc00]"
                            : "text-slate-500 hover:bg-white/[0.03] hover:text-white"
                        }`}
                      >
                        {
                          item.label
                        }
                      </button>
                    ),
                  )}

                </div>

                {/* SETTINGS CONTENT */}

                <div className="tork-panel rounded-3xl p-6 sm:p-8">

                  {/* OPERATIONS */}

                  {settingsSection ===
                    "operations" && (
                    <div>

                      <div className="tork-eyebrow">
                        Operations Engine
                      </div>

                      <h3 className="mt-1 text-xl font-black text-white">
                        Operasyonel parametreler
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Navlun, GPS, gecikme ve güven skoru gibi platform kurallarını yönetin.
                      </p>

                      <div className="mt-6">

                        <SettingRow
                          title="Sistem komisyon oranı"
                          description="Tamamlanan taşımalarda platformun uygulayacağı varsayılan komisyon."
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={
                                commissionRate
                              }
                              onChange={(e) =>
                                setCommissionRate(
                                  Number(
                                    e.target.value,
                                  ),
                                )
                              }
                              className="tork-input w-20 px-3 py-2 text-center text-sm"
                              min="0"
                              max="100"
                            />

                            <span className="text-xs text-slate-500">
                              %
                            </span>
                          </div>
                        </SettingRow>

                        <SettingRow
                          title="GPS takip sıklığı"
                          description="Sürücü konumunun saniye cinsinden varsayılan güncelleme aralığı."
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={
                                gpsFrequency
                              }
                              onChange={(e) =>
                                setGpsFrequency(
                                  Number(
                                    e.target.value,
                                  ),
                                )
                              }
                              className="tork-input w-24 px-3 py-2 text-center text-sm"
                              min="5"
                              max="300"
                            />

                            <span className="text-xs text-slate-500">
                              sn
                            </span>
                          </div>
                        </SettingRow>

                        <SettingRow
                          title="Teslimat gecikme eşiği"
                          description="ETA bu süreyi aştığında gecikme alarmı üretilir."
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={
                                delayThreshold
                              }
                              onChange={(e) =>
                                setDelayThreshold(
                                  Number(
                                    e.target.value,
                                  ),
                                )
                              }
                              className="tork-input w-24 px-3 py-2 text-center text-sm"
                              min="1"
                            />

                            <span className="text-xs text-slate-500">
                              dk
                            </span>
                          </div>
                        </SettingRow>

                      </div>

                      <div className="mt-7 border-t border-white/6 pt-6">

                        <div className="tork-eyebrow mb-2">
                          Matching / Trust
                        </div>

                        <div className="text-sm font-bold text-white">
                          Güven skoru ağırlıkları
                        </div>

                        <div className="mt-1 text-xs text-slate-600">
                          Toplam %100 olmalıdır.
                        </div>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">

                          {[
                            [
                              "Konum",
                              trustWeightLocation,
                              setTrustWeightLocation,
                            ],
                            [
                              "Araç uygunluğu",
                              trustWeightVehicle,
                              setTrustWeightVehicle,
                            ],
                            [
                              "Fiyat",
                              trustWeightPrice,
                              setTrustWeightPrice,
                            ],
                            [
                              "Performans",
                              trustWeightPerformance,
                              setTrustWeightPerformance,
                            ],
                            [
                              "Güvenilirlik",
                              trustWeightReliability,
                              setTrustWeightReliability,
                            ],
                          ].map(
                            (item) => (
                              <div
                                key={
                                  item[0]
                                }
                              >
                                <label className="tork-eyebrow mb-2 block">
                                  {
                                    item[0]
                                  }
                                </label>

                                <input
                                  type="number"
                                  value={
                                    item[1]
                                  }
                                  onChange={(e) =>
                                    item[2](
                                      Number(
                                        e.target
                                          .value,
                                      ),
                                    )
                                  }
                                  className="tork-input px-4 py-3 text-sm"
                                  min="0"
                                  max="100"
                                />
                              </div>
                            ),
                          )}

                        </div>
                      </div>

                      <div className="mt-7 flex justify-end">
                        <button
                          onClick={
                            saveOperationalSettings
                          }
                          className="tork-button-primary rounded-xl px-6 py-3 text-xs font-black"
                        >
                          Parametreleri kaydet
                        </button>
                      </div>

                    </div>
                  )}

                  {/* SYSTEM */}

                  {settingsSection ===
                    "system" && (
                    <div>

                      <div className="tork-eyebrow">
                        Infrastructure
                      </div>

                      <h3 className="mt-1 text-xl font-black text-white">
                        Sistem ve entegrasyonlar
                      </h3>

                      <div className="mt-6">

                        <SettingRow
                          title="TomTom Truck Routing"
                          description="Kamyon rota hesaplama, trafik ve ETA altyapısı."
                        >
                          <Toggle
                            checked={
                              tomtomEnabled
                            }
                            onChange={
                              setTomtomEnabled
                            }
                          />
                        </SettingRow>

                        <SettingRow
                          title="Harita servisi"
                          description="Canlı operasyon haritası ve rota görselleştirme."
                        >
                          <Toggle
                            checked={
                              mapsEnabled
                            }
                            onChange={
                              setMapsEnabled
                            }
                          />
                        </SettingRow>

                        <SettingRow
                          title="Ödeme entegrasyonu"
                          description="Escrow, ödeme alma ve hakediş altyapısı."
                        >
                          <Toggle
                            checked={
                              paymentIntegrationEnabled
                            }
                            onChange={
                              setPaymentIntegrationEnabled
                            }
                          />
                        </SettingRow>

                        <SettingRow
                          title="API Gateway"
                          description="Harici servis ve platform API çağrılarının merkezi yönetimi."
                        >
                          <Toggle
                            checked={
                              apiGatewayEnabled
                            }
                            onChange={
                              setApiGatewayEnabled
                            }
                          />
                        </SettingRow>

                      </div>

                      <div className="mt-6 rounded-2xl border border-[#ffcc00]/10 bg-[#ffcc00]/5 p-5">

                        <div className="text-xs font-black text-[#ffcc00]">
                          API GÜVENLİĞİ
                        </div>

                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          API anahtarları frontend içine yazılmamalıdır. Harita, ödeme ve dış servis anahtarları server-side environment variable / secret manager üzerinden tutulmalıdır.
                        </p>

                      </div>

                      <div className="mt-6 flex justify-end">
                        <button
                          onClick={
                            saveSystemSettings
                          }
                          className="tork-button-primary rounded-xl px-6 py-3 text-xs font-black"
                        >
                          Sistem ayarlarını kaydet
                        </button>
                      </div>

                    </div>
                  )}

                  {/* ROLES */}

                  {settingsSection ===
                    "roles" && (
                    <div>

                      <div className="tork-eyebrow">
                        Access Control
                      </div>

                      <h3 className="mt-1 text-xl font-black text-white">
                        Rol ve yetkilendirme
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Kurumsal hesap altında çalışan kullanıcıların erişim düzeylerini yönetin.
                      </p>

                      <div className="mt-6">

                        <SettingRow
                          title="Çok kullanıcılı şirket hesabı"
                          description="Aynı şirket hesabı altında birden fazla personel çalıştırmayı etkinleştirir."
                        >
                          <Toggle
                            checked={
                              multiUserEnabled
                            }
                            onChange={
                              setMultiUserEnabled
                            }
                          />
                        </SettingRow>

                      </div>

                      {multiUserEnabled ? (
                        <div className="mt-6">

                          <div className="rounded-2xl border border-white/6 bg-black/15 p-5">

                            <div className="text-sm font-black text-white">
                              Personel ekle
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">

                              <input
                                value={
                                  newEmployeeName
                                }
                                onChange={(e) =>
                                  setNewEmployeeName(
                                    e.target
                                      .value,
                                  )
                                }
                                className="tork-input px-4 py-3 text-sm"
                                placeholder="Ad Soyad"
                              />

                              <input
                                value={
                                  newEmployeeEmail
                                }
                                onChange={(e) =>
                                  setNewEmployeeEmail(
                                    e.target
                                      .value,
                                  )
                                }
                                className="tork-input px-4 py-3 text-sm"
                                placeholder="personel@sirket.com"
                              />

                            </div>

                            <div className="mt-4 flex justify-end">
                              <button
                                onClick={
                                  addEmployee
                                }
                                className="tork-button-primary rounded-xl px-5 py-3 text-xs font-black"
                              >
                                Personel ekle
                              </button>
                            </div>

                          </div>

                          <div className="mt-4 space-y-3">

                            {employees.map(
                              (
                                employee,
                              ) => (
                                <div
                                  key={
                                    employee.id
                                  }
                                  className="flex flex-col gap-4 rounded-2xl border border-white/6 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between"
                                >

                                  <div>
                                    <div className="text-sm font-bold text-white">
                                      {
                                        employee.name
                                      }
                                    </div>

                                    <div className="mt-1 text-xs text-slate-600">
                                      {
                                        employee.email
                                      }
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3">

                                    <select
                                      value={
                                        employee.role
                                      }
                                      onChange={(e) => {
                                        const newRole =
                                          e.target
                                            .value;

                                        setEmployees(
                                          (
                                            current,
                                          ) =>
                                            current.map(
                                              (
                                                item,
                                              ) =>
                                                item.id ===
                                                employee.id
                                                  ? {
                                                      ...item,
                                                      role:
                                                        newRole,
                                                    }
                                                  : item,
                                            ),
                                        );
                                      }}
                                      className="tork-input w-36 px-3 py-2 text-xs"
                                    >
                                      <option value="ADMIN">
                                        Admin
                                      </option>

                                      <option value="OPERATIONS">
                                        Operasyon
                                      </option>

                                      <option value="FINANCE">
                                        Finans
                                      </option>

                                      <option value="SUPPORT">
                                        Destek
                                      </option>

                                      <option value="OPERATOR">
                                        Operatör
                                      </option>
                                    </select>

                                    <button
                                      onClick={() =>
                                        removeEmployee(
                                          employee.id,
                                        )
                                      }
                                      className="rounded-xl border border-red-500/10 bg-red-500/5 px-3 py-2 text-xs font-bold text-red-400"
                                    >
                                      Sil
                                    </button>

                                  </div>
                                </div>
                              ),
                            )}

                          </div>

                        </div>
                      ) : null}

                    </div>
                  )}

                  {/* SECURITY */}

                  {settingsSection ===
                    "security" && (
                    <div>

                      <div className="tork-eyebrow">
                        Security Policy
                      </div>

                      <h3 className="mt-1 text-xl font-black text-white">
                        Güvenlik politikaları
                      </h3>

                      <div className="mt-6">

                        <SettingRow
                          title="MFA zorunluluğu"
                          description="Kurumsal hesaplarda çok faktörlü doğrulama zorunlu tutulur."
                        >
                          <Toggle
                            checked={
                              mfaRequired
                            }
                            onChange={
                              setMfaRequired
                            }
                          />
                        </SettingRow>

                        <SettingRow
                          title="Oturum zaman aşımı"
                          description="Pasif kullanıcı oturumunun dakika cinsinden varsayılan süresi."
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={
                                sessionTimeout
                              }
                              onChange={(e) =>
                                setSessionTimeout(
                                  Number(
                                    e.target.value,
                                  ),
                                )
                              }
                              className="tork-input w-24 px-3 py-2 text-center text-sm"
                              min="5"
                              max="1440"
                            />

                            <span className="text-xs text-slate-500">
                              dk
                            </span>
                          </div>
                        </SettingRow>

                        <SettingRow
                          title="Kritik finansal değişiklik doğrulaması"
                          description="IBAN ve ödeme bilgisi değişikliklerinde OTP + soğuma süresi uygulanır."
                        >
                          <span className="rounded-full border border-emerald-500/10 bg-emerald-500/5 px-3 py-1.5 text-[10px] font-black text-emerald-400">
                            ZORUNLU
                          </span>
                        </SettingRow>

                        <SettingRow
                          title="Kritik bildirimler"
                          description="Güvenlik ve ödeme bildirimleri kullanıcı tarafından kapatılamaz."
                        >
                          <span className="rounded-full border border-[#ffcc00]/10 bg-[#ffcc00]/5 px-3 py-1.5 text-[10px] font-black text-[#ffcc00]">
                            ZORUNLU
                          </span>
                        </SettingRow>

                      </div>

                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

          {message ? (
            <div className="mt-6 rounded-2xl border border-[#ffcc00]/10 bg-[#ffcc00]/5 px-4 py-3 text-xs font-medium text-[#ffd633]">
              {message}
            </div>
          ) : null}

        </section>
      </div>
    </main>
  );
}
