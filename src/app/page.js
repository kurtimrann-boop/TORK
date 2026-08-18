"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import Card from "../components/Card";
import StatusBadge from "../components/StatusBadge";
import StatCard from "../components/StatCard";
import LoadCard from "../components/LoadCard";
import BidCard from "../components/BidCard";
import MetricGroup from "../components/MetricGroup";
import StepIndicator from "../components/StepIndicator";
import ToggleSwitch from "../components/ToggleSwitch";
import SettingCard from "../components/SettingCard";
import RouteVisualization from "../components/RouteVisualization";
import ProvinceSelect from "../components/ProvinceSelect";
import DistrictSelect from "../components/DistrictSelect";
import GlobeAnimation from "../components/GlobeAnimation";
import ShipmentTimeline from "../components/ShipmentTimeline";
import { getMarkerLocation, buildLocationObject } from "../utils/location";
import { getProvinceByName } from "../data/turkeyProvinces";
import WeatherIndicator from "../components/WeatherIndicator";

/* =========================================================
   NAVIGATION
========================================================= */

const SHIPPER_TABS = [
  { id: "overview", label: "Genel Bakış", icon: <IconHome className="h-4 w-4" /> },
  { id: "loads", label: "İlanlarım", icon: <IconPackage className="h-4 w-4" /> },
  { id: "create", label: "Yeni Yük", icon: <IconPlus className="h-4 w-4" /> },
  { id: "bids", label: "Gelen Teklifler", icon: <IconInbox className="h-4 w-4" /> },
  { id: "wallet", label: "Cüzdan", icon: <IconWallet className="h-4 w-4" /> },
  { id: "profile", label: "Profilim", icon: <IconUser className="h-4 w-4" /> },
  { id: "settings", label: "Ayarlar", icon: <IconSettings className="h-4 w-4" /> },
];

const CARRIER_TABS = [
  { id: "overview", label: "Genel Bakış", icon: <IconHome className="h-4 w-4" /> },
  { id: "board", label: "Uygun Yükler", icon: <IconPackage className="h-4 w-4" /> },
  { id: "transports", label: "Aktif Taşımalar", icon: <IconTruck className="h-4 w-4" /> },
  { id: "wallet", label: "Cüzdan", icon: <IconWallet className="h-4 w-4" /> },
  { id: "profile", label: "Profilim", icon: <IconUser className="h-4 w-4" /> },
  { id: "settings", label: "Ayarlar", icon: <IconSettings className="h-4 w-4" /> },
];

/* =========================================================
   ICONS
========================================================= */

function IconHome({ className = "h-4 w-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function IconPackage({ className = "h-4 w-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function IconInbox({ className = "h-4 w-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  );
}

function IconWallet({ className = "h-4 w-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function IconUser({ className = "h-4 w-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function IconSettings({ className = "h-4 w-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconTruck({ className = "h-4 w-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h8M8 17a2 2 0 11-4 0 2 2 0 014 0zM8 17H4a1 1 0 01-1-1v-3.28a1 1 0 01.213-.537l2.36-2.94A1 1 0 016.414 9.1l.008.01L8.414 11a1 1 0 01.293.707V17zm8 0a2 2 0 104 0 2 2 0 00-4 0zM16 17V9.414a1 1 0 01.293-.707l2.36-2.94a1 1 0 01.213-.537V7a1 1 0 00-1-1h-3.586a1 1 0 00-.707.293l-2.36 2.94a1 1 0 01-.213.537V17h4z" />
    </svg>
  );
}

function IconBox({ className = "h-4 w-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function IconPlus({ className = "h-4 w-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

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

  const [createLoadStep, setCreateLoadStep] =
    useState(0);

  /* =======================================================
     LOADS / BIDS
  ======================================================= */

  // Old string-based state (for DB compatibility)
  const [origin, setOrigin] =
    useState("");

  const [destination, setDestination] =
    useState("");

  // New province objects (Phase 1 - Turkey Location System)
  const [originProvince, setOriginProvince] =
    useState(null);

  const [destinationProvince, setDestinationProvince] =
    useState(null);

  const [originDistrict, setOriginDistrict] =
    useState(null);

  const [destinationDistrict, setDestinationDistrict] =
    useState(null);

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

  const [activeDetailLoadId, setActiveDetailLoadId] =
    useState(null);

  const [activeBidLoadId, setActiveBidLoadId] =
    useState(null);

  const [bidAmount, setBidAmount] =
    useState("");

  const [activeTransports, setActiveTransports] =
    useState([]);

  const [bidFilter, setBidFilter] =
    useState("active");

  const [bidSort, setBidSort] =
    useState("lowest");

  const [selectedBids, setSelectedBids] =
    useState([]);

  const [showComparison, setShowComparison] =
    useState(false);

  const [loadFilter, setLoadFilter] =
    useState("all");

  const [loadSearch, setLoadSearch] =
    useState("");

  const [editingLoad, setEditingLoad] =
    useState(null);

  const [deleteConfirmLoad, setDeleteConfirmLoad] =
    useState(null);

  const [loadActionLoading, setLoadActionLoading] =
    useState(false);

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

  const getLifecycleStage = (dbStatus) => {
    if (dbStatus === "completed") return "completed";
    if (dbStatus === "assigned") return "assigned";
    if (dbStatus === "open") return "open";
    return "assigned";
  };

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

  const fetchActiveTransports = async () => {
    const { data, error } =
      await supabase
        .from("bids")
        .select(
          "id, load_id, amount, status, loads(origin, destination, tonnage, vehicle_type, status, created_at)"
        )
        .eq("carrier_id", userDashboard.id)
        .eq("status", "accepted")
        .order("created_at", {
          ascending: false,
        });

    if (!error && data) {
      const transports = data
        .filter((item) => item.loads)
        .map((item) => ({
          ...item.loads,
          acceptedAmount: item.amount,
          acceptedBidId: item.id,
        }));
      setActiveTransports(transports);
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

    const { data: bidsData, error: bidsError } =
      await supabase
        .from("bids")
        .select(
          "id, load_id, carrier_id, amount, status, created_at, loads(origin, destination, tonnage, vehicle_type, status), profiles(company_name)",
        )
        .in(
          "load_id",
          loadIds,
        )
        .order("created_at", {
          ascending: false,
        });

    if (bidsError) {
      setMessage(
        "Teklifler yüklenemedi: " +
          bidsError.message,
      );
      setIncomingBids([]);
      return;
    }

    setIncomingBids(
      bidsData || [],
    );
  };

  const startEditLoad = (load) => {
    if (load.status !== "open") return;

    const originParts =
      typeof load.origin === "string"
        ? load.origin.split(" / ")
        : [];
    const destinationParts =
      typeof load.destination === "string"
        ? load.destination.split(" / ")
        : [];

    setOriginProvince(
      originParts[0]
        ? getProvinceByName(
            originParts[0]
          )
        : null
    );
    setOriginDistrict(originParts[1] || null);
    setDestinationProvince(
      destinationParts[0]
        ? getProvinceByName(
            destinationParts[0]
          )
        : null
    );
    setDestinationDistrict(
      destinationParts[1] || null
    );
    setTonnage(
      load.tonnage != null
        ? String(load.tonnage)
        : ""
    );
    setVehicle(load.vehicle_type || "TIR (Tenteli)");
    setCargoType(load.cargo_type || "Paletli Ürün");
    setPackageCount(
      load.package_count || ""
    );
    setLoadDescription(
      load.description || ""
    );
    setEditingLoad(load);
    setCreateLoadStep(0);
    setActiveTab("create");
  };

  const resetCreateForm = () => {
    setEditingLoad(null);
    setCreateLoadStep(0);
    setOrigin("");
    setDestination("");
    setOriginProvince(null);
    setDestinationProvince(null);
    setOriginDistrict(null);
    setDestinationDistrict(null);
    setTonnage("");
    setVehicle("TIR (Tenteli)");
    setCargoType("Paletli Ürün");
    setPackageCount("");
    setLoadDescription("");
  };

  const handleUpdateLoad =
    async (e) => {
      e.preventDefault();

      if (!editingLoad) return;

      setLoadActionLoading(true);
      setMessage("");

      if (
        !originProvince ||
        !destinationProvince
      ) {
        setMessage(
          "Lütfen başlangıç ve bitiş illerini seçiniz."
        );
        setLoadActionLoading(false);
        return;
      }

      if (
        originProvince.code ===
        destinationProvince.code
      ) {
        setMessage(
          "Başlangıç ve bitiş illeri farklı olmalıdır."
        );
        setLoadActionLoading(false);
        return;
      }

      const originDistrictPart =
        originDistrict
          ? ` / ${originDistrict}`
          : "";
      const destinationDistrictPart =
        destinationDistrict
          ? ` / ${destinationDistrict}`
          : "";

      const originDisplay =
        `${originProvince.name}${originDistrictPart}`;
      const destinationDisplay =
        `${destinationProvince.name}${destinationDistrictPart}`;

      const { error } =
        await supabase
          .from("loads")
          .update({
            origin: originDisplay,
            destination: destinationDisplay,
            tonnage,
            vehicle_type: vehicle,
            cargo_type: cargoType,
            package_count: packageCount,
            description: loadDescription,
          })
          .eq("id", editingLoad.id)
          .eq(
            "shipper_id",
            userDashboard.id
          )
          .eq("status", "open");

      if (error) {
        setMessage(
          "Güncelleme hatası: " +
            error.message
        );
      } else {
        setMessage(
          "Yük ilanı başarıyla güncellendi."
        );

        resetCreateForm();

        await fetchShipperData(
          userDashboard.id
        );
        setActiveTab("loads");
      }

      setLoadActionLoading(false);
    };

  const confirmDeleteLoad = async () => {
    if (!deleteConfirmLoad) return;

    setLoadActionLoading(true);
    setMessage("");

    const { error } =
      await supabase
        .from("loads")
        .delete()
        .eq("id", deleteConfirmLoad.id)
        .eq(
          "shipper_id",
          userDashboard.id
        )
        .eq("status", "open");

    if (error) {
      setMessage(
        "Silme hatası: " +
          error.message
      );
    } else {
      setMessage(
        "Yük ilanı başarıyla silindi."
      );
      setDeleteConfirmLoad(null);
      await fetchShipperData(
        userDashboard.id
      );
    }

    setLoadActionLoading(false);
  };

  useEffect(() => {
    if (!userDashboard) {
      return;
    }

    if (
      userDashboard.role ===
      "carrier"
    ) {
      if (activeTab === "transports") {
        fetchActiveTransports();
      } else {
        fetchOpenLoads();
      }
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

      if (editingLoad) {
        await handleUpdateLoad(e);
        return;
      }

      setLoading(true);
      setMessage("");

      // Validate provinces selected
      if (
        !originProvince ||
        !destinationProvince
      ) {
        setMessage(
          "Lütfen başlangıç ve bitiş illerini seçiniz.",
        );
        setLoading(false);
        return;
      }

      // Prevent same origin/destination
      if (
        originProvince.code ===
        destinationProvince.code
      ) {
        setMessage(
          "Başlangıç ve bitiş illeri farklı olmalıdır.",
        );
        setLoading(false);
        return;
      }

      // Create display strings for DB storage
      const originDistrictPart = originDistrict
        ? ` / ${originDistrict}`
        : "";
      const destinationDistrictPart = destinationDistrict
        ? ` / ${destinationDistrict}`
        : "";

      const originDisplay =
        `${originProvince.name}${originDistrictPart}`;
      const destinationDisplay =
        `${destinationProvince.name}${destinationDistrictPart}`;

      const { error } =
        await supabase
          .from("loads")
          .insert({
            shipper_id:
              userDashboard.id,
            origin: originDisplay,
            destination: destinationDisplay,
            tonnage,
            vehicle_type:
              vehicle,
            cargo_type: cargoType,
            package_count: packageCount,
            description: loadDescription,
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

        // Reset form
        resetCreateForm();

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

      const {
        error: insertError,
      } =
        await supabase
          .from("bids")
          .insert({
            load_id: loadId,
            carrier_id:
              userDashboard.id,
            amount: bidAmount,
            status: "pending",
          });

      if (insertError) {
        setMessage(
          "Teklif verme hatası: " +
            insertError.message,
        );
        setLoading(false);
        return;
      }

      setMessage(
        "Navlun teklifiniz başarıyla iletildi.",
      );

      setActiveBidLoadId(null);
      setBidAmount("");

      setLoading(false);
    };

  const handleUpdateBidStatus =
    async (
      bidId,
      loadId,
      newStatus,
    ) => {
      const normalizedStatus =
        String(
          newStatus || "",
        ).trim();

      if (
        ![
          "accepted",
          "rejected",
        ].includes(
          normalizedStatus,
        )
      ) {
        setMessage(
          "Teklif durumu sadece kabul veya reddet olarak değiştirilebilir.",
        );
        return;
      }

      setLoading(true);

      try {
        if (normalizedStatus === "accepted") {
          const { data, error: acceptError } =
            await supabase.rpc(
              "accept_bid_and_assign_load",
              {
                p_bid_id: bidId,
              },
            );

          if (acceptError || !data) {
            setMessage(
              "Teklif kabul edilemedi: " +
                (acceptError?.message || "Bilinmeyen hata"),
            );
            setLoading(false);
            return;
          }

          setMessage("Teklif kabul edildi.");
        } else {
          const {
            data,
            error: bidError,
          } =
            await supabase.rpc(
              "set_bid_status",
              {
                p_bid_id: bidId,
                p_new_status:
                  normalizedStatus,
              },
            );

          if (bidError) {
            setMessage(
              "Teklif güncellenemedi: " +
                bidError.message,
            );

            setLoading(false);
            return;
          }

          setMessage("Teklif reddedildi.");
        }

        await fetchShipperData(
          userDashboard.id,
        );
      } catch (err) {
        setMessage(
          "Teklif güncellenemedi: " +
            err.message,
        );
      } finally {
        setLoading(false);
      }
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

  const shipperAssignedCount =
    useMemo(
      () =>
        myLoads.filter(
          (load) =>
            load.status ===
            "assigned",
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

        <div className="relative z-10 grid w-full max-w-6xl items-center gap-8 lg:grid-cols-2">
          {/* LEFT: Globe + Brand + Weather */}
          <div className="hidden lg:flex lg:flex-col lg:items-center lg:justify-center lg:gap-6">
            <div className="w-full max-w-md">
              <GlobeAnimation className="h-48 w-full" />
            </div>

            <div className="text-center">
              <div className="mb-7 flex items-center justify-center gap-4">
                <TorkLogo />

                <div>
                  <div className="text-2xl font-black tracking-[-0.04em] text-white">
                    Tork
                    <span className="text-[#ffcc00]">.</span>
                  </div>

                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-600">
                    Navlun Operasyon Platformu
                  </div>
                </div>
              </div>

              <div className="tork-eyebrow mb-4">
                B2B Akıllı Navlun Pazaryeri
              </div>

              <h1 className="max-w-2xl text-5xl font-black leading-[0.95] tracking-[-0.055em] text-white xl:text-7xl">
                Yükü yayınla.
                <br />
                <span className="tork-brand">
                  Teklifi topla.
                  <br />
                  Rota&apos;yı izle.
                </span>
              </h1>

              <p className="mt-7 max-w-xl text-base leading-7 text-slate-500">
                Türkiye&apos;nin dijital taşımacılık ağı.
              </p>

              <div className="mt-6 flex justify-center">
                <WeatherIndicator />
              </div>
            </div>
          </div>

          {/* RIGHT: Auth Panel */}
          <div className="flex flex-col justify-center">
            <div className="mb-7 lg:hidden">
              <div className="flex items-center justify-center gap-3">
                <TorkLogo compact />

                <div>
                  <div className="text-xl font-black text-white">
                    Tork
                    <span className="text-[#ffcc00]">.</span>
                  </div>

                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                    Navlun Operasyonları
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6 lg:hidden">
              <div className="w-full max-w-xs mx-auto">
                <GlobeAnimation className="h-40 w-full" />
              </div>
            </div>

            <div className="mb-6 flex justify-center lg:hidden">
              <WeatherIndicator />
            </div>

            <div className="tork-panel tork-fade-up rounded-[28px] p-6 sm:p-8">

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
                  <IconBox className="h-3.5 w-3.5" />
                  Yük Veren
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
                  <IconTruck className="h-3.5 w-3.5" />
                  Nakliyeci
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
                        Yük Veren
                      </option>

                      <option value="carrier">
                        Nakliyeci
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

        <Sidebar
          tabs={tabs}
          activeTab={activeTab}
          userDashboard={userDashboard}
          onTabChange={(tabId) => {
            setActiveTab(tabId);
            setMessage("");
          }}
          onLogout={handleLogout}
        />

        <section className="min-w-0 flex-1 px-5 py-5 sm:px-7 lg:px-10">
          <Topbar
            title={
              tabs.find((tab) => tab.id === activeTab)?.label || "Tork"
            }
            subtitle={`${userDashboard.company_name || "Tork kullanıcısı"} · canlı operasyon merkezi`}
            userDashboard={userDashboard}
          />

          {/* =================================================
              OVERVIEW
          ================================================= */}

           {activeTab === "overview" && (
             <div className="tork-fade-up space-y-8">
               {/* HERO + GLOBE */}
               <div className="relative overflow-hidden rounded-3xl border border-white/8 bg-[#0B111A] px-6 py-8 sm:px-10 lg:min-h-[340px]">
                 <div className="relative z-10 max-w-2xl">
                   <h2 className="text-3xl font-black tracking-[-0.04em] text-[#F5F7FA]">
                     {new Date().getHours() < 12 ? "Günaydın" : "İyi günler"}, {(userDashboard.company_name || "Operatör").split(" ")[0]}
                   </h2>
                   <p className="mt-2 text-sm text-[#9AA7B5]">
                     Canlı operasyon özeti ve hızlı işlemler
                   </p>
                 </div>

                <div className="pointer-events-none absolute inset-y-0 right-0 z-0 hidden w-[55%] lg:block">
                  <div className="h-full w-full">
                    <GlobeAnimation />
                  </div>
                </div>
               </div>

                {/* OPERASYON ÖZETİ */}
               <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                 {userDashboard.role === "shipper" ? (
                   <>
                     <StatCard
                       label="Aktif İlanlar"
                       value={shipperOpenCount}
                       detail="Pazaryeri"
                       accent="emerald"
                     />
                     <StatCard
                       label="Atanan Taşımalar"
                       value={shipperAssignedCount}
                       detail="Devam eden"
                       accent="cyan"
                     />
                     <StatCard
                       label="Gelen Teklifler"
                       value={incomingBids.length}
                       detail="Taşıyıcı teklifleri"
                       accent="amber"
                     />
                     <StatCard
                       label="Cüzdan Bakiyesi"
                       value={`₺${walletBalance.toLocaleString("tr-TR")}`}
                       detail="Kullanılabilir bakiye"
                       accent="emerald"
                     />
                   </>
                 ) : (
                   <>
                     <StatCard
                       label="Açık Yükler"
                       value={loads.length}
                       detail="Pazaryeri"
                       accent="emerald"
                     />
                     <StatCard
                       label="Aktif Taşımalar"
                       value={activeTransports.length}
                       detail="Devam eden"
                       accent="cyan"
                     />
                     <StatCard
                       label="Tekliflerim"
                       value={incomingBids.length}
                       detail="Bekleyen"
                       accent="amber"
                     />
                     <StatCard
                       label="Cüzdan Bakiyesi"
                       value={`₺${walletBalance.toLocaleString("tr-TR")}`}
                       detail="Kullanılabilir bakiye"
                       accent="emerald"
                     />
                   </>
                 )}
               </div>

               {/* MAIN OPERATIONS GRID */}
               <div className="grid gap-6 lg:grid-cols-5">
                 {/* LEFT: RECENT LOADS / BIDS */}
                 <div className="lg:col-span-3 space-y-6">
                   {/* RECENT LOADS */}
                   {userDashboard.role === "shipper" && myLoads.length > 0 && (
                     <div>
                       <div className="mb-4 flex items-center justify-between">
                         <div>
                           <h3 className="text-lg font-black text-[#F5F7FA]">Son Yükler</h3>
                           <p className="mt-1 text-xs text-[#9AA7B5]">Aktif ilanlarınız</p>
                         </div>
                         <button
                           onClick={() => setActiveTab("loads")}
                           className="text-xs font-bold text-[#00E5A0] hover:text-[#00E5A0]/80"
                         >
                           Tümünü Gör →
                         </button>
                       </div>

                       <div className="space-y-3">
                         {myLoads.slice(0, 2).map((load) => {
                           const bidCount = incomingBids.filter((b) => b.load_id === load.id).length;
                           return (
                             <LoadCard
                               key={load.id}
                               load={load}
                               bidCount={bidCount}
                               onViewDetails={() => setActiveDetailLoadId(load.id)}
                             />
                           );
                         })}
                       </div>
                     </div>
                   )}

                   {/* RECENT LOADS (CARRIER VIEW) */}
                   {userDashboard.role === "carrier" && loads.length > 0 && (
                     <div>
                       <div className="mb-4 flex items-center justify-between">
                         <div>
                           <h3 className="text-lg font-black text-[#F5F7FA]">Uygun Yükler</h3>
                           <p className="mt-1 text-xs text-[#9AA7B5]">Açık taşıma fırsatları</p>
                         </div>
                         <button
                           onClick={() => setActiveTab("board")}
                           className="text-xs font-bold text-[#00E5A0] hover:text-[#00E5A0]/80"
                         >
                           Tümünü Gör →
                         </button>
                       </div>

                       <div className="space-y-3">
                         {loads.slice(0, 2).map((load) => (
                           <LoadCard
                             key={load.id}
                             load={load}
                             onViewDetails={() => setActiveDetailLoadId(load.id)}
                             onBid={() => {
                               setActiveTab("board");
                               setActiveBidLoadId(load.id);
                             }}
                           />
                         ))}
                       </div>
                     </div>
                   )}

                   {/* RECENT BIDS */}
                   {incomingBids.length > 0 && (
                     <div>
                       <div className="mb-4 flex items-center justify-between">
                         <div>
                           <h3 className="text-lg font-black text-[#F5F7FA]">
                             {userDashboard.role === "shipper" ? "Son Teklifler" : "Tekliflerim"}
                           </h3>
                           <p className="mt-1 text-xs text-[#9AA7B5]">
                             {userDashboard.role === "shipper" ? "Gelen teklifler" : "Aktif teklifleriniz"}
                           </p>
                         </div>
                         <button
                           onClick={() => setActiveTab("bids")}
                           className="text-xs font-bold text-[#00E5A0] hover:text-[#00E5A0]/80"
                         >
                           Tümünü Gör →
                         </button>
                       </div>

                       <div className="space-y-3">
                         {incomingBids.slice(0, 2).map((bid) => (
                           <BidCard
                             key={bid.id}
                             bid={bid}
                             isCarrierView={userDashboard.role === "carrier"}
                             onAccept={() =>
                               handleUpdateBidStatus(bid.id, bid.load_id, "accepted")
                             }
                             onReject={() =>
                               handleUpdateBidStatus(bid.id, bid.load_id, "rejected")
                             }
                           />
                         ))}
                       </div>
                     </div>
                   )}
                 </div>

                 {/* RIGHT: ANALYTICS + QUICK ACTIONS + SYSTEM STATUS */}
                 <div className="lg:col-span-2 space-y-6">
                   <div className="rounded-2xl border border-white/8 bg-[#0F1723] p-6">
                     <h3 className="mb-2 text-sm font-black text-[#F5F7FA]">
                       {userDashboard.role === "shipper" ? "Navlun Maliyet Trendleri" : "Teklif Performansı"}
                     </h3>
                     <p className="text-xs text-[#9AA7B5]">
                       {userDashboard.role === "shipper" ? "Son 30 günün maliyet analizi" : "Kabul edilen teklifler ve kazanma oranı"}
                     </p>
                     <div className="mt-6 flex h-[260px] items-center justify-center rounded-xl border border-dashed border-white/8 text-xs text-[#667085]">
                       Yeterli veri bulunmuyor
                     </div>
                   </div>

                   <div className="rounded-2xl border border-white/8 bg-[#0F1723] p-6">
                     <h3 className="mb-4 text-sm font-black text-[#F5F7FA]">Hızlı İşlemler</h3>
                     <div className="space-y-3">
                       {userDashboard.role === "shipper" ? (
                         <>
                           <button
                              onClick={() => {
                                resetCreateForm();
                                setActiveTab("create");
                              }}
                             className="w-full rounded-xl border border-[#00E5A0]/25 bg-[#00E5A0]/10 px-4 py-3 text-xs font-black text-[#00E5A0] shadow-[0_0_12px_rgba(0,229,160,0.2)] transition-all hover:border-[#00E5A0]/40 hover:bg-[#00E5A0]/15"
                           >
                             + Yük Oluştur
                           </button>
                           <button
                             onClick={() => setActiveTab("bids")}
                             className="w-full rounded-xl border border-[#06B6D4]/25 bg-[#06B6D4]/8 px-4 py-3 text-xs font-bold text-[#06B6D4] transition-all hover:border-[#06B6D4]/40 hover:bg-[#06B6D4]/12"
                           >
                             Tüm Teklifleri Gör
                           </button>
                         </>
                       ) : (
                         <>
                           <button
                             onClick={() => setActiveTab("board")}
                             className="w-full rounded-xl border border-[#00E5A0]/25 bg-[#00E5A0]/10 px-4 py-3 text-xs font-black text-[#00E5A0] shadow-[0_0_12px_rgba(0,229,160,0.2)] transition-all hover:border-[#00E5A0]/40 hover:bg-[#00E5A0]/15"
                           >
                             Yükleri Gör
                           </button>
                           <button
                             onClick={() => setActiveTab("wallet")}
                             className="w-full rounded-xl border border-[#FBBF24]/25 bg-[#FBBF24]/8 px-4 py-3 text-xs font-bold text-[#FBBF24] transition-all hover:border-[#FBBF24]/40 hover:bg-[#FBBF24]/12"
                           >
                             Cüzdanı Yönet
                           </button>
                         </>
                       )}
                     </div>
                   </div>

                   <div className="rounded-2xl border border-white/8 bg-[#0F1723] p-6">
                     <h3 className="mb-4 text-sm font-black text-[#F5F7FA]">Sistem Durumu</h3>
                     <div className="space-y-3">
                       <div className="flex items-center justify-between text-xs">
                         <span className="text-[#9AA7B5]">MFA Politikası</span>
                         <span className="font-black text-emerald-400">AKTİF</span>
                       </div>
                       <div className="h-px bg-white/6" />
                       <div className="flex items-center justify-between text-xs">
                         <span className="text-[#9AA7B5]">Kritik Uyarılar</span>
                         <span className="font-black text-[#FBBF24]">ZORUNLU</span>
                       </div>
                       <div className="h-px bg-white/6" />
                       <div className="flex items-center justify-between text-xs">
                         <span className="text-[#9AA7B5]">Ağ</span>
                         <span className="font-black text-emerald-400">CANLI</span>
                       </div>
                     </div>
                   </div>
                   </div>

                   </div>
               </div>
             )}

          {/* =================================================
              LOADS
          ================================================= */}

          {userDashboard.role === "shipper" &&
            activeTab === "loads" && (
            <div className="tork-fade-up">
              <div className="mb-8">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9AA7B5]">
                  Navlun Kontrol Merkezi
                </div>
                <h1 className="text-3xl font-black tracking-[-0.04em] text-[#F5F7FA]">
                  Yüklerim
                </h1>
                <p className="mt-2 text-sm text-[#9AA7B5]">
                  Aktif ilanlarınızı yönetin ve gelen teklifleri takip edin
                </p>
              </div>

              {myLoads.length === 0 ? (
                <EmptyState
                  title="Henüz yük ilanı yok"
                  text="İlk yükünüzü oluşturun ve ağdaki taşıyıcılardan teklif almaya başlayın."
                  action={
                    <button
                      onClick={() => setActiveTab("create")}
                      className="rounded-lg border border-[#00E5A0]/25 bg-[#00E5A0]/10 px-6 py-3 text-xs font-black text-[#00E5A0] shadow-[0_0_12px_rgba(0,229,160,0.2)] hover:border-[#00E5A0]/40 hover:bg-[#00E5A0]/15"
                    >
                      Yük Oluştur
                    </button>
                  }
                />
              ) : (
                <div className="space-y-4">
                  {/* SUMMARY CARDS */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9AA7B5]">
                        Toplam
                      </div>
                      <div className="mt-1 text-2xl font-black text-white">
                        {myLoads.length}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[#00E5A0]/15 bg-[#00E5A0]/5 p-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#00E5A0]">
                        Teklife Açık
                      </div>
                      <div className="mt-1 text-2xl font-black text-[#00E5A0]">
                        {myLoads.filter((l) => l.status === "open").length}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300">
                        Atanmış
                      </div>
                      <div className="mt-1 text-2xl font-black text-cyan-300">
                        {myLoads.filter((l) => l.status === "assigned").length}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9AA7B5]">
                        Tamamlanan
                      </div>
                      <div className="mt-1 text-2xl font-black text-white">
                        {myLoads.filter((l) => l.status === "completed").length}
                      </div>
                    </div>
                  </div>

                  {/* FILTER + SEARCH + ACTION */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-2">
                      {["all", "open", "assigned", "completed"].map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setLoadFilter(filter)}
                          className={`rounded-xl px-3 py-2 text-[11px] font-black transition ${
                            loadFilter === filter
                              ? "bg-white/[0.08] text-white"
                              : "text-[#667085] hover:text-[#9AA7B5]"
                          }`}
                        >
                          {filter === "all" ? "Tümü" : filter === "open" ? "Açık" : filter === "assigned" ? "Atanmış" : "Tamamlanan"}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={loadSearch}
                        onChange={(e) => setLoadSearch(e.target.value)}
                        placeholder="Ara..."
                        className="tork-input px-4 py-2.5 text-xs"
                      />
                      <button
                        onClick={() => setActiveTab("create")}
                        className="rounded-lg border border-[#00E5A0]/25 bg-[#00E5A0]/10 px-3 py-2 text-xs font-black text-[#00E5A0] shadow-[0_0_12px_rgba(0,229,160,0.2)] hover:border-[#00E5A0]/40 hover:bg-[#00E5A0]/15"
                      >
                        + Yeni Yük
                      </button>
                    </div>
                  </div>

                  {/* FILTERED LOAD LIST */}
                  {(() => {
                    const filtered = myLoads.filter((load) => {
                      if (loadFilter !== "all" && load.status !== loadFilter) return false;
                      if (!loadSearch.trim()) return true;
                      const q = loadSearch.toLowerCase();
                      return (
                        (load.origin || "").toLowerCase().includes(q) ||
                        (load.destination || "").toLowerCase().includes(q) ||
                        (load.id || "").toLowerCase().includes(q)
                      );
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-10 text-center">
                          <div className="text-sm font-bold text-[#667085]">
                            Filtrelere uygun ilan bulunamadı.
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {filtered.map((load) => {
                          const bidCount = incomingBids.filter(
                            (b) => b.load_id === load.id
                          ).length;
                          const canEdit = load.status === "open";
                          const canDelete = load.status === "open";

                          return (
                            <LoadCard
                              key={load.id}
                              load={load}
                              bidCount={bidCount}
                              onViewDetails={() => setActiveDetailLoadId(load.id)}
                              onEdit={canEdit ? () => startEditLoad(load) : undefined}
                              onDelete={canDelete ? () => setDeleteConfirmLoad(load) : undefined}
                              canEdit={canEdit}
                              canDelete={canDelete}
                            />
                          );
                        })}
                      </div>
                    );
                  })()}
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
                 <div className="tork-fade-up max-w-5xl space-y-6">

                    <SectionHeading
                      eyebrow="Pazaryeri"
                      title={
                        editingLoad
                          ? "İlanı düzenle"
                          : "Yeni yük oluştur"
                      }
                      description={
                        editingLoad
                          ? "Açık ilan bilgilerini güncelleyin."
                          : "Taşımanız için adım adım teklif alabilirsiniz."
                      }
                    />

                    {/* HARİTA + ROTA ÖZETİ */}
                    <div className="tork-panel rounded-3xl overflow-hidden">
                      <div className="relative">
                        <RouteVisualization
                          origin={buildLocationObject({
                            provinceCode: originProvince?.code,
                            provinceName: originProvince?.name,
                            districtName: originDistrict,
                          })}
                          destination={buildLocationObject({
                            provinceCode: destinationProvince?.code,
                            provinceName: destinationProvince?.name,
                            districtName: destinationDistrict,
                          })}
                          originLabel={
                            originProvince?.name +
                              (originDistrict
                                ? " / " + originDistrict
                                : "")
                          }
                          destinationLabel={
                            destinationProvince?.name +
                              (destinationDistrict
                                ? " / " + destinationDistrict
                                : "")
                          }
                        />
                        <div className="absolute top-3 right-3 z-[1000] flex gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-white/10 bg-[#0B111A]/90 px-3 py-1.5 text-[10px] font-bold text-[#F5F7FA] backdrop-blur-sm"
                          >
                            Yol
                          </button>
                          <button
                            type="button"
                            disabled
                            className="rounded-lg border border-white/6 bg-[#0B111A]/60 px-3 py-1.5 text-[10px] font-bold text-[#667085] backdrop-blur-sm opacity-60"
                            title="Uydu görüntüsü yakında"
                          >
                            Uydu
                          </button>
                        </div>
                      </div>
                    </div>

                   <div className="tork-panel rounded-3xl p-6 sm:p-8">

                     {/* STEP INDICATOR */}
                     <div className="mb-8">
                       <StepIndicator
                         steps={[
                           { id: "route", label: "Rota" },
                           { id: "cargo", label: "Yük" },
                           { id: "vehicle", label: "Araç" },
                           { id: "price", label: "Fiyat" },
                           { id: "review", label: "İnceleme" },
                         ]}
                         currentStep={createLoadStep}
                       />
                     </div>

                     <form
                       onSubmit={(e) => {
                         if (createLoadStep === 4) {
                           handleCreateLoad(e);
                         } else {
                           e.preventDefault();
                           setCreateLoadStep(
                             createLoadStep + 1
                           );
                         }
                       }}
                       className="space-y-8"
                     >

                       {/* STEP 1: ROUTE */}
                       {createLoadStep === 0 && (
                         <div className="space-y-6">
                           <div>
                             <h3 className="mb-1 text-lg font-black text-[#F5F7FA]">
                               Rota bilgilerini girin
                             </h3>
                             <p className="text-sm text-[#9AA7B5]">
                               Yükün yükleneceği ve
                               teslim edileceği
                               noktaları belirleyin.
                             </p>
                           </div>

                            <div className="space-y-6">
                              <ProvinceSelect
                                label="Yükleme ili"
                                value={originProvince}
                                onChange={(val) => {
                                  setOriginProvince(val);
                                  setOriginDistrict(null);
                                }}
                                placeholder="İl seçiniz..."
                              />

                              <DistrictSelect
                                label="Yükleme ilçesi"
                                value={originDistrict}
                                onChange={setOriginDistrict}
                                provinceCode={
                                  originProvince?.code
                                }
                                placeholder="İlçe seçiniz..."
                              />

                              <ProvinceSelect
                                label="Teslimat ili"
                                value={destinationProvince}
                                onChange={(val) => {
                                  setDestinationProvince(
                                    val,
                                  );
                                  setDestinationDistrict(
                                    null,
                                  );
                                }}
                                placeholder="İl seçiniz..."
                              />

                              <DistrictSelect
                                label="Teslimat ilçesi"
                                value={destinationDistrict}
                                onChange={
                                  setDestinationDistrict
                                }
                                provinceCode={
                                  destinationProvince?.code
                                }
                                placeholder="İlçe seçiniz..."
                              />
                            </div>
                         </div>
                       )}

                    {/* STEP 2: CARGO */}
                    {createLoadStep === 1 && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="mb-1 text-lg font-black text-[#F5F7FA]">
                            Yük bilgilerini girin
                          </h3>
                          <p className="text-sm text-[#9AA7B5]">
                            Yükünüzün tonajını ve
                            cinsi belirleyin.
                          </p>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                          <Field
                            label="Tonaj"
                            type="number"
                            value={tonnage}
                            onChange={setTonnage}
                            placeholder="24"
                          />

                          <div>
                            <label className="tork-eyebrow mb-2 block">
                              Yük cinsi
                            </label>

                            <select
                              className="tork-input px-4 py-3.5 text-sm"
                              value={cargoType}
                              onChange={(e) =>
                                setCargoType(
                                  e.target.value
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
                                Makine /
                                Ekipman
                              </option>
                            </select>
                          </div>

                          <div className="md:col-span-2">
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
                          </div>
                        </div>
                      </div>
                    )}

                    {/* STEP 3: VEHICLE */}
                    {createLoadStep === 2 && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="mb-1 text-lg font-black text-[#F5F7FA]">
                            Araç talebini girin
                          </h3>
                          <p className="text-sm text-[#9AA7B5]">
                            Taşıma için gerekli
                            araç tipini seçin.
                          </p>
                        </div>

                        <div>
                          <label className="tork-eyebrow mb-3 block">
                            Araç tipi
                          </label>

                          <div className="grid gap-3 sm:grid-cols-2">
                            {[
                              {
                                value:
                                  "TIR (Tenteli)",
                                label:
                                  "TIR (Tenteli)",
                              },
                              {
                                value: "Kamyon",
                                label: "Kamyon",
                              },
                              {
                                value: "Frigo",
                                label: "Frigo",
                              },
                              {
                                value:
                                  "Kırkayak",
                                label:
                                  "Kırkayak",
                              },
                            ].map(
                              (option) => (
                                <button
                                  key={
                                    option.value
                                  }
                                  type="button"
                                  onClick={() =>
                                    setVehicle(
                                      option.value
                                    )
                                  }
                                  className={`rounded-xl border-2 px-4 py-3 text-sm font-bold transition ${
                                    vehicle ===
                                    option.value
                                      ? "border-[#00E5A0] bg-[#00E5A0]/10 text-[#00E5A0]"
                                      : "border-white/10 bg-white/[0.02] text-[#9AA7B5] hover:border-white/20"
                                  }`}
                                >
                                  {option.label}
                                </button>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* STEP 4: PRICE */}
                    {createLoadStep === 3 && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="mb-1 text-lg font-black text-[#F5F7FA]">
                            İlave bilgiler
                          </h3>
                          <p className="text-sm text-[#9AA7B5]">
                            Yükünüz hakkında
                            ek notlar ekleyin.
                          </p>
                        </div>

                        <div className="space-y-5">
                          <div>
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
                                  e.target.value
                                )
                              }
                              className="tork-input resize-none px-4 py-3.5 text-sm"
                              placeholder="Operasyon notları, özel gereksinimler vb."
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* STEP 5: REVIEW */}
                    {createLoadStep === 4 && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="mb-1 text-lg font-black text-[#F5F7FA]">
                            İlanınızı gözden
                            geçirin
                          </h3>
                          <p className="text-sm text-[#9AA7B5]">
                            Tüm bilgilerin
                            doğru olduğunu
                            kontrol edin.
                          </p>
                        </div>

                        <div className="grid gap-4">
                          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                            <div className="tork-eyebrow mb-3">
                              Rota
                            </div>
                            <RouteVisualization
                              origin={buildLocationObject({
                                provinceCode: originProvince?.code,
                                provinceName: originProvince?.name,
                                districtName: originDistrict,
                              })}
                              destination={buildLocationObject({
                                provinceCode: destinationProvince?.code,
                                provinceName: destinationProvince?.name,
                                districtName: destinationDistrict,
                              })}
                              originLabel={
                                originProvince?.name +
                                  (originDistrict
                                    ? " / " + originDistrict
                                    : "")
                              }
                              destinationLabel={
                                destinationProvince?.name +
                                  (destinationDistrict
                                    ? " / " + destinationDistrict
                                    : "")
                              }
                            />
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                              <div className="text-xs text-[#667085]">
                                Tonaj
                              </div>
                              <div className="mt-2 text-2xl font-black text-[#F5F7FA]">
                                {tonnage}{" "}
                                <span className="text-sm font-bold text-[#9AA7B5]">
                                  ton
                                </span>
                              </div>
                            </div>

                            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                              <div className="text-xs text-[#667085]">
                                Araç tipi
                              </div>
                              <div className="mt-2 text-lg font-black text-[#F5F7FA]">
                                {vehicle}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                              <div className="text-xs text-[#667085]">
                                Yük cinsi
                              </div>
                              <div className="mt-2 text-sm font-black text-[#F5F7FA]">
                                {cargoType}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                              <div className="text-xs text-[#667085]">
                                Koli / Palet
                              </div>
                              <div className="mt-2 text-sm font-black text-[#F5F7FA]">
                                {packageCount}
                              </div>
                            </div>
                          </div>

                          {loadDescription && (
                            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                              <div className="text-xs text-[#667085]">
                                Açıklama
                              </div>
                              <div className="mt-2 text-sm leading-6 text-[#F5F7FA]">
                                {loadDescription}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                     {/* ACTION BUTTONS */}
                     <div className="flex justify-between border-t border-white/6 pt-6">
                       <div className="flex gap-2">
                         {editingLoad && (
                           <button
                             type="button"
                              onClick={() => {
                                resetCreateForm();
                                setActiveTab("loads");
                              }}
                             className="rounded-xl px-6 py-3 text-xs font-bold text-[#9AA7B5] transition hover:text-white"
                           >
                             İptal
                           </button>
                         )}
                         <button
                           type="button"
                           onClick={() => {
                             if (createLoadStep > 0) {
                               setCreateLoadStep(
                                 createLoadStep - 1
                               );
                             }
                           }}
                           disabled={createLoadStep === 0}
                           className={`rounded-xl px-6 py-3 text-xs font-bold transition ${
                             createLoadStep === 0
                               ? "cursor-not-allowed text-[#667085]"
                               : "border border-white/10 bg-white/[0.03] text-[#9AA7B5] hover:border-white/20 hover:bg-white/[0.05]"
                           }`}
                         >
                           ← Geri
                         </button>
                       </div>

                       <button
                         type="submit"
                         disabled={loading || loadActionLoading}
                         className="tork-button-primary rounded-xl px-8 py-3 text-xs font-black"
                       >
                         {loading || loadActionLoading
                           ? "İşleniyor..."
                           : editingLoad
                             ? "Değişiklikleri Kaydet →"
                             : createLoadStep === 4
                               ? "İlanı yayınla →"
                               : "Devam et →"}
                       </button>
                     </div>
                  </form>

                </div>
              </div>
            )}

           {/* =================================================
               LOAD DETAIL
           ================================================= */}

           {activeDetailLoadId && (() => {
             const load = [...myLoads, ...loads].find(
               (l) => l.id === activeDetailLoadId
             );
             if (!load) return null;

             const isCarrier =
               userDashboard.role ===
               "carrier";
             const loadBids =
               incomingBids.filter(
                 (b) => b.load_id === load.id
               );
             const userBid = loadBids.find(
               (b) =>
                 b.carrier_id ===
                 userDashboard.id
             );

              const originParts =
                typeof load.origin ===
                "string"
                  ? load.origin.split(" / ")
                  : [];
              const originName =
                originParts[0] || "";
              const originDistrict =
                originParts[1] || null;

              const destinationParts =
                typeof load.destination ===
                "string"
                  ? load.destination.split(
                      " / "
                    )
                  : [];
              const destinationName =
                destinationParts[0] || "";
              const destinationDistrict =
                destinationParts[1] || null;

              const originDetail =
                originName
                  ? buildLocationObject({
                      provinceCode: getProvinceByName(
                        originName
                      )?.code,
                      provinceName: originName,
                      districtName: originDistrict,
                    })
                  : null;
              const destinationDetail =
                destinationName
                  ? buildLocationObject({
                      provinceCode: getProvinceByName(
                        destinationName
                      )?.code,
                      provinceName: destinationName,
                      districtName: destinationDistrict,
                    })
                  : null;

             return (
               <div className="tork-fade-up">
                 <div className="mb-6 flex items-center justify-between">
                   <div>
                     <div className="tork-eyebrow mb-1">
                       Yük Detayı
                     </div>
                     <h1 className="text-2xl font-black text-[#F5F7FA]">
                       {originName} →{" "}
                       {destinationName}
                     </h1>
                   </div>
                   <button
                     onClick={() =>
                       setActiveDetailLoadId(
                         null
                       )
                     }
                     className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-bold text-[#9AA7B5]"
                   >
                     ← Geri
                   </button>
                 </div>

                 <div className="grid gap-6 lg:grid-cols-3">
                   <div className="lg:col-span-2 space-y-6">
                     {originDetail &&
                       destinationDetail && (
                        <RouteVisualization
                          origin={
                            originDetail
                          }
                          destination={
                            destinationDetail
                          }
                          originLabel={
                            originName +
                              (originDistrict
                                ? " / " + originDistrict
                                : "")
                          }
                          destinationLabel={
                            destinationName +
                              (destinationDistrict
                                ? " / " + destinationDistrict
                                : "")
                          }
                        />
                     )}

                     <div className="grid gap-4 sm:grid-cols-2">
                       <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                         <div className="tork-eyebrow mb-2">
                           Tonaj
                         </div>
                         <div className="text-2xl font-black text-[#F5F7FA]">
                           {load.tonnage}{" "}
                           <span className="text-sm font-bold text-[#9AA7B5]">
                             ton
                           </span>
                         </div>
                       </div>
                       <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                         <div className="tork-eyebrow mb-2">
                           Araç tipi
                         </div>
                         <div className="text-lg font-black text-[#F5F7FA]">
                           {load.vehicle_type}
                         </div>
                       </div>
                       <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                         <div className="tork-eyebrow mb-2">
                           Oluşturulma
                         </div>
                         <div className="text-sm font-black text-[#F5F7FA]">
                           {new Date(load.created_at).toLocaleDateString("tr-TR")}
                         </div>
                       </div>
                       <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                         <div className="tork-eyebrow mb-2">
                           Teklifler
                         </div>
                         <div className="text-2xl font-black text-[#F5F7FA]">
                           {loadBids.length}{" "}
                           <span className="text-sm font-bold text-[#9AA7B5]">
                             adet
                           </span>
                         </div>
                       </div>
                     </div>
                   </div>

                   <div className="space-y-4">
                     <div className="tork-panel rounded-3xl p-5">
                       <h3 className="mb-4 text-sm font-black text-[#F5F7FA]">
                         İşlemler
                       </h3>
                       {isCarrier ? (
                         userBid ? (
                           <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                             <div className="tork-eyebrow mb-1">
                               Teklifim
                             </div>
                             <div className="text-xl font-black text-[#00E5A0]">
                               ₺
                               {Number(userBid.amount).toLocaleString(
                                 "tr-TR"
                               )}
                             </div>
                             <div className="mt-2">
                               <StatusBadge
                                 status={
                                   userBid.status
                                 }
                               />
                             </div>
                           </div>
                         ) : (
                           <button
                             onClick={() => {
                               setActiveBidLoadId(
                                 load.id
                               );
                               setActiveDetailLoadId(
                                 null
                               );
                             }}
                             className="tork-button-primary w-full rounded-xl py-3 text-xs font-black"
                           >
                             Teklif Ver
                           </button>
                         )
                       ) : (
                         <button
                           onClick={() =>
                             setActiveTab(
                               "bids"
                             )
                           }
                           className="tork-button-primary w-full rounded-xl py-3 text-xs font-black"
                         >
                           Teklifleri Gör
                         </button>
                       )}
                     </div>
                   </div>
                 </div>
               </div>
             );
           })()}

           {/* =================================================
               BIDS
           ================================================= */}

           {userDashboard.role === "shipper" &&
             activeTab === "bids" && (
             <div className="tork-fade-up">
               <div className="mb-8">
                 <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9AA7B5]">
                   Teklif Yönetimi
                 </div>
                 <h1 className="text-3xl font-black tracking-[-0.04em] text-[#F5F7FA]">
                   Gelen Teklifler
                 </h1>
                 <p className="mt-2 text-sm text-[#9AA7B5]">
                   Taşıyıcılardan gelen teklifleri inceleyin ve yönetin
                 </p>
               </div>

               {incomingBids.length === 0 ? (
                 <EmptyState
                   title="Henüz teklif yok"
                   text="Taşıyıcılar yüklerinize teklif verdiğinde burada görünecek."
                 />
               ) : (
                 <div className="space-y-4">
                   {/* SUMMARY */}
                   <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                     <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                       <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9AA7B5]">
                         Gelen Teklif
                       </div>
                       <div className="mt-1 text-2xl font-black text-white">
                         {incomingBids.length}
                       </div>
                     </div>
                     <div className="rounded-2xl border border-[#00E5A0]/15 bg-[#00E5A0]/5 p-4">
                       <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#00E5A0]">
                         En Düşük
                       </div>
                       <div className="mt-1 text-2xl font-black text-[#00E5A0]">
                         ₺{Math.min(...incomingBids.map((b) => Number(b.amount) || 0)).toLocaleString("tr-TR")}
                       </div>
                     </div>
                     <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                       <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9AA7B5]">
                         Ortalama
                       </div>
                       <div className="mt-1 text-2xl font-black text-white">
                         ₺{Math.round(incomingBids.reduce((s, b) => s + Number(b.amount || 0), 0) / incomingBids.length).toLocaleString("tr-TR")}
                       </div>
                     </div>
                     <div className="rounded-2xl border border-[#FBBF24]/15 bg-[#FBBF24]/5 p-4">
                       <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#FBBF24]">
                         Bekleyen
                       </div>
                       <div className="mt-1 text-2xl font-black text-[#FBBF24]">
                         {incomingBids.filter((b) => b.status === "pending").length}
                       </div>
                     </div>
                   </div>

                   {/* FILTERS + SORT + ACTIONS */}
                   <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                     <div className="flex gap-2">
                       {[
                         { key: "active", label: "Aktif" },
                         { key: "accepted", label: "Kabul" },
                         { key: "rejected", label: "Reddedilen" },
                         { key: "all", label: "Tümü" },
                       ].map((filter) => (
                         <button
                           key={filter.key}
                           type="button"
                           onClick={() => setBidFilter(filter.key)}
                           className={`rounded-xl px-3 py-2 text-[11px] font-black transition ${
                             bidFilter === filter.key
                               ? "bg-white/[0.08] text-white"
                               : "text-[#667085] hover:text-[#9AA7B5]"
                           }`}
                         >
                           {filter.label}
                         </button>
                       ))}
                     </div>

                     <div className="flex gap-2">
                       <select
                         value={bidSort}
                         onChange={(e) => setBidSort(e.target.value)}
                         className="tork-input px-3 py-2 text-xs"
                       >
                         <option value="lowest">En düşük tutar</option>
                         <option value="highest">En yüksek tutar</option>
                         <option value="newest">En yeni</option>
                         <option value="oldest">En eski</option>
                       </select>

                       {selectedBids.length >= 2 && (
                         <button
                           onClick={() => setShowComparison(true)}
                           className="rounded-lg border border-[#00E5A0]/25 bg-[#00E5A0]/10 px-3 py-2 text-xs font-black text-[#00E5A0]"
                         >
                           Karşılaştır ({selectedBids.length})
                         </button>
                       )}
                     </div>
                   </div>

                   {/* BID LIST */}
                   {(() => {
                     const filtered = incomingBids.filter((bid) => {
                       if (bidFilter === "active") return bid.status === "pending";
                       if (bidFilter === "all") return true;
                       return bid.status === bidFilter;
                     });

                     const sorted = [...filtered].sort((a, b) => {
                       if (bidSort === "lowest") return Number(a.amount) - Number(b.amount);
                       if (bidSort === "highest") return Number(b.amount) - Number(a.amount);
                       if (bidSort === "newest") return new Date(b.created_at) - new Date(a.created_at);
                       if (bidSort === "oldest") return new Date(a.created_at) - new Date(b.created_at);
                       return 0;
                     });

                     if (sorted.length === 0) {
                       return (
                         <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-10 text-center">
                           <div className="text-sm font-bold text-[#667085]">
                             Filtrelere uygun teklif bulunamadı.
                           </div>
                         </div>
                       );
                     }

                      return (
                        <div className="space-y-3">
                          {sorted.map((bid) => {
                            const isSelected = selectedBids.includes(bid.id);
                            return (
                              <BidCard
                                key={bid.id}
                                bid={bid}
                                isBestBid={bidFilter === "active" && Number(bid.amount) === Math.min(...incomingBids.filter(b => b.status === "pending").map(b => Number(b.amount) || 0))}
                                isSelected={isSelected}
                                onSelect={(bidId) => {
                                  setSelectedBids((prev) =>
                                    prev.includes(bidId)
                                      ? prev.filter((id) => id !== bidId)
                                      : [...prev, bidId]
                                  );
                                }}
                                onAccept={() =>
                                  handleUpdateBidStatus(bid.id, bid.load_id, "accepted")
                                }
                                onReject={() =>
                                  handleUpdateBidStatus(bid.id, bid.load_id, "rejected")
                                }
                              />
                            );
                          })}
                        </div>
                      );
                      })()}
                    </div>
                  )}
                </div>
              )}

            {/* =================================================
                CARRIER BOARD
            ================================================= */}

          {userDashboard.role === "carrier" &&
            activeTab === "board" && (
            <div className="tork-fade-up">
              <div className="mb-8">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9AA7B5]">
                  Navlun Pazaryeri
                </div>
                <h1 className="text-3xl font-black tracking-[-0.04em] text-[#F5F7FA]">
                  Uygun Yükler
                </h1>
                <p className="mt-2 text-sm text-[#9AA7B5]">
                  Açık taşıma fırsatlarını inceleyin ve teklif verin
                </p>
              </div>

              {loads.length === 0 ? (
                <EmptyState
                  title="Uygun yük bulunmuyor"
                  text="Yük verenler yeni ilanlar oluşturdukça burada görünecek."
                />
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-[#9AA7B5]">
                    {loads.length} uygun yük
                  </p>

                  {loads.map((load) => (
                    <div key={load.id}>
                      <LoadCard
                        load={load}
                        onViewDetails={() => {
                          setActiveDetailLoadId(load.id);
                        }}
                        onBid={() => {
                          setActiveBidLoadId(load.id);
                        }}
                      />

                      {activeBidLoadId === load.id && (
                        <div className="mt-3 ml-6 space-y-3 border-l-2 border-[#00E5A0]/20 pl-6">
                          <div>
                            <label className="mb-2 block text-xs font-bold text-[#9AA7B5]">
                              TEKLİF TUTARI (TL)
                            </label>
                            <input
                              type="number"
                              value={bidAmount}
                              onChange={(e) => setBidAmount(e.target.value)}
                              className="tork-input w-full px-4 py-3 text-sm"
                              placeholder="Navlun teklifinizi girin..."
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSendBid(load.id)}
                              className="flex-1 rounded-lg border border-[#00E5A0]/25 bg-[#00E5A0]/10 px-4 py-3 text-xs font-black text-[#00E5A0] shadow-[0_0_12px_rgba(0,229,160,0.2)] transition-all hover:border-[#00E5A0]/40 hover:bg-[#00E5A0]/15"
                            >
                              {loading ? "Gönderiliyor..." : "Teklif Gönder"}
                            </button>

                            <button
                              onClick={() => {
                                setActiveBidLoadId(null);
                                setBidAmount("");
                              }}
                              className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-bold text-[#9AA7B5] transition-all hover:border-white/15 hover:bg-white/[0.05]"
                            >
                              İptal
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

           {/* =================================================
               ACTIVE TRANSPORTS
           ================================================= */}

           {userDashboard.role === "carrier" &&
             activeTab === "transports" && (
             <div className="tork-fade-up">
               <div className="mb-8">
                 <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9AA7B5]">
                   Operasyon Merkezi
                 </div>
                 <h1 className="text-3xl font-black tracking-[-0.04em] text-[#F5F7FA]">
                   Aktif Taşımalar
                 </h1>
                 <p className="mt-2 text-sm text-[#9AA7B5]">
                   Kabul edilen yükler ve rota detayları
                 </p>
               </div>

               {activeTransports.length === 0 ? (
                 <EmptyState
                   title="Aktif taşıma yok"
                   text="Kabul edilen teklifleriniz burada görünecek."
                 />
               ) : (
                 <div className="space-y-6">
                    {activeTransports.map((transport) => {
                      const originParts =
                        typeof transport.origin ===
                        "string"
                          ? transport.origin.split(
                              " / "
                            )
                          : [];
                      const originName =
                        originParts[0] || "";
                      const originDistrict =
                        originParts[1] || null;
                      const destinationParts =
                        typeof transport.destination ===
                        "string"
                          ? transport.destination.split(
                              " / "
                            )
                          : [];
                      const destinationName =
                        destinationParts[0] || "";
                      const destinationDistrict =
                        destinationParts[1] || null;

                      const originDetail =
                        originName
                          ? buildLocationObject({
                              provinceCode: getProvinceByName(
                                originName
                              )?.code,
                              provinceName: originName,
                              districtName: originDistrict,
                            })
                          : null;
                      const destinationDetail =
                        destinationName
                          ? buildLocationObject({
                              provinceCode: getProvinceByName(
                                destinationName
                              )?.code,
                              provinceName: destinationName,
                              districtName: destinationDistrict,
                            })
                          : null;

                     return (
                       <div
                         key={transport.id}
                         className="tork-panel rounded-3xl overflow-hidden"
                       >
                         <div className="p-6 sm:p-8">
                           <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                             <div>
                               <div className="tork-eyebrow mb-1">
                                   Taşıma
                                 </div>
                               <h3 className="text-xl font-black text-[#F5F7FA]">
                                 {transport.origin} → {transport.destination}
                               </h3>
                               <p className="mt-1 text-xs text-[#9AA7B5]">
                                 {transport.tonnage} ton · {transport.vehicle_type}
                               </p>
                             </div>
                             <div className="flex items-center gap-2">
                               <span className="rounded-full border border-[#00E5A0]/20 bg-[#00E5A0]/8 px-3 py-1.5 text-[10px] font-black text-[#00E5A0]">
                                 ATANDI
                               </span>
                               <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[10px] font-bold text-[#9AA7B5]">
                                 ₺{Number(transport.acceptedAmount || 0).toLocaleString("tr-TR")}
                               </span>
                             </div>
                           </div>
                         </div>

                           {originDetail && destinationDetail && (
                             <RouteVisualization
                               origin={originDetail}
                               destination={destinationDetail}
                               originLabel={originName + (originDistrict ? " / " + originDistrict : "")}
                               destinationLabel={destinationName + (destinationDistrict ? " / " + destinationDistrict : "")}
                             />
                           )}

                          <div className="border-t border-white/6 p-6 sm:p-8">
                            <div className="tork-eyebrow mb-4">Operasyon Takibi</div>
                            <ShipmentTimeline
                              currentStage={getLifecycleStage(transport.status)}
                            />
                          </div>
                        </div>
                     );
                   })}
                 </div>
               )}
             </div>
           )}

           {/* =================================================
               WALLET
           ================================================= */}

          {activeTab ===
            "wallet" && (
            <div className="tork-fade-up max-w-6xl">

              <SectionHeading
                eyebrow="Finans Yönetimi"
                title="Cüzdan"
                description="Bakiye, işlemler ve finansal aktivitelerin özeti."
              />

              {/* HERO BALANCE */}
              <div className="mb-8 grid gap-5 lg:grid-cols-[2fr_1fr]">

                {/* Main Balance Card */}
                <div className="tork-panel rounded-3xl bg-gradient-to-br from-[#00E5A0]/10 via-transparent to-[#06B6D4]/5 p-8 sm:p-10">

                  <div className="tork-eyebrow mb-2">
                    Mevcut Bakiye
                  </div>

                  <div className="mt-4 text-6xl font-black tracking-[-0.08em] text-[#00E5A0] drop-shadow-[0_0_24px_rgba(0,229,160,0.4)]">
                    ₺
                    {walletBalance.toLocaleString(
                      "tr-TR",
                      {
                        minimumFractionDigits:
                          2,
                      },
                    )}
                  </div>

                  <p className="mt-3 text-sm text-[#9AA7B5]">
                    Tork cüzdan hesabınızda
                    bulunan toplam tutar
                  </p>

                  <div className="mt-8 flex gap-3">
                    <button className="flex-1 rounded-xl border border-[#00E5A0]/25 bg-[#00E5A0]/10 px-4 py-3 text-xs font-black text-[#00E5A0] transition-all hover:border-[#00E5A0]/40 hover:bg-[#00E5A0]/15">
                      Para ekle
                    </button>

                    <button className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-bold text-[#9AA7B5] transition-all hover:border-white/15 hover:bg-white/[0.05]">
                      Para çek
                    </button>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="space-y-4">

                  <div className="rounded-2xl border border-[#06B6D4]/20 bg-[#06B6D4]/5 p-5">
                    <div className="text-xs text-[#667085]">
                      Beklemede
                    </div>
                    <div className="mt-2 text-2xl font-black text-[#06B6D4]">
                      ₺0
                    </div>
                    <div className="mt-1 text-xs text-[#9AA7B5]">
                      Ödeme bekleniyor
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#FBBF24]/20 bg-[#FBBF24]/5 p-5">
                    <div className="text-xs text-[#667085]">
                      Kazançlar
                    </div>
                    <div className="mt-2 text-2xl font-black text-[#FBBF24]">
                      ₺0
                    </div>
                    <div className="mt-1 text-xs text-[#9AA7B5]">
                      Toplam hakedişler
                    </div>
                  </div>

                </div>
              </div>

              {/* TRANSACTION AREA */}
              <div className="tork-panel rounded-3xl p-8">

                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-[#F5F7FA]">
                      Son işlemler
                    </h3>
                    <p className="mt-1 text-xs text-[#9AA7B5]">
                      Cüzdan aktivitesi burada
                      görüntülenir
                    </p>
                  </div>
                  <button className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-bold text-[#9AA7B5] transition-all hover:border-white/15 hover:bg-white/[0.05]">
                    Detayları gör
                  </button>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.01] p-6 text-center">
                  <div className="text-sm text-[#667085]">
                    Henüz işlem yok
                  </div>
                  <p className="mt-2 text-xs text-[#9AA7B5]">
                    Yük taşıtıklarında işlem
                    geçmişi burada
                    görüntülenecektir.
                  </p>
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
                            ? "border-l-2 border-[#00E5A0] bg-[#00E5A0]/8 text-[#00E5A0]"
                            : "text-[#9AA7B5] hover:bg-white/[0.03] hover:text-[#F5F7FA]"
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
                                OTP&apos;yi doğrula
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
                        Tork&apos;un sizinle hangi kanallardan iletişim kuracağını yönetin.
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
                eyebrow="Platform Yapılandırması"
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
                        className={`w-full rounded-xl px-3 py-3 text-left text-xs font-bold transition ${
                          settingsSection ===
                          item.id
                            ? "border-l-2 border-[#00E5A0] bg-[#00E5A0]/8 text-[#00E5A0]"
                            : "text-[#9AA7B5] hover:bg-white/[0.03] hover:text-[#F5F7FA]"
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
                        Operasyon Motoru
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
                          Eşleştirme / Güven
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
                        Altyapı
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
                        Erişim Kontrolü
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
                        Güvenlik Politikası
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

      {/* DELETE CONFIRMATION MODAL */}
       {deleteConfirmLoad && (
         <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 backdrop-blur-sm">
           <div className="tork-panel w-full max-w-md rounded-3xl p-6 sm:p-8">
             <div className="mb-6">
               <div className="tork-eyebrow mb-2">İlanı Sil</div>
               <h3 className="text-xl font-black text-white">
                 Bu ilanı silmek istediğinize emin misiniz?
               </h3>
               <p className="mt-2 text-sm text-[#9AA7B5]">
                 Bu işlem geri alınamaz. İlan kalıcı olarak silinecektir.
               </p>
             </div>
 
             <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
               <div className="text-xs text-[#9AA7B5]">
                 {deleteConfirmLoad.origin} → {deleteConfirmLoad.destination}
               </div>
               <div className="mt-1 text-sm font-black text-white">
                 {deleteConfirmLoad.tonnage} ton · {deleteConfirmLoad.vehicle_type}
               </div>
             </div>
 
             <div className="mt-6 flex gap-3">
               <button
                 type="button"
                 onClick={() => setDeleteConfirmLoad(null)}
                 disabled={loadActionLoading}
                 className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-black text-[#9AA7B5] transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
               >
                 İptal
               </button>
               <button
                 type="button"
                 onClick={confirmDeleteLoad}
                 disabled={loadActionLoading}
                 className="flex-1 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs font-black text-red-400 transition hover:border-red-500/40 hover:bg-red-500/15 disabled:opacity-50"
               >
                 {loadActionLoading ? "Siliniyor..." : "Evet, Sil"}
               </button>
                  </div>
                  </div>
                  </div>
          )}
       </main>
     );
   }
// 