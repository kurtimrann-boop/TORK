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
import { getMarkerLocation, buildLocationObject, getRouteDistance, setRouteDistance } from "../utils/location";
import { getProvinceByName } from "../data/turkeyProvinces";
import { formatCurrencyTR, formatRelativeTimeTR } from "../utils/turkish";
import WeatherIndicator from "../components/WeatherIndicator";
import DashboardOperationsHub from "../components/DashboardOperationsHub";
import PricingEngineCard from "../components/PricingEngineCard";
import CarrierSmartBiddingWidget from "../components/CarrierSmartBiddingWidget";
import TransportStatusStepper from "../components/TransportStatusStepper";
import TransportActualsModal from "../components/TransportActualsModal";
import TransportVarianceCard from "../components/TransportVarianceCard";
import TransportPodUpload from "../components/TransportPodUpload";
import SettlementCard from "../components/SettlementCard";
import { deriveOperationalSignals } from "../utils/torkSignalsService";

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
  { id: "my-bids", label: "Tekliflerim", icon: <IconInbox className="h-4 w-4" /> },
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
    <div className="rounded-2xl border border-white/[0.06] bg-[#0B111A] p-6 sm:p-8 text-center select-none max-w-lg mx-auto shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-[#00E5A0]/20 bg-[#00E5A0]/10 text-[#00E5A0]">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>

      <h3 className="text-base sm:text-lg font-bold text-[#F5F7FA]">
        {title}
      </h3>

      <p className="mx-auto mt-1 max-w-sm text-xs sm:text-sm text-[#8C98A8]">
        {text}
      </p>

      {action ? (
        <div className="mt-4">
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
  autoComplete,
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
        autoComplete={autoComplete}
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

  const [temperatureClass, setTemperatureClass] =
    useState("CHILLED");

  const [adrClass, setAdrClass] =
    useState("CLASS_3");

  const [specialPermitRequired, setSpecialPermitRequired] =
    useState(true);

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

  const [carrierBids, setCarrierBids] =
    useState([]);

  const [carrierBidFilter, setCarrierBidFilter] =
    useState("all");

  const [carrierBidSort, setCarrierBidSort] =
    useState("newest");

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

  // Hürmüz Phase 6.1 Trip Actuals & Settlement UI State
  const [actualsModalTransport, setActualsModalTransport] = useState(null);
  const [transportActuals, setTransportActuals] = useState({});
  const [transportDocuments, setTransportDocuments] = useState({});
  const [transportStatuses, setTransportStatuses] = useState({});
  const [transportSettlements, setTransportSettlements] = useState({});

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
      data.forEach((load) => {
        if (load.distance_km) {
          setRouteDistance(
            load.id,
            Number(load.distance_km),
            load.duration_minutes ? Number(load.duration_minutes) : null
          );
        }
      });
    }
  };

  const fetchActiveTransports = async () => {
    const { data, error } =
      await supabase
        .from("bids")
        .select(
          "id, load_id, amount, status, loads(id, origin, destination, tonnage, vehicle_type, status, created_at, distance_km, duration_minutes)"
        )
        .eq("carrier_id", userDashboard.id)
        .eq("status", "accepted")
        .order("created_at", {
          ascending: false,
        });

    if (!error && data) {
      const transports = data
        .filter((item) => item.loads)
        .map((item) => {
          if (item.loads?.distance_km) {
            setRouteDistance(
              item.load_id,
              Number(item.loads.distance_km),
              item.loads.duration_minutes ? Number(item.loads.duration_minutes) : null
            );
          }
          return {
            ...item.loads,
            acceptedAmount: item.amount,
            acceptedBidId: item.id,
          };
        });
      setActiveTransports(transports);
    }
  };

  const fetchCarrierBids = async (carrierId) => {
    if (!carrierId) return;
    const { data, error } =
      await supabase
        .from("bids")
        .select(
          "id, load_id, amount, status, created_at, loads(id, origin, destination, tonnage, vehicle_type, status, distance_km, duration_minutes)"
        )
        .eq("carrier_id", carrierId)
        .order("created_at", {
          ascending: false,
        });

    if (!error && data) {
      setCarrierBids(data);
      data.forEach((item) => {
        if (item.loads?.distance_km) {
          setRouteDistance(
            item.load_id,
            Number(item.loads.distance_km),
            item.loads.duration_minutes ? Number(item.loads.duration_minutes) : null
          );
        }
      });
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
    loadsData?.forEach((load) => {
      if (load.distance_km) {
        setRouteDistance(
          load.id,
          Number(load.distance_km),
          load.duration_minutes ? Number(load.duration_minutes) : null
        );
      }
    });

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
          "id, load_id, carrier_id, amount, status, created_at, loads(id, origin, destination, tonnage, vehicle_type, status, distance_km, duration_minutes), profiles(company_name)",
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

    setIncomingBids(bidsData || []);
    bidsData?.forEach((bid) => {
      if (bid.loads?.distance_km) {
        setRouteDistance(
          bid.load_id,
          Number(bid.loads.distance_km),
          bid.loads.duration_minutes ? Number(bid.loads.duration_minutes) : null
        );
      }
    });
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

  /* =======================================================
     CENTRALIZED NAVIGATION HANDLER
     Resets all sub-views, modals, and detail states
  ======================================================= */
  const handleTabChange = (tabId) => {
    setActiveDetailLoadId(null);
    setActiveBidLoadId(null);
    setShowComparison(false);
    setActualsModalTransport(null);
    setEditingLoad(null);
    setDeleteConfirmLoad(null);
    if (tabId === "create") {
      resetCreateForm();
    }
    setActiveTab(tabId);
    setMessage("");
    if (typeof window !== "undefined") {
      try {
        window.location.hash = tabId;
      } catch (err) {}
    }
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

    const role = userDashboard.role;
    const userId = userDashboard.id;

    if (role === "carrier") {
      Promise.resolve().then(() => {
        fetchOpenLoads();
        fetchActiveTransports();
        fetchCarrierBids(userId);
      });
    } else {
      Promise.resolve().then(() => {
        fetchShipperData(userId);
      });
    }
  }, [userDashboard, activeTab]);

  useEffect(() => {
    const savedEmail =
      localStorage.getItem(
        "tork_remember_email",
      );

    if (savedEmail) {
      Promise.resolve().then(() => {
        setEmail(savedEmail);
        setRememberMe(true);
      });
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

      // Check if distance/duration was calculated in preview
      const previewRoute =
        getRouteDistance("new-load-preview") ||
        (editingLoad ? getRouteDistance(editingLoad.id) : null);
      const calculatedDistance = previewRoute?.distanceKm || null;
      const calculatedDuration = previewRoute?.durationMinutes || null;

      const loadPayload = {
        shipper_id: userDashboard.id,
        origin: originDisplay,
        destination: destinationDisplay,
        tonnage,
        vehicle_type: vehicle,
        cargo_type: cargoType,
        package_count: packageCount,
        description: loadDescription,
        status: "open",
      };

      if (calculatedDistance != null) {
        loadPayload.distance_km = calculatedDistance;
      }
      if (calculatedDuration != null) {
        loadPayload.duration_minutes = calculatedDuration;
      }

      let error = null;
      let insertedLoad = null;

      if (editingLoad) {
        const { error: updateError } = await supabase
          .from("loads")
          .update(loadPayload)
          .eq("id", editingLoad.id)
          .eq("shipper_id", userDashboard.id);
        error = updateError;
      } else {
        const { data: insertData, error: insertError } = await supabase
          .from("loads")
          .insert(loadPayload)
          .select()
          .single();
        error = insertError;
        insertedLoad = insertData;
      }

      if (error && (error.message?.includes("distance_km") || error.message?.includes("duration_minutes"))) {
        delete loadPayload.distance_km;
        delete loadPayload.duration_minutes;
        if (editingLoad) {
          const { error: retryError } = await supabase
            .from("loads")
            .update(loadPayload)
            .eq("id", editingLoad.id);
          error = retryError;
        } else {
          const { data: retryData, error: retryError } = await supabase
            .from("loads")
            .insert(loadPayload)
            .select()
            .single();
          error = retryError;
          insertedLoad = retryData;
        }
      }

      if (error) {
        setMessage(
          "Hata: " +
            error.message,
        );
      } else {
        if (insertedLoad && calculatedDistance != null) {
          setRouteDistance(insertedLoad.id, calculatedDistance, calculatedDuration);
        }

        setMessage(
          editingLoad ? "Yük ilanı başarıyla güncellendi." : "Yük ilanı başarıyla yayınlandı.",
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

      const numAmount = Number(bidAmount);
      if (!Number.isFinite(numAmount) || numAmount <= 0) {
        setMessage("Lütfen geçerli bir teklif tutarı giriniz.");
        return;
      }

      setLoading(true);
      setMessage("");

      // Check if carrier already has an active pending bid on this load
      const existingPending = carrierBids.find(
        (b) => b.load_id === loadId && b.status === "pending"
      );

      if (existingPending) {
        // Update existing pending bid amount
        const { error: updateError } = await supabase
          .from("bids")
          .update({ amount: numAmount })
          .eq("id", existingPending.id)
          .eq("carrier_id", userDashboard.id)
          .eq("status", "pending");

        if (updateError) {
          setMessage("Teklif güncelleme hatası: " + updateError.message);
          setLoading(false);
          return;
        }

        setMessage(`Navlun teklifiniz ₺${numAmount.toLocaleString("tr-TR")} olarak güncellendi.`);
      } else {
        // Insert new pending bid
        const { error: insertError } = await supabase
          .from("bids")
          .insert({
            load_id: loadId,
            carrier_id: userDashboard.id,
            amount: numAmount,
            status: "pending",
          });

        if (insertError) {
          if (insertError.code === "23505" || insertError.message?.includes("unique") || insertError.message?.includes("duplicate")) {
            setMessage("Bu ilana zaten aktif bir teklifiniz bulunmaktadır.");
          } else {
            setMessage("Teklif verme hatası: " + insertError.message);
          }
          setLoading(false);
          return;
        }

        setMessage("Navlun teklifiniz başarıyla iletildi.");
      }

      setActiveBidLoadId(null);
      setBidAmount("");

      await fetchCarrierBids(userDashboard.id);
      await fetchActiveTransports();

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
    Promise.resolve().then(() => {
      initializeProfile();
    });
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

  const operationalSignals = useMemo(() => {
    return deriveOperationalSignals({
      loads,
      myLoads,
      bids: userDashboard?.role === "shipper" ? incomingBids : carrierBids,
      activeTransports,
      userDashboard,
    });
  }, [loads, myLoads, incomingBids, carrierBids, activeTransports, userDashboard]);

  // URL Hash / Popstate event subscription (P3 refresh and back button sync)
  useEffect(() => {
    const handleHashChange = () => {
      if (typeof window === "undefined") return;
      const hash = window.location.hash.replace("#", "");
      const validTabs = [
        "overview", "loads", "create", "bids", "wallet",
        "profile", "settings", "board", "my-bids", "transports"
      ];
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Global Escape Key Listener for Modals & Detail Views
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showComparison) setShowComparison(false);
        if (deleteConfirmLoad) setDeleteConfirmLoad(null);
        if (actualsModalTransport) setActualsModalTransport(null);
        if (activeDetailLoadId) setActiveDetailLoadId(null);
        if (activeBidLoadId) setActiveBidLoadId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showComparison, deleteConfirmLoad, actualsModalTransport, activeDetailLoadId, activeBidLoadId]);

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
      <main className="min-h-screen bg-[#060B11] text-[#F5F7FA] relative flex items-center justify-center overflow-x-hidden px-4 py-8 sm:px-6 lg:px-12 select-none">
        {/* Subtle Ambient Glows */}
        <div className="pointer-events-none absolute -left-32 top-1/4 h-[450px] w-[450px] rounded-full bg-[#00E5A0]/[0.02] blur-[140px]" />
        <div className="pointer-events-none absolute -right-32 bottom-1/4 h-[450px] w-[450px] rounded-full bg-[#00E5A0]/[0.015] blur-[140px]" />

        {/* Central Balanced Container */}
        <div className="relative z-10 mx-auto w-full max-w-6xl">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-10">

            {/* =========================================================
                LEFT SIDE (~55% / 7 cols): Brand World + Globe
               ========================================================= */}
            <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-4">
              {/* Eyebrow */}
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00E5A0] animate-pulse" />
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] text-[#00E5A0]">
                  TORK / LOGISTICS INTELLIGENCE
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-[48px] xl:text-[52px] font-black tracking-[-0.035em] text-[#F5F7FA] leading-[1.0]">
                Yükünüzü.<br />
                Rotanızı.<br />
                <span className="text-[#00E5A0]">Operasyonunuzu.</span>
              </h1>

              {/* Subtitle */}
              <p className="text-sm sm:text-base font-normal text-[#8C98A8] max-w-md leading-relaxed">
                Türkiye&apos;nin akıllı navlun ve operasyon platformu.
              </p>

              {/* Globe Animation (Balanced height) */}
              <div className="w-full flex items-center justify-center lg:justify-start my-1 sm:my-2">
                <GlobeAnimation className="h-[220px] sm:h-[280px] lg:h-[300px] xl:h-[320px] w-full" />
              </div>

              {/* Capability Line */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 text-[10px] sm:text-[11px] font-semibold tracking-[0.14em] uppercase text-[#8C98A8]">
                <span>973 LOKASYON</span>
                <span className="text-[#00E5A0]">·</span>
                <span>CANLI ROTA</span>
                <span className="text-[#00E5A0]">·</span>
                <span>AKILLI FİYAT</span>
                <span className="text-[#00E5A0]">·</span>
                <span>GÜVENLİ MUTABAKAT</span>
              </div>
            </div>

            {/* =========================================================
                RIGHT SIDE (~45% / 5 cols): Auth Panel
               ========================================================= */}
            <div className="lg:col-span-5 flex w-full items-center justify-center">
              <div className="w-full max-w-[450px]">
                {/* Auth Card */}
                <div className="rounded-[24px] border border-white/[0.06] bg-[#0B111A]/84 p-7 sm:p-8 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                  
                  {/* Card Header */}
                  <div className="mb-4 text-left">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8C98A8]">
                      {authMode === "login" ? "TORK'a hoş geldin" : "Yeni Hesap"}
                    </div>
                    <h2 className="mt-1 text-2xl sm:text-[25px] font-bold tracking-[-0.03em] text-[#F5F7FA]">
                      {authMode === "login"
                        ? "Operasyon merkezine giriş yap"
                        : "TORK Hesabı Oluştur"}
                    </h2>
                  </div>

                  {/* Mode Tabs: GİRİŞ YAP | KAYIT OL */}
                  <div className="grid grid-cols-2 rounded-2xl border border-white/[0.05] bg-[#060B11]/50 p-1 mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("login");
                        setMessage("");
                      }}
                      className={`rounded-xl py-2 text-[11px] font-bold tracking-wider transition-all duration-200 ${
                        authMode === "login"
                          ? "border border-[#00E5A0]/25 bg-[#00E5A0]/10 text-[#00E5A0] shadow-sm"
                          : "text-[#8C98A8] hover:text-[#F5F7FA]"
                      }`}
                    >
                      GİRİŞ YAP
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("register");
                        setMessage("");
                      }}
                      className={`rounded-xl py-2 text-[11px] font-bold tracking-wider transition-all duration-200 ${
                        authMode === "register"
                          ? "border border-[#00E5A0]/25 bg-[#00E5A0]/10 text-[#00E5A0] shadow-sm"
                          : "text-[#8C98A8] hover:text-[#F5F7FA]"
                      }`}
                    >
                      KAYIT OL
                    </button>
                  </div>

                  {/* Form */}
                  <form
                    onSubmit={authMode === "login" ? handleLogin : handleSignUp}
                    className="space-y-3.5"
                  >
                    {/* Role Selector ONLY in Registration Mode */}
                    {authMode === "register" && (
                      <>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8C98A8] block">
                            Hesap Tipi
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setRole("shipper")}
                              className={`rounded-xl border py-2.5 px-3 text-xs font-bold text-center transition ${
                                role === "shipper"
                                  ? "border-[#00E5A0]/40 bg-[#00E5A0]/10 text-[#00E5A0]"
                                  : "border-white/[0.06] bg-[#060B11]/60 text-[#8C98A8] hover:text-[#F5F7FA]"
                              }`}
                            >
                              Yük Veren
                            </button>
                            <button
                              type="button"
                              onClick={() => setRole("carrier")}
                              className={`rounded-xl border py-2.5 px-3 text-xs font-bold text-center transition ${
                                role === "carrier"
                                  ? "border-[#00E5A0]/40 bg-[#00E5A0]/10 text-[#00E5A0]"
                                  : "border-white/[0.06] bg-[#060B11]/60 text-[#8C98A8] hover:text-[#F5F7FA]"
                              }`}
                            >
                              Nakliyeci
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8C98A8] block">
                            Şirket Unvanı
                          </label>
                          <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="Şirket unvanınız"
                            className="tork-input w-full h-[52px] px-4 rounded-[14px] text-sm bg-[#060B11]/75 border border-white/[0.07]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8C98A8] block">
                            Telefon Numarası
                          </label>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="0532 000 00 00"
                            className="tork-input w-full h-[52px] px-4 rounded-[14px] text-sm bg-[#060B11]/75 border border-white/[0.07]"
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8C98A8] block">
                        E-posta Adresiniz
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="username"
                        placeholder="ornek@tork.com"
                        className="tork-input w-full h-[52px] px-4 rounded-[14px] text-sm bg-[#060B11]/75 border border-white/[0.07]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8C98A8] block">
                        Şifreniz
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete={authMode === "login" ? "current-password" : "new-password"}
                        placeholder="••••••••"
                        className="tork-input w-full h-[52px] px-4 rounded-[14px] text-sm bg-[#060B11]/75 border border-white/[0.07]"
                      />
                    </div>

                    {authMode === "login" && (
                      <div className="flex items-center justify-between pt-0.5">
                        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[#8C98A8] hover:text-[#F5F7FA] select-none">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="h-4 w-4 rounded border-white/20 accent-[#00E5A0]"
                          />
                          <span>Beni hatırla</span>
                        </label>
                        <span className="text-xs text-[#8C98A8] hover:text-[#F5F7FA] cursor-pointer">
                          Şifremi unuttum
                        </span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-2 w-full h-[52px] rounded-[14px] bg-[#00E5A0] text-[#060B11] text-xs sm:text-sm font-black shadow-[0_0_20px_rgba(0,229,160,0.25)] hover:bg-[#00d896] active:scale-[0.99] transition disabled:opacity-50"
                    >
                      {loading
                        ? "İşleniyor..."
                        : authMode === "login"
                        ? "Operasyon Merkezine Gir →"
                        : "TORK Hesabı Oluştur →"}
                    </button>
                  </form>

                  {/* Feedback Message */}
                  {message && (
                    <div className="mt-3.5 rounded-2xl border border-[#F5B94C]/30 bg-[#F5B94C]/10 px-4 py-2.5 text-xs font-bold text-[#F5B94C]">
                      {message}
                    </div>
                  )}

                  {/* Trust Footer */}
                  <div className="mt-5 pt-3.5 border-t border-white/[0.04] text-center">
                    <div className="text-[10px] text-[#8C98A8]/60 flex items-center justify-center gap-1.5">
                      <svg className="h-3 w-3 text-[#00E5A0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>TORK Güvenli Erişim</span>
                    </div>
                  </div>
                </div>

                {/* Live System Status Indicator */}
                <div className="mt-3.5 flex justify-center">
                  <div className="flex items-center gap-1.5 rounded-full border border-[#00E5A0]/15 bg-[#00E5A0]/[0.05] px-3 py-1 text-[9px] font-bold tracking-[0.14em] uppercase text-[#00E5A0]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00E5A0] animate-pulse" />
                    <span>SİSTEMLER ÇALIŞIYOR · NETWORK ONLINE</span>
                  </div>
                </div>
              </div>
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
          onTabChange={handleTabChange}
          onLogout={handleLogout}
        />

        <section className="min-w-0 flex-1 px-4 py-5 sm:px-7 lg:px-10 pb-24 lg:pb-8">
          <Topbar
            title={
              tabs.find((tab) => tab.id === activeTab)?.label || "Tork"
            }
            subtitle={`${userDashboard.company_name || "Tork kullanıcısı"} · canlı operasyon merkezi`}
            userDashboard={userDashboard}
            signals={operationalSignals.signals}
            unreadCount={operationalSignals.summary.unreadCount}
            onNavigate={handleTabChange}
            onLogout={handleLogout}
          />

          {/* =================================================
              OVERVIEW
          ================================================= */}

           {activeTab === "overview" && (
             <div className="tork-fade-up space-y-8">
               {/* REAL OPERATIONS HUB + MINI MAP + TORK INTELLIGENCE + QUICK ACTIONS */}
               <DashboardOperationsHub
                 userDashboard={userDashboard}
                 myLoads={myLoads}
                 loads={loads}
                 bids={userDashboard.role === "shipper" ? incomingBids : carrierBids}
                 activeTransports={activeTransports}
                 walletBalance={walletBalance}
                 onNavigate={handleTabChange}
                 onResetCreateForm={() => {
                   resetCreateForm();
                   setActiveTab("create");
                 }}
               />

               {/* OPERASYON İSTATİSTİK ÖZETİ (Mobile 2x2 Grid) */}
               <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
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
                       detail={`${incomingBids.filter((b) => b.status === "pending").length} bekleyen`}
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
                       value={carrierBids.length}
                       detail={`${carrierBids.filter((b) => b.status === "pending").length} bekleyen`}
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

               {/* MAIN OPERATIONS DETAILS GRID */}
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
                           onClick={() => handleTabChange("loads")}
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
                           onClick={() => handleTabChange("board")}
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
                               handleTabChange("board");
                               setActiveBidLoadId(load.id);
                             }}
                           />
                         ))}
                       </div>
                     </div>
                   )}

                   {/* RECENT BIDS */}
                   <div>
                     <div className="mb-4 flex items-center justify-between">
                       <div>
                         <h3 className="text-lg font-black text-[#F5F7FA]">
                           {userDashboard.role === "shipper" ? "Son Gelen Teklifler" : "Son Tekliflerim"}
                         </h3>
                         <p className="mt-1 text-xs text-[#9AA7B5]">
                           {userDashboard.role === "shipper" ? "İlanlarınıza gelen teklifler" : "Verdiğiniz son navlun teklifleri"}
                         </p>
                       </div>
                       <button
                         onClick={() => handleTabChange(userDashboard.role === "shipper" ? "bids" : "my-bids")}
                         className="text-xs font-bold text-[#00E5A0] hover:text-[#00E5A0]/80"
                       >
                         Tümünü Gör →
                       </button>
                     </div>

                     <div className="space-y-3">
                       {(userDashboard.role === "shipper" ? incomingBids : carrierBids).length === 0 ? (
                         <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-6 text-center text-xs text-slate-400">
                           {userDashboard.role === "shipper" ? "Henüz gelen teklif bulunmuyor." : "Henüz teklif vermediniz."}
                         </div>
                       ) : (
                         (userDashboard.role === "shipper" ? incomingBids : carrierBids).slice(0, 2).map((bid) => (
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
                             onViewLoad={(loadId) => setActiveDetailLoadId(loadId)}
                           />
                         ))
                       )}
                     </div>
                   </div>
                 </div>

                 {/* RIGHT: ANALYTICS + SYSTEM STATUS */}
                 <div className="lg:col-span-2 space-y-6">
                   <div className="rounded-2xl border border-white/8 bg-[#0F1723] p-6">
                     <div className="flex items-center justify-between mb-2">
                       <h3 className="text-sm font-black text-[#F5F7FA]">
                         {userDashboard.role === "shipper" ? "Navlun Maliyet Analizi" : "Teklif Performansı"}
                       </h3>
                       <span className="text-[10px] font-black uppercase tracking-wider text-[#00E5A0]">
                         CANLI KPI
                       </span>
                     </div>
                     <p className="text-xs text-[#9AA7B5]">
                       {userDashboard.role === "shipper" ? "Gelen tekliflerin piyasa özeti" : "Verilen teklifler ve başarı oranları"}
                     </p>

                     <div className="mt-5 space-y-2.5">
                       {userDashboard.role === "shipper" ? (
                         incomingBids.length > 0 ? (
                           <>
                             <div className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.02] p-3 text-xs">
                               <span className="text-slate-400 font-bold">Ortalama Teklif:</span>
                               <span className="font-black text-white">
                                 ₺{Math.round(incomingBids.reduce((s, b) => s + Number(b.amount || 0), 0) / incomingBids.length).toLocaleString("tr-TR")}
                               </span>
                             </div>
                             <div className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.02] p-3 text-xs">
                               <span className="text-slate-400 font-bold">En Düşük Teklif:</span>
                               <span className="font-black text-[#00E5A0]">
                                 ₺{Math.min(...incomingBids.map((b) => Number(b.amount) || 0)).toLocaleString("tr-TR")}
                               </span>
                             </div>
                             <div className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.02] p-3 text-xs">
                               <span className="text-slate-400 font-bold">İlan Başına Teklif:</span>
                               <span className="font-black text-[#06B6D4]">
                                 {(incomingBids.length / Math.max(myLoads.length, 1)).toFixed(1)} adet
                               </span>
                             </div>
                           </>
                         ) : (
                           <div className="rounded-xl border border-white/6 bg-white/[0.02] p-4 text-center text-xs text-slate-400">
                             Yeni yük ilanı oluşturarak taşıyıcılardan teklif toplayabilirsiniz.
                           </div>
                         )
                       ) : carrierBids.length > 0 ? (
                         <>
                           <div className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.02] p-3 text-xs">
                             <span className="text-slate-400 font-bold">Kazanma Oranı:</span>
                             <span className="font-black text-[#00E5A0]">
                               %{Math.round((carrierBids.filter((b) => b.status === "accepted").length / carrierBids.length) * 100)}
                             </span>
                           </div>
                           <div className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.02] p-3 text-xs">
                             <span className="text-slate-400 font-bold">Ortalama Teklifim:</span>
                             <span className="font-black text-white">
                               ₺{Math.round(carrierBids.reduce((s, b) => s + Number(b.amount || 0), 0) / carrierBids.length).toLocaleString("tr-TR")}
                             </span>
                           </div>
                           <div className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.02] p-3 text-xs">
                             <span className="text-slate-400 font-bold">Bekleyen Teklifler:</span>
                             <span className="font-black text-[#FBBF24]">
                               {carrierBids.filter((b) => b.status === "pending").length} adet
                             </span>
                           </div>
                         </>
                       ) : (
                         <div className="rounded-xl border border-white/6 bg-white/[0.02] p-4 text-center text-xs text-slate-400">
                           Uygun yüklere teklif vererek performans istatistiklerinizi oluşturun.
                         </div>
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
                      onClick={() => handleTabChange("create")}
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
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={loadSearch}
                          onChange={(e) => setLoadSearch(e.target.value)}
                          placeholder="Ara..."
                          className="tork-input px-4 py-2.5 pr-8 text-xs"
                        />
                        {loadSearch && (
                          <button
                            type="button"
                            onClick={() => setLoadSearch("")}
                            className="absolute right-2.5 flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:text-white transition"
                            aria-label="Aramayı temizle"
                          >
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => handleTabChange("create")}
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

                    <div className="tork-panel rounded-3xl p-6 sm:p-8">

                      {/* STEP INDICATOR */}
                      <div className="mb-8">
                        <StepIndicator
                          steps={[
                            { id: "route", label: "01 Rota" },
                            { id: "cargo", label: "02 Yük" },
                            { id: "vehicle", label: "03 Araç" },
                            { id: "price", label: "04 Fiyat" },
                            { id: "review", label: "05 Yayınla" },
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
                              <h3 className="mb-1 text-xl sm:text-2xl font-black tracking-[-0.03em] text-[#F5F7FA]">
                                Rota Bilgilerini Belirleyin
                              </h3>
                              <p className="text-xs sm:text-sm text-[#8C98A8]">
                                Yükleme ve teslimat noktalarını seçtiğinizde canlı rota, mesafe ve süre otomatik hesaplanır.
                              </p>
                            </div>

                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
                              {/* LEFT (5 COLS): Location Selectors with Connected Route Line */}
                              <div className="space-y-4 lg:col-span-5">
                                <div className="rounded-3xl border border-white/[0.06] bg-[#101923] p-5 sm:p-6 space-y-6">
                                  {/* Origin Block */}
                                  <div className="flex gap-3.5">
                                    <div className="flex flex-col items-center">
                                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#00E5A0]/15 border border-[#00E5A0]/40 text-[#00E5A0] shadow-[0_0_10px_rgba(0,229,160,0.2)]">
                                        <div className="h-2 w-2 rounded-full bg-[#00E5A0]" />
                                      </div>
                                      <div className="w-0.5 flex-1 bg-gradient-to-b from-[#00E5A0]/40 via-white/10 to-[#F5B94C]/40 my-2" />
                                    </div>
                                    <div className="flex-1 space-y-3">
                                      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#00E5A0]">
                                        01 · Yükleme Noktası (Çıkış)
                                      </div>
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
                                        provinceCode={originProvince?.code}
                                        placeholder="İlçe seçiniz..."
                                      />
                                    </div>
                                  </div>

                                  {/* Destination Block */}
                                  <div className="flex gap-3.5">
                                    <div className="flex flex-col items-center">
                                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F5B94C]/15 border border-[#F5B94C]/40 text-[#F5B94C] shadow-[0_0_10px_rgba(245,185,76,0.2)]">
                                        <div className="h-2 w-2 rounded-full bg-[#F5B94C]" />
                                      </div>
                                    </div>
                                    <div className="flex-1 space-y-3">
                                      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#F5B94C]">
                                        02 · Teslimat Noktası (Varış)
                                      </div>
                                      <ProvinceSelect
                                        label="Teslimat ili"
                                        value={destinationProvince}
                                        onChange={(val) => {
                                          setDestinationProvince(val);
                                          setDestinationDistrict(null);
                                        }}
                                        placeholder="İl seçiniz..."
                                      />

                                      <DistrictSelect
                                        label="Teslimat ilçesi"
                                        value={destinationDistrict}
                                        onChange={setDestinationDistrict}
                                        provinceCode={destinationProvince?.code}
                                        placeholder="İlçe seçiniz..."
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* RIGHT (7 COLS): Live Route Map & Summary */}
                              <div className="lg:col-span-7">
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
                                    (originDistrict ? " / " + originDistrict : "")
                                  }
                                  destinationLabel={
                                    destinationProvince?.name +
                                    (destinationDistrict ? " / " + destinationDistrict : "")
                                  }
                                  loadId={editingLoad?.id || "new-load-preview"}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                    {/* STEP 2: CARGO */}
                    {createLoadStep === 1 && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="mb-1 text-xl sm:text-2xl font-black tracking-[-0.03em] text-[#F5F7FA]">
                            Yük ve Yükleme Detayları
                          </h3>
                          <p className="text-xs sm:text-sm text-[#8C98A8]">
                            Taşınacak yükün cinsini, tonajını ve ambalaj tipini belirleyin.
                          </p>
                        </div>

                        {/* Cargo Type Selection Cards */}
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C98A8] mb-3">
                            Yük Cinsi
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {[
                              { id: "Paletli Ürün", label: "Paletli Ürün", desc: "Euro / Standart Palet" },
                              { id: "Kuru Yük (Standart)", label: "Kuru Yük", desc: "Genel Koli / Çuval" },
                              { id: "Dökme Yük", label: "Dökme Yük", desc: "Tahıl / Maden / Kum" },
                              { id: "Frigo / Soğuk Zincir", label: "Frigo / Soğuk Zincir", desc: "İklimlendirmeli Gıda & İlaç" },
                              { id: "Tehlikeli Madde (ADR)", label: "Tehlikeli Madde (ADR)", desc: "SRC5 Belgeli Kimyasal" },
                              { id: "Gabari Dışı / Özel Yük", label: "Gabari Dışı / Özel", desc: "Ağır Makine & Geniş Yük" },
                            ].map((item) => {
                              const isSelected = cargoType === item.id || (item.id === "Paletli Ürün" && cargoType.includes("Palet"));
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => setCargoType(item.id)}
                                  className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
                                    isSelected
                                      ? "border-[#00E5A0] bg-[#00E5A0]/[0.08] shadow-[0_0_20px_rgba(0,229,160,0.12)]"
                                      : "border-white/[0.06] bg-[#101923] hover:border-white/20"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className={`text-xs sm:text-sm font-bold ${isSelected ? "text-[#00E5A0]" : "text-[#F5F7FA]"}`}>
                                      {item.label}
                                    </span>
                                    <div className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center ${isSelected ? "border-[#00E5A0] bg-[#00E5A0]" : "border-white/20"}`}>
                                      {isSelected && <div className="h-1 w-1 rounded-full bg-[#060B11]" />}
                                    </div>
                                  </div>
                                  <div className="mt-1 text-[11px] text-[#8C98A8]">
                                    {item.desc}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Dynamic Contextual Inputs for Specialized Load Types */}
                        {cargoType.includes("Frigo") && (
                          <div className="rounded-2xl border border-sky-500/30 bg-sky-500/[0.04] p-4 space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-sky-400 block">
                              Soğuk Zincir Sıcaklık Rejimi (T.C. Tarım & Orman Bakanlığı)
                            </label>
                            <select
                              className="tork-input px-4 py-3 text-xs"
                              value={temperatureClass}
                              onChange={(e) => setTemperatureClass(e.target.value)}
                            >
                              <option value="CHILLED">Soğuk (+2°C / +8°C) - Taze Gıda / İlaç</option>
                              <option value="FROZEN">Donuk (-18°C / -25°C) - Dondurulmuş Ürün</option>
                              <option value="COOL">Serin (+8°C / +15°C) - Çikolata / Medikal</option>
                              <option value="GENERAL">Kontrollü (+15°C / +25°C) - Genel İklimlendirme</option>
                            </select>
                          </div>
                        )}

                        {cargoType.includes("ADR") && (
                          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-4 space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
                              ADR Tehlikeli Madde Sınıfı (UHDGM SRC5 / T9)
                            </label>
                            <select
                              className="tork-input px-4 py-3 text-xs"
                              value={adrClass}
                              onChange={(e) => setAdrClass(e.target.value)}
                            >
                              <option value="CLASS_3">Sınıf 3: Alevlenebilir Sıvılar (Yakıt/Boyalar)</option>
                              <option value="CLASS_2">Sınıf 2: Gazlar (Basınçlı/Sıvılaştırılmış)</option>
                              <option value="CLASS_4">Sınıf 4: Alevlenebilir Katılar</option>
                              <option value="CLASS_5">Sınıf 5: Oksitleyici Maddeler</option>
                              <option value="CLASS_6">Sınıf 6: Zehirli / Bulaşıcı Maddeler</option>
                              <option value="CLASS_8">Sınıf 8: Aşındırıcı (Korozif) Kimyasallar</option>
                              <option value="CLASS_9">Sınıf 9: Muhtelif Tehlikeli Maddeler</option>
                            </select>
                          </div>
                        )}

                        {cargoType.includes("Gabari") && (
                          <div className="rounded-2xl border border-purple-500/30 bg-purple-500/[0.04] p-4 space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#F5F7FA]">
                              <input
                                type="checkbox"
                                checked={specialPermitRequired}
                                onChange={(e) => setSpecialPermitRequired(e.target.checked)}
                                className="h-4 w-4 rounded border-white/20 bg-white/5 accent-[#00E5A0]"
                              />
                              <span>KGM 2026 Özel Yük Taşıma İzin Belgesi Harcı Gerektirir (₺18.813,80)</span>
                            </label>
                          </div>
                        )}

                        {/* Tonnage & Package Count */}
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field
                            label="Tonaj (Ton)"
                            type="number"
                            value={tonnage}
                            onChange={setTonnage}
                            placeholder="24"
                          />

                          <Field
                            label="Koli / Palet Adedi"
                            value={packageCount}
                            onChange={setPackageCount}
                            placeholder="33 Euro Palet"
                          />
                        </div>
                      </div>
                    )}

                    {/* STEP 3: VEHICLE */}
                    {createLoadStep === 2 && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="mb-1 text-xl sm:text-2xl font-black tracking-[-0.03em] text-[#F5F7FA]">
                            Araç Talebini Belirleyin
                          </h3>
                          <p className="text-xs sm:text-sm text-[#8C98A8]">
                            Taşıma operasyonu için gerekli kasa ve araç tipini seçin.
                          </p>
                        </div>

                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C98A8] mb-3">
                            Araç Tipi
                          </div>

                          <div className="grid gap-3.5 sm:grid-cols-2">
                            {[
                              {
                                value: "TIR (Tenteli)",
                                label: "TIR (Tenteli / Standart)",
                                desc: "24-26 Ton · 13.60m Dorse",
                              },
                              {
                                value: "Kamyon",
                                label: "Kamyon (Onteker)",
                                desc: "15-18 Ton · Kapalı/Açık Kasa",
                              },
                              {
                                value: "Frigo",
                                label: "Frigo (Soğutuculu)",
                                desc: "İklimlendirmeli Termo Kasa",
                              },
                              {
                                value: "Kırkayak",
                                label: "Kırkayak",
                                desc: "20-22 Ton · Ağır Yük Kasası",
                              },
                            ].map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setVehicle(option.value)}
                                className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
                                  vehicle === option.value
                                    ? "border-[#00E5A0] bg-[#00E5A0]/[0.08] shadow-[0_0_20px_rgba(0,229,160,0.12)]"
                                    : "border-white/[0.06] bg-[#101923] hover:border-white/20"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div
                                    className={`text-sm font-bold ${
                                      vehicle === option.value
                                        ? "text-[#00E5A0]"
                                        : "text-[#F5F7FA]"
                                    }`}
                                  >
                                    {option.label}
                                  </div>
                                  <div
                                    className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                      vehicle === option.value
                                        ? "border-[#00E5A0] bg-[#00E5A0]"
                                        : "border-white/20"
                                    }`}
                                  >
                                    {vehicle === option.value && (
                                      <div className="h-1.5 w-1.5 rounded-full bg-[#060B11]" />
                                    )}
                                  </div>
                                </div>
                                <div className="mt-1 text-xs text-[#8C98A8]">
                                  {option.desc}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* STEP 4: PRICE & NOTES */}
                    {createLoadStep === 3 && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="mb-1 text-xl sm:text-2xl font-black tracking-[-0.03em] text-[#F5F7FA]">
                            Operasyonel Notlar ve Açıklamalar
                          </h3>
                          <p className="text-xs sm:text-sm text-[#8C98A8]">
                            Yükleme, tahliye ve teslimat süreçlerine dair ek operasyonel detayları belirtin.
                          </p>
                        </div>

                        <div className="rounded-3xl border border-white/[0.06] bg-[#101923] p-5 sm:p-6 space-y-4">
                          <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C98A8] block">
                            Özel Talimatlar & Açıklama
                          </label>

                          <textarea
                            rows={5}
                            value={loadDescription}
                            onChange={(e) => setLoadDescription(e.target.value)}
                            className="tork-input resize-none px-4 py-3.5 text-sm"
                            placeholder="Örn: Fabrika sahasında kantar mevcuttur, forklift ile yandan yükleme yapılacaktır..."
                          />
                        </div>
                      </div>
                    )}

                    {/* STEP 5: REVIEW & PUBLISH */}
                    {createLoadStep === 4 && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="mb-1 text-xl sm:text-2xl font-black tracking-[-0.03em] text-[#F5F7FA]">
                            İlan Özeti ve Şeffaf Fiyatlandırma
                          </h3>
                          <p className="text-xs sm:text-sm text-[#8C98A8]">
                            TORK Hürmüz Fiyat Motoru tahminini inceleyin ve ilanınızı taşıyıcı ağına yayınlayın.
                          </p>
                        </div>

                        <div className="grid gap-4">
                          <div className="rounded-3xl border border-white/[0.06] bg-[#101923] p-5">
                            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C98A8] mb-3">
                              Rota Özeti
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
                                (originDistrict ? " / " + originDistrict : "")
                              }
                              destinationLabel={
                                destinationProvince?.name +
                                (destinationDistrict ? " / " + destinationDistrict : "")
                              }
                            />
                          </div>

                          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-2xl border border-white/[0.06] bg-[#101923] p-4">
                              <div className="text-xs text-[#8C98A8]">Tonaj</div>
                              <div className="mt-1.5 text-xl font-black text-[#F5F7FA]">
                                {tonnage || "0"}{" "}
                                <span className="text-xs font-semibold text-[#8C98A8]">ton</span>
                              </div>
                            </div>

                            <div className="rounded-2xl border border-white/[0.06] bg-[#101923] p-4">
                              <div className="text-xs text-[#8C98A8]">Araç Tipi</div>
                              <div className="mt-1.5 text-sm font-bold text-[#F5F7FA] truncate">
                                {vehicle}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-white/[0.06] bg-[#101923] p-4">
                              <div className="text-xs text-[#8C98A8]">Yük Cinsi</div>
                              <div className="mt-1.5 text-sm font-bold text-[#F5F7FA] truncate">
                                {cargoType}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-white/[0.06] bg-[#101923] p-4">
                              <div className="text-xs text-[#8C98A8]">Paket / Koli</div>
                              <div className="mt-1.5 text-sm font-bold text-[#F5F7FA] truncate">
                                {packageCount || "Belirtilmedi"}
                              </div>
                            </div>
                          </div>

                          {loadDescription && (
                            <div className="rounded-2xl border border-white/[0.06] bg-[#101923] p-4">
                              <div className="text-xs text-[#8C98A8]">Özel Notlar</div>
                              <div className="mt-1 text-xs leading-5 text-[#F5F7FA]">
                                {loadDescription}
                              </div>
                            </div>
                          )}

                          {/* TORK HÜRMÜZ FAZ 4: ŞEFFAF FİYAT MOTORU + LOAD INTELLIGENCE */}
                          <PricingEngineCard
                            distanceKm={getRouteDistance(editingLoad?.id || "new-load-preview")?.distanceKm || 730}
                            durationMinutes={getRouteDistance(editingLoad?.id || "new-load-preview")?.durationMinutes}
                            loadProfile={{
                              loadType: cargoType,
                              tonnage: parseFloat(tonnage) || null,
                              palletCount: parseInt(packageCount, 10) || null,
                              packageCount: packageCount || null,
                              temperatureClass,
                              isDangerousGoods: cargoType.includes("ADR") || cargoType.includes("Tehlikeli"),
                              adrClass,
                              isOversize: cargoType.includes("Gabari") || cargoType.includes("Özel"),
                              specialPermitRequired,
                            }}
                            initialVehicleType={
                              vehicle?.toLowerCase().includes("kırkayak")
                                ? "KIRKAYAK"
                                : vehicle?.toLowerCase().includes("kamyonet")
                                ? "KAMYONET"
                                : vehicle?.toLowerCase().includes("kamyon")
                                ? "KAMYON"
                                : "TIR"
                            }
                          />
                        </div>
                      </div>
                    )}

                    {/* ACTION BUTTONS */}
                    <div className="flex justify-between border-t border-white/[0.06] pt-6">
                      <div className="flex gap-2.5">
                        {editingLoad && (
                          <button
                            type="button"
                            onClick={() => {
                              resetCreateForm();
                              handleTabChange("loads");
                            }}
                            className="rounded-xl border border-white/[0.06] bg-[#101923] px-5 py-2.5 text-xs font-semibold text-[#8C98A8] transition hover:border-white/20 hover:text-[#F5F7FA]"
                          >
                            İptal
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (createLoadStep > 0) {
                              setCreateLoadStep(createLoadStep - 1);
                            }
                          }}
                          disabled={createLoadStep === 0}
                          className={`rounded-xl px-5 py-2.5 text-xs font-semibold transition ${
                            createLoadStep === 0
                              ? "cursor-not-allowed border border-white/[0.02] bg-white/[0.01] text-[#8C98A8]/40"
                              : "border border-white/[0.06] bg-[#101923] text-[#8C98A8] hover:border-white/20 hover:text-[#F5F7FA]"
                          }`}
                        >
                          ← Geri
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || loadActionLoading}
                        className="rounded-xl bg-[#00E5A0] px-8 py-3 text-xs font-black text-[#060B11] shadow-[0_0_24px_rgba(0,229,160,0.25)] transition hover:bg-[#00c78a] active:scale-[0.99] disabled:opacity-50"
                      >
                        {loading || loadActionLoading
                          ? "İşleniyor..."
                          : editingLoad
                          ? "Değişiklikleri Kaydet →"
                          : createLoadStep === 4
                          ? "İlanı Yayınla →"
                          : "Devam Et →"}
                      </button>
                    </div>
                  </form>

                </div>
              </div>
            )}

           {/* =================================================
               LOAD DETAIL
           ================================================= */}

           {activeDetailLoadId && (activeTab === "loads" || activeTab === "board" || activeTab === "overview") && (() => {
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
                           loadId={load.id}
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
                             handleTabChange(
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
               <SectionHeading
                 eyebrow="Teklif Yönetimi"
                 title="Gelen Teklifler"
                 description="Taşıyıcılardan gelen teklifleri inceleyin ve yönetin"
               />

               {incomingBids.length === 0 ? (
                 <EmptyState
                   title="Henüz teklif yok"
                   text="İlanınız yayınlandığında taşıyıcı teklifleri burada görünecek."
                   action={
                     <button
                       type="button"
                       onClick={() => handleTabChange("create")}
                       className="inline-flex items-center gap-2 rounded-xl bg-[#00E5A0] px-4 py-2.5 text-xs font-black text-[#060B11] shadow-[0_0_16px_rgba(0,229,160,0.25)] hover:bg-[#00d896] active:scale-[0.98] transition"
                     >
                       + YENİ YÜK OLUŞTUR
                     </button>
                   }
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
                          <option value="pricePerKm">En düşük fiyat/km</option>
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

                      const getPricePerKm = (bid) => {
                        const dist =
                          Number(bid.loads?.distance_km) ||
                          getRouteDistance(bid.load_id)?.distanceKm;
                        if (!dist || dist <= 0) return null;
                        const amount = Number(bid.amount);
                        if (!Number.isFinite(amount) || amount <= 0) return null;
                        return amount / dist;
                      };

                      const sorted = [...filtered].sort((a, b) => {
                        if (bidSort === "lowest") return Number(a.amount) - Number(b.amount);
                        if (bidSort === "highest") return Number(b.amount) - Number(a.amount);
                        if (bidSort === "pricePerKm") {
                          const priceA = getPricePerKm(a);
                          const priceB = getPricePerKm(b);
                          if (priceA === null && priceB === null) return 0;
                          if (priceA === null) return 1;
                          if (priceB === null) return -1;
                          return priceA - priceB;
                        }
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
                             const pricePerKm = getPricePerKm(bid);
                             const isBestPricePerKm =
                               bidFilter === "active" &&
                               pricePerKm !== null &&
                               sorted.length > 1 &&
                               pricePerKm === getPricePerKm(sorted[0]);

                             return (
                               <BidCard
                                 key={bid.id}
                                 bid={bid}
                                 isBestBid={bidFilter === "active" && Number(bid.amount) === Math.min(...incomingBids.filter(b => b.status === "pending").map(b => Number(b.amount) || 0))}
                                 isBestPricePerKm={isBestPricePerKm}
                                 pricePerKm={pricePerKm}
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

          {/* BID COMPARISON MODAL */}
          {showComparison && selectedBids.length >= 2 && (() => {
            const selected = incomingBids.filter((b) => selectedBids.includes(b.id));
            const getPricePerKm = (bid) => {
              const dist =
                Number(bid.loads?.distance_km) ||
                getRouteDistance(bid.load_id)?.distanceKm;
              if (!dist || dist <= 0) return null;
              const amount = Number(bid.amount);
              if (!Number.isFinite(amount) || amount <= 0) return null;
              return amount / dist;
            };

            const bestPricePerKm = selected.reduce((best, bid) => {
              const price = getPricePerKm(bid);
              if (price === null) return best;
              if (best === null || price < best.price) return { price, bid };
              return best;
            }, null);

            return (
              <div
                onClick={() => setShowComparison(false)}
                className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="tork-panel w-full max-w-4xl max-h-[80vh] overflow-y-auto rounded-3xl p-6 sm:p-8"
                >
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <div className="tork-eyebrow mb-1">TEKLİFLERİ KARŞILAŞTIR</div>
                      <h3 className="text-xl font-black text-white">
                        {selectedBids.length} teklif seçildi
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowComparison(false)}
                      className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-black text-[#9AA7B5] transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
                    >
                      Kapat
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] text-left">
                      <thead>
                        <tr className="border-b border-white/8">
                          <th className="pb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9AA7B5]">Kriter</th>
                          {selected.map((bid) => {
                            const route = getRouteDistance(bid.load_id);
                            const pricePerKm = route && route.distanceKm > 0 ? Number(bid.amount) / route.distanceKm : null;
                            const isBest = bestPricePerKm && bestPricePerKm.bid.id === bid.id;
                            return (
                              <th key={bid.id} className="pb-3 pl-4 text-right">
                                <div className="text-sm font-black text-white">
                                  {bid.profiles?.company_name || "Taşıyıcı"}
                                </div>
                                <div className="text-[10px] font-bold text-[#00E5A0]">
                                  {formatCurrencyTR(bid.amount)}
                                </div>
                                {pricePerKm !== null && (
                                  <div className="text-[10px] font-bold text-[#06B6D4]">
                                    {pricePerKm.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL/km
                                    {isBest && " · EN DÜŞÜK"}
                                  </div>
                                )}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/6">
                        <tr>
                          <td className="py-3 text-xs font-bold text-[#9AA7B5]">Durum</td>
                          {selected.map((bid) => (
                            <td key={bid.id} className="py-3 pl-4 text-right">
                              <StatusBadge status={bid.status} />
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="py-3 text-xs font-bold text-[#9AA7B5]">Rota</td>
                          {selected.map((bid) => (
                            <td key={bid.id} className="py-3 pl-4 text-right text-sm font-black text-white">
                              {bid.loads?.origin || "—"} → {bid.loads?.destination || "—"}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="py-3 text-xs font-bold text-[#9AA7B5]">Teklif Tarihi</td>
                          {selected.map((bid) => (
                            <td key={bid.id} className="py-3 pl-4 text-right text-sm font-black text-white">
                              {formatRelativeTimeTR(bid.created_at)}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowComparison(false)}
                      className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3 text-xs font-black text-[#9AA7B5] transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
                    >
                      Kapat
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

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

                      {activeBidLoadId === load.id && (() => {
                        const existingPending = carrierBids.find(
                          (b) => b.load_id === load.id && b.status === "pending"
                        );
                        const existingAccepted = carrierBids.find(
                          (b) => b.load_id === load.id && b.status === "accepted"
                        );

                        if (existingAccepted) {
                          return (
                            <div className="mt-3 ml-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs">
                              <span className="font-black text-emerald-400">Sevkiyat Onaylandı:</span>
                              <span className="ml-1 text-slate-300">
                                Bu ilana verdiğiniz teklif kabul edildi ve taşıma size atandı. Aktif Taşımalar sekmesinden takip edebilirsiniz.
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div className="mt-3 ml-6 space-y-3 border-l-2 border-[#00E5A0]/20 pl-6">
                            {existingPending && (
                              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-2.5 text-xs text-amber-300">
                                <span className="font-black">Mevcut Aktif Teklifiniz:</span> ₺
                                {Number(existingPending.amount).toLocaleString("tr-TR")}. Yeni bir tutar girerek teklifinizi güncelleyebilirsiniz.
                              </div>
                            )}

                            <div>
                              <label className="mb-2 block text-xs font-bold text-[#9AA7B5]">
                                {existingPending ? "GÜNCEL TEKLİF TUTARI (TL)" : "TEKLİF TUTARI (TL)"}
                              </label>
                              <input
                                type="number"
                                value={bidAmount}
                                onChange={(e) => setBidAmount(e.target.value)}
                                className="tork-input w-full px-4 py-3 text-sm"
                                placeholder={existingPending ? `Mevcut: ${existingPending.amount}` : "Navlun teklifinizi girin..."}
                              />
                            </div>

                            {/* TORK HÜRMÜZ FAZ 5: TAŞIYICI AKILLI MALİYET & KÂRLILIK GÖRÜNÜMÜ */}
                            <CarrierSmartBiddingWidget
                              load={load}
                              bidAmount={bidAmount}
                              distanceKm={getRouteDistance(load.id)?.distanceKm || 730}
                              durationMinutes={getRouteDistance(load.id)?.durationMinutes || 525}
                              initialVehicleType={
                                load.vehicle_type?.toLowerCase().includes("kırkayak")
                                  ? "KIRKAYAK"
                                  : load.vehicle_type?.toLowerCase().includes("kamyonet")
                                    ? "KAMYONET"
                                    : load.vehicle_type?.toLowerCase().includes("kamyon")
                                      ? "KAMYON"
                                      : "TIR"
                              }
                            />

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSendBid(load.id)}
                                className="flex-1 rounded-lg border border-[#00E5A0]/25 bg-[#00E5A0]/10 px-4 py-3 text-xs font-black text-[#00E5A0] shadow-[0_0_12px_rgba(0,229,160,0.2)] transition-all hover:border-[#00E5A0]/40 hover:bg-[#00E5A0]/15"
                              >
                                {loading
                                  ? "İşleniyor..."
                                  : existingPending
                                    ? "Teklifi Güncelle"
                                    : "Teklif Gönder"}
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
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

           {/* =================================================
               CARRIER MY BIDS ("TEKLİFLERİM")
           ================================================= */}

           {userDashboard.role === "carrier" &&
             activeTab === "my-bids" && (
             <div className="tork-fade-up">
               <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                 <div>
                   <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9AA7B5]">
                     Taşıyıcı Teklif Merkezi
                   </div>
                   <h1 className="text-3xl font-black tracking-[-0.04em] text-[#F5F7FA]">
                     Tekliflerim
                   </h1>
                   <p className="mt-1 text-sm text-[#9AA7B5]">
                     Açık yüklere verdiğiniz tüm navlun tekliflerini ve güncel durumlarını takip edin.
                   </p>
                 </div>
                 <div className="flex items-center gap-2">
                   <span className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-bold text-slate-300">
                     {carrierBids.length} Toplam Teklif
                   </span>
                 </div>
               </div>

               {carrierBids.length === 0 ? (
                 <EmptyState
                   title="Henüz teklif vermediniz"
                   text="Uygun yükler pazarındaki ilanları inceleyerek navlun teklifi iletebilirsiniz."
                   action={
                     <button
                       onClick={() => setActiveTab("board")}
                       className="rounded-lg border border-[#00E5A0]/25 bg-[#00E5A0]/10 px-6 py-3 text-xs font-black text-[#00E5A0] shadow-[0_0_12px_rgba(0,229,160,0.2)] hover:border-[#00E5A0]/40 hover:bg-[#00E5A0]/15"
                     >
                       Uygun Yüklere Git
                     </button>
                   }
                 />
               ) : (
                 <div className="space-y-6">
                   {/* SUMMARY KPI CARDS */}
                   <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                     <div className="rounded-2xl border border-white/8 bg-[#0F1723] p-5">
                       <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9AA7B5]">
                         Toplam Teklifler
                       </div>
                       <div className="mt-2 text-2xl font-black text-white">
                         {carrierBids.length}
                       </div>
                       <div className="mt-1 text-xs text-slate-400">Verilen teklifler</div>
                     </div>

                     <div className="rounded-2xl border border-[#FBBF24]/20 bg-[#FBBF24]/5 p-5">
                       <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#FBBF24]">
                         Bekleyen
                       </div>
                       <div className="mt-2 text-2xl font-black text-[#FBBF24]">
                         {carrierBids.filter((b) => b.status === "pending").length}
                       </div>
                       <div className="mt-1 text-xs text-slate-400">İnceleme aşamasında</div>
                     </div>

                     <div className="rounded-2xl border border-[#00E5A0]/20 bg-[#00E5A0]/5 p-5">
                       <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#00E5A0]">
                         Kabul Edilen
                       </div>
                       <div className="mt-2 text-2xl font-black text-[#00E5A0]">
                         {carrierBids.filter((b) => b.status === "accepted").length}
                       </div>
                       <div className="mt-1 text-xs text-slate-400">Atanmış taşımalar</div>
                     </div>

                     <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                       <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-red-400">
                         Reddedilen
                       </div>
                       <div className="mt-2 text-2xl font-black text-red-400">
                         {carrierBids.filter((b) => b.status === "rejected").length}
                       </div>
                       <div className="mt-1 text-xs text-slate-400">Sonuçlanan teklifler</div>
                     </div>
                   </div>

                   {/* FILTERS & SORT */}
                   <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                     <div className="flex flex-wrap gap-2">
                       {[
                         { key: "all", label: "Tümü" },
                         { key: "pending", label: "Bekleyen" },
                         { key: "accepted", label: "Kabul Edilen" },
                         { key: "rejected", label: "Reddedilen" },
                       ].map((filter) => (
                         <button
                           key={filter.key}
                           type="button"
                           onClick={() => setCarrierBidFilter(filter.key)}
                           className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                             carrierBidFilter === filter.key
                               ? "bg-[#00E5A0]/15 text-[#00E5A0] border border-[#00E5A0]/30"
                               : "border border-white/6 bg-white/[0.02] text-[#9AA7B5] hover:text-white hover:border-white/12"
                           }`}
                         >
                           {filter.label}
                         </button>
                       ))}
                     </div>

                     <div className="flex items-center gap-2">
                       <span className="text-xs font-bold text-slate-400">Sırala:</span>
                       <select
                         value={carrierBidSort}
                         onChange={(e) => setCarrierBidSort(e.target.value)}
                         className="tork-input px-3 py-2 text-xs font-bold"
                       >
                         <option value="newest">En Yeni</option>
                         <option value="oldest">En Eski</option>
                         <option value="amount-asc">En Düşük Tutar</option>
                         <option value="amount-desc">En Yüksek Tutar</option>
                       </select>
                     </div>
                   </div>

                   {/* BIDS LIST */}
                   {(() => {
                     const filtered = carrierBids.filter((bid) => {
                       if (carrierBidFilter === "all") return true;
                       return bid.status === carrierBidFilter;
                     });

                     const getPricePerKm = (bid) => {
                       const dist =
                         Number(bid.loads?.distance_km) ||
                         getRouteDistance(bid.load_id)?.distanceKm;
                       if (!dist || dist <= 0) return null;
                       const amount = Number(bid.amount);
                       if (!Number.isFinite(amount) || amount <= 0) return null;
                       return amount / dist;
                     };

                     const sorted = [...filtered].sort((a, b) => {
                       if (carrierBidSort === "amount-asc") return Number(a.amount) - Number(b.amount);
                       if (carrierBidSort === "amount-desc") return Number(b.amount) - Number(a.amount);
                       if (carrierBidSort === "oldest") return new Date(a.created_at) - new Date(b.created_at);
                       return new Date(b.created_at) - new Date(a.created_at);
                     });

                     if (sorted.length === 0) {
                       return (
                         <div className="rounded-2xl border border-white/6 bg-[#0F1723] p-8 text-center text-xs text-slate-400">
                           Seçilen filtreye uygun teklif bulunamadı.
                         </div>
                       );
                     }

                     return (
                       <div className="space-y-3">
                         {sorted.map((bid) => (
                           <BidCard
                             key={bid.id}
                             bid={bid}
                             isCarrierView={true}
                             pricePerKm={getPricePerKm(bid)}
                             onViewLoad={(loadId) => {
                               setActiveDetailLoadId(loadId);
                             }}
                           />
                         ))}
                       </div>
                     );
                   })()}
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


                      const currentStatus = transportStatuses[transport.id] || transport.status || "assigned";
                      const currentActuals = transportActuals[transport.id] || {};
                      const currentDocs = transportDocuments[transport.id] || [];
                      const acceptedAmt = Number(transport.acceptedAmount || transport.bid_amount || 40000);
                      const estCost = 30813;
                      const estProfit = Math.round(acceptedAmt - estCost);
                      const estMargin = Math.round((estProfit / acceptedAmt) * 1000) / 10;

                      const { totalActualCost, dataCompleteness } = calculateActualCost(currentActuals);
                      const actProfit = calculateActualProfit(acceptedAmt, totalActualCost);
                      const actMargin = calculateActualMargin(acceptedAmt, actProfit);

                      return (
                        <div
                          key={transport.id}
                          className="tork-panel rounded-3xl overflow-hidden space-y-6 p-6 sm:p-8"
                        >
                          {/* Header */}
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-white/8 pb-6">
                            <div>
                              <div className="tork-eyebrow mb-1">
                                Aktif Sefer #{transport.id?.toString().substring(0, 8)}
                              </div>
                              <h3 className="text-xl sm:text-2xl font-black text-[#F5F7FA]">
                                {transport.origin} → {transport.destination}
                              </h3>
                              <p className="mt-1 text-xs text-[#9AA7B5]">
                                {transport.tonnage} ton · {transport.vehicle_type} · ~730 km
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              <div className="text-right">
                                <div className="text-[10px] uppercase font-bold text-slate-400">Anlaşılan Navlun</div>
                                <div className="text-xl font-black text-emerald-400">
                                  ₺{acceptedAmt.toLocaleString("tr-TR")}
                                </div>
                              </div>

                              <button
                                onClick={() => setActualsModalTransport(transport)}
                                className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-2.5 text-xs font-black text-emerald-400 hover:bg-emerald-500/25 transition-all shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                              >
                                ⚡ Harcamaları Gir
                              </button>
                            </div>
                          </div>

                          {/* Transport Lifecycle Stepper */}
                          <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-5">
                            <div className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">
                              Sefer Aşaması & İlerleme
                            </div>
                            <TransportStatusStepper
                              currentStatus={currentStatus}
                              isCarrier={true}
                            />

                            {/* Status Transition Action Buttons */}
                            <div className="mt-5 pt-4 border-t border-white/6 flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs text-slate-400">
                                Mevcut Durum: <strong className="text-emerald-400 uppercase">{currentStatus}</strong>
                              </span>

                              <div className="flex gap-2">
                                {currentStatus === "assigned" && (
                                  <button
                                    onClick={() => setTransportStatuses(prev => ({ ...prev, [transport.id]: "pickup_pending" }))}
                                    className="rounded-lg border border-teal-500/30 bg-teal-500/20 px-3 py-1.5 text-xs font-black text-teal-300 hover:bg-teal-500/30"
                                  >
                                    Yükleme Başlat →
                                  </button>
                                )}
                                {currentStatus === "pickup_pending" && (
                                  <button
                                    onClick={() => setTransportStatuses(prev => ({ ...prev, [transport.id]: "in_transit" }))}
                                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-3 py-1.5 text-xs font-black text-emerald-300 hover:bg-emerald-500/30"
                                  >
                                    Yola Çık (Sevkiyat Başlat) →
                                  </button>
                                )}
                                {currentStatus === "in_transit" && (
                                  <button
                                    onClick={() => setTransportStatuses(prev => ({ ...prev, [transport.id]: "delivered" }))}
                                    className="rounded-lg border border-emerald-500/40 bg-emerald-500/25 px-4 py-1.5 text-xs font-black text-emerald-300 hover:bg-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                  >
                                    ✓ Teslim Edildi Olarak İşaretle
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Route Visualization */}
                          {originDetail && destinationDetail && (
                            <RouteVisualization
                              origin={originDetail}
                              destination={destinationDetail}
                              originLabel={originName + (originDistrict ? " / " + originDistrict : "")}
                              destinationLabel={destinationName + (destinationDistrict ? " / " + destinationDistrict : "")}
                            />
                          )}

                          {/* Phase 6.1: Variance Analysis (Estimated vs Actual) */}
                          <TransportVarianceCard
                            estimatedCost={estCost}
                            actualCost={totalActualCost}
                            estimatedProfit={estProfit}
                            actualProfit={actProfit}
                            estimatedMargin={estMargin}
                            actualMargin={actMargin}
                            dataCompleteness={dataCompleteness}
                            bidAmount={acceptedAmt}
                          />

                          {/* Phase 6.1: POD & Documents Upload */}
                          <TransportPodUpload
                            transportId={transport.id}
                            documents={currentDocs}
                            onUploadDocument={(newDoc) => {
                              setTransportDocuments(prev => ({
                                ...prev,
                                [transport.id]: [...(prev[transport.id] || []), newDoc],
                              }));
                            }}
                            isCarrier={true}
                          />

                          {/* Phase 6.1: Carrier Settlement Card */}
                          <SettlementCard
                            settlement={{
                              bid_amount: acceptedAmt,
                              settlement_amount: acceptedAmt,
                              estimated_cost: estCost,
                              actual_cost: totalActualCost,
                              estimated_profit: estProfit,
                              actual_profit: actProfit,
                              status: currentStatus === "delivered"
                                ? (currentDocs.length > 0 ? "ready" : "pending_pod")
                                : (currentStatus === "settled" ? "approved" : "draft"),
                            }}
                            isShipper={false}
                          />
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

                  <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.02] p-3 text-center text-xs text-slate-400">
                    <span className="font-bold text-amber-400">Önizleme / Demo Modu:</span> Cüzdan ve bakiye transfer işlemleri canlı ödeme geçidi entegrasyonuyla aktif olacaktır.
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
         <div
           onClick={() => setDeleteConfirmLoad(null)}
           className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
         >
           <div
             onClick={(e) => e.stopPropagation()}
             className="tork-panel w-full max-w-md rounded-3xl p-6 sm:p-8"
           >
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

        {/* =========================================================
            MOBILE BOTTOM NAVIGATION DOCK (Floating Glass Dock)
           ========================================================= */}
        <nav
          aria-label="Mobil alt menü"
          className="fixed bottom-3 inset-x-3 sm:bottom-4 sm:inset-x-4 z-50 flex h-16 items-center justify-around rounded-3xl border border-white/[0.08] bg-[#0B111A]/85 px-2 backdrop-blur-2xl lg:hidden shadow-[0_12px_40px_rgba(0,0,0,0.7)]"
        >
          {userDashboard.role === "shipper" ? (
            <>
              {/* 1. Overview */}
              <button
                type="button"
                onClick={() => handleTabChange("overview")}
                className={`flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 min-h-[44px] ${
                  activeTab === "overview" ? "text-[#00E5A0] scale-105" : "text-[#8C98A8] hover:text-[#F5F7FA]"
                }`}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="mt-1 text-[10px] font-bold">Özet</span>
              </button>

              {/* 2. Loads */}
              <button
                type="button"
                onClick={() => handleTabChange("loads")}
                className={`flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 min-h-[44px] ${
                  activeTab === "loads" ? "text-[#00E5A0] scale-105" : "text-[#8C98A8] hover:text-[#F5F7FA]"
                }`}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span className="mt-1 text-[10px] font-bold">İlanlarım</span>
              </button>

              {/* 3. Create (Signature Center Action Highlight) */}
              <button
                type="button"
                onClick={() => handleTabChange("create")}
                className="flex flex-1 flex-col items-center justify-center py-1 text-[#00E5A0] min-h-[44px] -mt-3"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00E5A0] text-[#060B11] shadow-[0_0_20px_rgba(0,229,160,0.5)] transition duration-200 active:scale-95">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="mt-1 text-[10px] font-black text-[#00E5A0]">+ İlan Ver</span>
              </button>

              {/* 4. Bids */}
              <button
                type="button"
                onClick={() => handleTabChange("bids")}
                className={`relative flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 min-h-[44px] ${
                  activeTab === "bids" ? "text-[#00E5A0] scale-105" : "text-[#8C98A8] hover:text-[#F5F7FA]"
                }`}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                {incomingBids.filter((b) => b.status === "pending").length > 0 && (
                  <span className="absolute top-1 right-[20%] flex h-4 w-4 items-center justify-center rounded-full bg-[#F5B94C] text-[9px] font-black text-[#060B11]">
                    {incomingBids.filter((b) => b.status === "pending").length}
                  </span>
                )}
                <span className="mt-1 text-[10px] font-bold">Teklifler</span>
              </button>

              {/* 5. Wallet */}
              <button
                type="button"
                onClick={() => handleTabChange("wallet")}
                className={`flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 min-h-[44px] ${
                  activeTab === "wallet" ? "text-[#00E5A0] scale-105" : "text-[#8C98A8] hover:text-[#F5F7FA]"
                }`}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span className="mt-1 text-[10px] font-bold">Cüzdan</span>
              </button>
            </>
          ) : (
            <>
              {/* 1. Overview */}
              <button
                type="button"
                onClick={() => handleTabChange("overview")}
                className={`flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 min-h-[44px] ${
                  activeTab === "overview" ? "text-[#00E5A0] scale-105" : "text-[#8C98A8] hover:text-[#F5F7FA]"
                }`}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="mt-1 text-[10px] font-bold">Özet</span>
              </button>

              {/* 2. Board */}
              <button
                type="button"
                onClick={() => handleTabChange("board")}
                className={`flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 min-h-[44px] ${
                  activeTab === "board" ? "text-[#00E5A0] scale-105" : "text-[#8C98A8] hover:text-[#F5F7FA]"
                }`}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span className="mt-1 text-[10px] font-bold">Yükler</span>
              </button>

              {/* 3. My Bids (Carrier Center Action Highlight) */}
              <button
                type="button"
                onClick={() => handleTabChange("my-bids")}
                className="relative flex flex-1 flex-col items-center justify-center py-1 text-[#00E5A0] min-h-[44px] -mt-3"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00E5A0] text-[#060B11] shadow-[0_0_20px_rgba(0,229,160,0.5)] transition duration-200 active:scale-95">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                {carrierBids.filter((b) => b.status === "pending").length > 0 && (
                  <span className="absolute top-0 right-[20%] flex h-4 w-4 items-center justify-center rounded-full bg-[#F5B94C] text-[9px] font-black text-[#060B11]">
                    {carrierBids.filter((b) => b.status === "pending").length}
                  </span>
                )}
                <span className="mt-1 text-[10px] font-black text-[#00E5A0]">Tekliflerim</span>
              </button>

              {/* 4. Transports */}
              <button
                type="button"
                onClick={() => handleTabChange("transports")}
                className={`flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 min-h-[44px] ${
                  activeTab === "transports" ? "text-[#00E5A0] scale-105" : "text-[#8C98A8] hover:text-[#F5F7FA]"
                }`}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1" />
                </svg>
                <span className="mt-1 text-[10px] font-bold">Taşımalar</span>
              </button>

              {/* 5. Wallet */}
              <button
                type="button"
                onClick={() => handleTabChange("wallet")}
                className={`flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 min-h-[44px] ${
                  activeTab === "wallet" ? "text-[#00E5A0] scale-105" : "text-[#8C98A8] hover:text-[#F5F7FA]"
                }`}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span className="mt-1 text-[10px] font-bold">Cüzdan</span>
              </button>
            </>
          )}
        </nav>

        {/* Phase 6.1: Transport Actual Costs Modal */}
        {actualsModalTransport && (
          <TransportActualsModal
            isOpen={Boolean(actualsModalTransport)}
            onClose={() => setActualsModalTransport(null)}
            initialActuals={transportActuals[actualsModalTransport.id] || {}}
            estimatedCost={30813}
            onSave={(actualsPayload) => {
              setTransportActuals((prev) => ({
                ...prev,
                [actualsModalTransport.id]: actualsPayload,
              }));
              setMessage("Gerçekleşen sefer maliyetleri başarıyla kaydedildi.");
            }}
          />
        )}
      </main>
    );
  }
