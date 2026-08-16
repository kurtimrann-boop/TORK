"use client";

import { useState, useEffect } from "react";
import { supabase } from "../supabase";

export default function TorkApp() {
  const [authMode, setAuthMode] = useState("login");
  const [loginRole, setLoginRole] = useState("shipper");
  
  // Temel Kimlik Bilgileri
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("shipper");

  // Kurumsal / Şirket Bilgileri
  const [companyName, setCompanyName] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [taxOffice, setTaxOffice] = useState("");
  const [mersisNo, setMersisNo] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [iban, setIban] = useState("");

  // Taşıyıcı & Araç Detayları
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleType, setVehicleType] = useState("TIR (Tenteli)");
  const [adrStatus, setAdrStatus] = useState(false);
  const [frigoStatus, setFrigoStatus] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [userDashboard, setUserDashboard] = useState(null);

  // Panel İçi Sekmeler
  const [activeTab, setActiveTab] = useState("loads");

  // Ayarlar Güncelleme Form State'leri
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editTaxOffice, setEditTaxOffice] = useState("");
  const [editTaxNumber, setEditTaxNumber] = useState("");
  const [editMersisNo, setEditMersisNo] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editIban, setEditIban] = useState("");
  const [editPlate, setEditPlate] = useState("");
  const [editVehicleType, setEditVehicleType] = useState("");

  // Yük İlanı Form State'leri
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [loadTonnage, setLoadTonnage] = useState("");
  const [loadVehicle, setLoadVehicle] = useState("TIR (Tenteli)");
  const [cargoType, setCargoType] = useState("Paletli Ürün");
  
  const [loads, setLoads] = useState([]);
  const [myLoads, setMyLoads] = useState([]);
  const [incomingBids, setIncomingBids] = useState([]);
  const [walletData, setWalletData] = useState({ balance: 25500, pending: 4500, total_earned: 128000 });

  // Teklif Verme State'leri
  const [activeBidLoadId, setActiveBidLoadId] = useState(null);
  const [bidAmount, setBidAmount] = useState("");

  const fetchOpenLoads = async () => {
    const { data } = await supabase.from("loads").select("*").eq("status", "open");
    if (data) setLoads(data);
  };

  const fetchShipperData = async (userId) => {
    const { data: loadsData } = await supabase.from("loads").select("*").eq("shipper_id", userId);
    if (loadsData) setMyLoads(loadsData);

    const loadIds = loadsData?.map(l => l.id) || [];
    if (loadIds.length > 0) {
      const { data: bidsData } = await supabase
        .from("bids")
        .select("*, loads(origin, destination, cargo_type, tonnage), profiles(company_name, phone)")
        .in("load_id", loadIds);
      if (bidsData) setIncomingBids(bidsData);
    }
  };

  useEffect(() => {
    if (userDashboard) {
      setEditCompanyName(userDashboard.company_name || "");
      setEditTaxOffice(userDashboard.tax_office || "");
      setEditTaxNumber(userDashboard.tax_number || "");
      setEditMersisNo(userDashboard.mersis_no || "");
      setEditPhone(userDashboard.phone || "");
      setEditIban(userDashboard.iban || "");
      setEditPlate(userDashboard.vehicle_plate || "");
      setEditVehicleType(userDashboard.vehicle_type || "TIR (Tenteli)");

      if (userDashboard.role === "carrier") {
        fetchOpenLoads();
      } else {
        fetchShipperData(userDashboard.id);
      }
    }
  }, [userDashboard, activeTab]);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setMessage("Kayıt Hatası: " + error.message); setLoading(false); return; }

    const userId = data.user?.id;
    if (!userId) { setMessage("Kullanıcı kimliği alınamadı."); setLoading(false); return; }

    const { error: profileError } = await supabase.from("profiles").insert({ 
      id: userId, 
      role, 
      first_name: firstName,
      last_name: lastName,
      company_name: companyName, 
      phone,
      tax_number: taxNumber,
      tax_office: taxOffice,
      mersis_no: mersisNo,
      city,
      district,
      address,
      iban,
      vehicle_plate: role === 'carrier' ? vehiclePlate : null,
      vehicle_type: role === 'carrier' ? vehicleType : null,
      adr: adrStatus,
      frigo: frigoStatus
    });

    if (profileError) {
      setMessage("Profil Kayıt Hatası: " + profileError.message);
    } else {
      setMessage("Kayıt ve firma onboarding başvurunuz başarılı! Şimdi giriş yapabilirsiniz.");
      setAuthMode("login");
    }
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setMessage("Giriş Hatası: " + error.message); setLoading(false); return; }

    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("*").eq("id", data.user.id).single();

    if (profileError || !profile) { setMessage("Profil bulunamadı!"); setLoading(false); return; }

    if (profile.role !== loginRole) {
      setMessage(`Bu hesap bir ${profile.role === 'shipper' ? 'Yük Veren' : 'Nakliyeci'} hesabıdır.`);
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (rememberMe) {
      localStorage.setItem("tork_remember_email", email);
    } else {
      localStorage.removeItem("tork_remember_email");
    }

    setUserDashboard(profile);
    setActiveTab(profile.role === "shipper" ? "loads" : "board");
    setLoading(false);
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const updateData = {
      company_name: editCompanyName,
      tax_office: editTaxOffice,
      tax_number: editTaxNumber,
      mersis_no: editMersisNo,
      phone: editPhone,
      iban: editIban,
    };

    if (userDashboard.role === 'carrier') {
      updateData.vehicle_plate = editPlate;
      updateData.vehicle_type = editVehicleType;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userDashboard.id);

    if (error) {
      setMessage("Güncelleme Hatası: " + error.message);
    } else {
      setUserDashboard({ ...userDashboard, ...updateData });
      setMessage("Profil ve kurumsal ayarlarınız başarıyla güncellendi!");
    }
    setLoading(false);
  };

  useEffect(() => {
    const savedEmail = localStorage.getItem("tork_remember_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleCreateLoad = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("loads").insert({
      shipper_id: userDashboard.id, 
      origin, 
      destination, 
      tonnage: loadTonnage, 
      vehicle_type: loadVehicle, 
      status: "open"
    });
    
    if (error) setMessage("Hata: " + error.message);
    else { 
      setMessage("Detaylı yük ilanı başarıyla yayınlandı!"); 
      setOrigin(""); setDestination(""); setLoadTonnage("");
      fetchShipperData(userDashboard.id);
    }
    setLoading(false);
  };

  const handleSendBid = async (loadId) => {
    if (!bidAmount) return;
    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("bids").insert({
      load_id: loadId,
      carrier_id: userDashboard.id,
      amount: bidAmount,
      status: 'pending'
    });

    if (error) {
      setMessage("Teklif Verme Hatası: " + error.message);
    } else {
      setMessage("Navlun teklifiniz başarıyla iletildi!");
      setActiveBidLoadId(null);
      setBidAmount("");
    }
    setLoading(false);
  };

  const handleUpdateBidStatus = async (bidId, loadId, newStatus) => {
    setLoading(true);
    await supabase.from("bids").update({ status: newStatus }).eq("id", bidId);
    if (newStatus === 'accepted') {
      await supabase.from("loads").update({ status: 'assigned' }).eq("id", loadId);
    }
    fetchShipperData(userDashboard.id);
    setLoading(false);
  };

  // DASHBOARD RENDER
  if (userDashboard) {
    return (
      <main className="min-h-screen bg-[#070b14] text-slate-100 relative overflow-hidden font-sans">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none"></div>

        <div className="relative max-w-6xl mx-auto p-6 lg:p-12">
          <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10 pb-6 border-b border-slate-800/80">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#0b1329] border border-slate-800 flex items-center justify-center p-2 shadow-xl shadow-emerald-500/10">
                <span className="text-[#10b981] font-black text-2xl tracking-tighter">T</span>
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-white">{userDashboard.company_name}</h1>
                <p className="text-xs text-[#10b981] font-semibold uppercase tracking-widest">
                  {userDashboard.role === "shipper" ? "Yük Veren Paneli" : "Nakliyeci Portalı"}
                </p>
              </div>
            </div>

            <div className="flex bg-[#0b1329] p-1.5 rounded-2xl border border-slate-800/80 flex-wrap justify-center gap-1">
              {userDashboard.role === "shipper" ? (
                <>
                  <button onClick={() => setActiveTab("loads")} className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'loads' ? 'bg-[#10b981] text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}>İlanlarım</button>
                  <button onClick={() => setActiveTab("create")} className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'create' ? 'bg-[#10b981] text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}>+ Yeni İlan Aç</button>
                  <button onClick={() => setActiveTab("bids")} className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'bids' ? 'bg-[#10b981] text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}>Gelen Teklifler</button>
                </>
              ) : (
                <button onClick={() => setActiveTab("board")} className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'board' ? 'bg-[#10b981] text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}>Uygun Yükler & Rotalar</button>
              )}
              <button onClick={() => setActiveTab("wallet")} className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'wallet' ? 'bg-[#10b981] text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}>Cüzdan</button>
              <button onClick={() => setActiveTab("profile")} className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'profile' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>Profilim</button>
              <button onClick={() => setActiveTab("settings")} className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'settings' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>Ayarlar</button>
            </div>

            <button onClick={() => setUserDashboard(null)} className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white px-5 py-2.5 rounded-xl text-xs font-bold border border-red-500/20 transition-all">Çıkış Yap</button>
          </header>

          {/* CÜZDAN SEKMESİ */}
          {activeTab === "wallet" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#0b1329] p-8 rounded-3xl border border-slate-800 shadow-xl border-l-4 border-l-[#10b981]">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Kullanılabilir Bakiye</p>
                  <p className="text-4xl font-black text-white mt-2">{walletData.balance.toLocaleString()} TL</p>
                </div>
                <div className="bg-[#0b1329] p-8 rounded-3xl border border-slate-800 shadow-xl">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Escrow'daki (Bekleyen)</p>
                  <p className="text-4xl font-black text-blue-400 mt-2">{walletData.pending.toLocaleString()} TL</p>
                </div>
                <div className="bg-[#0b1329] p-8 rounded-3xl border border-slate-800 shadow-xl">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Toplam Hacim (GMV)</p>
                  <p className="text-4xl font-black text-white mt-2">{walletData.total_earned.toLocaleString()} TL</p>
                </div>
              </div>

              <div className="bg-[#0b1329] p-8 rounded-3xl border border-slate-800 shadow-xl flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white">Finansal İşlemler</h3>
                  <p className="text-xs text-slate-400">Ödemelerinizi yönetin ve cüzdanınızı güncel tutun.</p>
                </div>
                <div>
                  {userDashboard.role === 'shipper' ? (
                    <button className="bg-[#10b981] text-slate-950 font-black px-8 py-4 rounded-xl hover:bg-emerald-500 transition-all">+ Bakiye Yükle</button>
                  ) : (
                    <button className="bg-[#10b981] text-slate-950 font-black px-8 py-4 rounded-xl hover:bg-emerald-500 transition-all">Para Çek (IBAN)</button>
                  )}
                </div>
              </div>

              <div className="bg-[#0b1329] p-8 rounded-3xl border border-slate-800 shadow-xl">
                <h3 className="text-lg font-black text-white mb-6">İşlem Geçmişi (Ledger)</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#070b14] rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-[#10b981]">↓</div>
                      <div>
                        <p className="text-sm font-bold text-white">TRK-2026-000123 Sevkiyat Ödemesi</p>
                        <p className="text-[10px] text-slate-500">16 Ağustos 2026, 06:45</p>
                      </div>
                    </div>
                    <p className="text-sm font-black text-[#10b981]">+ 28.500 TL</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PROFİL EKRANI */}
          {activeTab === "profile" && (
            <div className="bg-[#0b1329]/90 backdrop-blur-xl p-8 rounded-3xl border border-slate-800/80 max-w-3xl mx-auto shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-black text-white">Kurumsal Profil & Hesap Bilgileri</h2>
                  <p className="text-xs text-slate-400 mt-1">Şirket vergi, finansal ve operasyonel kayıt bilgileri</p>
                </div>
                <span className="px-3 py-1 bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] text-xs font-bold rounded-lg uppercase">
                  {userDashboard.role === 'shipper' ? 'Yük Veren' : 'Nakliyeci'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 bg-[#070b14] p-5 rounded-2xl border border-slate-800">
                  <p className="text-xs font-bold text-[#10b981] uppercase tracking-wider">Şirket Bilgileri</p>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase">Firma / Şirket Adı</label>
                    <p className="text-base font-extrabold text-white mt-0.5">{userDashboard.company_name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase">Vergi Dairesi</label>
                      <p className="text-sm text-slate-200 mt-0.5">{userDashboard.tax_office || "Girilmemiş"}</p>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase">Vergi Numarası</label>
                      <p className="text-sm text-slate-200 mt-0.5">{userDashboard.tax_number || "Girilmemiş"}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase">MERSİS Numarası</label>
                    <p className="text-sm text-slate-200 mt-0.5">{userDashboard.mersis_no || "Girilmemiş"}</p>
                  </div>
                </div>

                <div className="space-y-4 bg-[#070b14] p-5 rounded-2xl border border-slate-800">
                  <p className="text-xs font-bold text-[#10b981] uppercase tracking-wider">İletişim & Finans</p>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase">Yetkili Adı Soyadı</label>
                    <p className="text-sm font-bold text-white mt-0.5">{userDashboard.first_name || ""} {userDashboard.last_name || ""}</p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase">Telefon Numarası</label>
                    <p className="text-sm text-slate-200 mt-0.5">{userDashboard.phone || "Belirtilmemiş"}</p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase">Kayıtlı IBAN (Ödemeler İçin)</label>
                    <p className="text-sm font-mono text-emerald-400 mt-0.5">{userDashboard.iban || "Tanımlanmamış"}</p>
                  </div>
                </div>
              </div>

              {userDashboard.role === 'carrier' && (
                <div className="bg-[#070b14] p-5 rounded-2xl border border-slate-800 space-y-3">
                  <p className="text-xs font-bold text-[#10b981] uppercase tracking-wider">Taşıyıcı / Filo Donanım Detayları</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="block text-[11px] text-slate-400 uppercase">Araç Plakası</span>
                      <strong className="text-white">{userDashboard.vehicle_plate || "Belirtilmemiş"}</strong>
                    </div>
                    <div>
                      <span className="block text-[11px] text-slate-400 uppercase">Araç Tipi</span>
                      <strong className="text-white">{userDashboard.vehicle_type || "Belirtilmemiş"}</strong>
                    </div>
                    <div>
                      <span className="block text-[11px] text-slate-400 uppercase">Özel Donanımlar</span>
                      <span className="text-xs text-blue-400 font-semibold">
                        {userDashboard.adr ? "ADR Uygun " : ""} {userDashboard.frigo ? "Frigo" : ""} {!userDashboard.adr && !userDashboard.frigo ? "Standart" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AYARLAR BÖLÜMÜ */}
          {activeTab === "settings" && (
            <form onSubmit={handleUpdateSettings} className="bg-[#0b1329]/90 backdrop-blur-xl p-8 rounded-3xl border border-slate-800/80 max-w-2xl mx-auto shadow-2xl space-y-5">
              <div>
                <h2 className="text-2xl font-black text-white">⚙️ Kurumsal Ayarlar & Bilgi Güncelleme</h2>
                <p className="text-xs text-slate-400 mt-1">Şirket bilgilerinizi, vergi detaylarınızı ve araç bilgilerinizi buradan güncelleyebilirsiniz.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Firma / Şirket Adı</label>
                  <input type="text" className="w-full bg-[#070b14] p-3.5 rounded-xl border border-slate-800 text-sm text-white focus:border-[#10b981] focus:outline-none" value={editCompanyName} onChange={(e) => setEditCompanyName(e.target.value)} required />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Vergi Dairesi</label>
                    <input type="text" className="w-full bg-[#070b14] p-3.5 rounded-xl border border-slate-800 text-sm text-white focus:border-[#10b981] focus:outline-none" value={editTaxOffice} onChange={(e) => setEditTaxOffice(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Vergi Numarası</label>
                    <input type="text" className="w-full bg-[#070b14] p-3.5 rounded-xl border border-slate-800 text-sm text-white focus:border-[#10b981] focus:outline-none" value={editTaxNumber} onChange={(e) => setEditTaxNumber(e.target.value)} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">MERSİS Numarası</label>
                    <input type="text" className="w-full bg-[#070b14] p-3.5 rounded-xl border border-slate-800 text-sm text-white focus:border-[#10b981] focus:outline-none" value={editMersisNo} onChange={(e) => setEditMersisNo(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Telefon Numarası</label>
                    <input type="text" className="w-full bg-[#070b14] p-3.5 rounded-xl border border-slate-800 text-sm text-white focus:border-[#10b981] focus:outline-none" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} required />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Şirket IBAN Numarası</label>
                  <input type="text" className="w-full bg-[#070b14] p-3.5 rounded-xl border border-slate-800 text-sm text-white font-mono focus:border-[#10b981] focus:outline-none" value={editIban} onChange={(e) => setEditIban(e.target.value)} required />
                </div>

                {userDashboard.role === 'carrier' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Araç Plakası</label>
                      <input type="text" className="w-full bg-[#070b14] p-3.5 rounded-xl border border-slate-800 text-sm text-white focus:border-[#10b981] focus:outline-none" value={editPlate} onChange={(e) => setEditPlate(e.target.value)} required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Araç Tipi</label>
                      <div className="relative">
                        <select className="w-full bg-[#070b14] p-3.5 pr-10 rounded-xl border border-slate-800 text-sm text-white focus:border-[#10b981] focus:outline-none appearance-none cursor-pointer" value={editVehicleType} onChange={(e) => setEditVehicleType(e.target.value)}>
                          <option value="TIR (Tenteli)" className="bg-[#0b1329] text-white">TIR (Tenteli)</option>
                          <option value="Kamyon (10 Teker)" className="bg-[#0b1329] text-white">Kamyon (10 Teker)</option>
                          <option value="Frigo (Soğutuculu)" className="bg-[#0b1329] text-white">Frigo (Soğutuculu)</option>
                          <option value="Kırkayak" className="bg-[#0b1329] text-white">Kırkayak</option>
                        </select>
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#10b981]">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" disabled={loading} className="w-full bg-[#10b981] hover:bg-emerald-500 text-slate-950 font-extrabold py-4 rounded-xl shadow-lg transition-all text-sm">
                {loading ? "Güncelleniyor..." : "💾 Değişiklikleri Kaydet"}
              </button>
              {message && <p className="text-[#10b981] text-xs text-center font-medium">{message}</p>}
            </form>
          )}

          {/* YENİ YÜK OLUŞTURMA */}
          {userDashboard.role === "shipper" && activeTab === "create" && (
            <form onSubmit={handleCreateLoad} className="bg-[#0b1329]/90 backdrop-blur-xl p-8 rounded-3xl border border-slate-800/80 max-w-2xl mx-auto shadow-2xl space-y-5">
              <h2 className="text-2xl font-black text-white">📦 Yeni Yük İlanı Oluştur</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Yükleme Yeri (Nereden)</label>
                  <input type="text" placeholder="Örn: Trabzon Arsin OSB" className="w-full bg-[#070b14] p-3.5 rounded-xl border border-slate-800 text-sm text-white focus:border-[#10b981] focus:outline-none" value={origin} onChange={(e) => setOrigin(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Teslimat Yeri (Nereye)</label>
                  <input type="text" placeholder="Örn: Ankara Sincan OSB" className="w-full bg-[#070b14] p-3.5 rounded-xl border border-slate-800 text-sm text-white focus:border-[#10b981] focus:outline-none" value={destination} onChange={(e) => setDestination(e.target.value)} required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Tonaj (Ton)</label>
                  <input type="number" placeholder="Örn: 24" className="w-full bg-[#070b14] p-3.5 rounded-xl border border-slate-800 text-sm text-white focus:border-[#10b981] focus:outline-none" value={loadTonnage} onChange={(e) => setLoadTonnage(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Yük Cinsi</label>
                  <div className="relative">
                    <select className="w-full bg-[#070b14] p-3.5 pr-10 rounded-xl border border-slate-800 text-sm text-white focus:border-[#10b981] focus:outline-none appearance-none cursor-pointer" value={cargoType} onChange={(e) => setCargoType(e.target.value)}>
                      <option value="Paletli Ürün" className="bg-[#0b1329] text-white">Paletli Ürün</option>
                      <option value="Dökme Yük" className="bg-[#0b1329] text-white">Dökme Yük</option>
                      <option value="Konteyner" className="bg-[#0b1329] text-white">Konteyner</option>
                      <option value="Çuval / Paket" className="bg-[#0b1329] text-white">Çuval / Paket</option>
                      <option value="Makine / Ekipman" className="bg-[#0b1329] text-white">Makine / Ekipman</option>
                    </select>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#10b981]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Araç Tipi</label>
                  <div className="relative">
                    <select className="w-full bg-[#070b14] p-3.5 pr-10 rounded-xl border border-slate-800 text-sm text-white focus:border-[#10b981] focus:outline-none appearance-none cursor-pointer" value={loadVehicle} onChange={(e) => setLoadVehicle(e.target.value)}>
                      <option value="TIR (Tenteli)" className="bg-[#0b1329] text-white">TIR (Tenteli)</option>
                      <option value="Kamyon (10 Teker)" className="bg-[#0b1329] text-white">Kamyon (10 Teker)</option>
                      <option value="Frigo (Soğutuculu)" className="bg-[#0b1329] text-white">Frigo (Soğutuculu)</option>
                      <option value="Kırkayak" className="bg-[#0b1329] text-white">Kırkayak</option>
                    </select>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#10b981]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full bg-[#10b981] hover:bg-emerald-500 text-slate-950 font-extrabold py-4 rounded-xl shadow-lg transition-all text-sm">🚀 İlanı Yayınla</button>
              {message && <p className="text-[#10b981] text-xs text-center font-medium">{message}</p>}
            </form>
          )}

          {/* SHIPPER İLANLARIM */}
          {userDashboard.role === "shipper" && activeTab === "loads" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">📦 Aktif İlanlarım</h2>
              {myLoads.length === 0 ? (
                <p className="text-slate-400 text-sm">Henüz yayınlanmış bir ilanınız yok.</p>
              ) : (
                myLoads.map((load) => (
                  <div key={load.id} className="bg-[#0b1329]/90 p-6 rounded-2xl border border-slate-800 flex justify-between items-center shadow-xl">
                    <div>
                      <p className="font-bold text-lg text-white">{load.origin} → {load.destination}</p>
                      <p className="text-xs text-slate-400 mt-1">{load.tonnage} Ton | Araç: {load.vehicle_type} | Durum: <span className="text-[#10b981] uppercase font-semibold">{load.status}</span></p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* GELEN TEKLİFLER */}
          {userDashboard.role === "shipper" && activeTab === "bids" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">💰 İlanlarınıza Gelen Navlun Teklifleri</h2>
              {incomingBids.length === 0 ? (
                <p className="text-slate-400 text-sm">Henüz gelen teklif bulunmuyor.</p>
              ) : (
                incomingBids.map((bid) => (
                  <div key={bid.id} className="bg-[#0b1329]/90 p-6 rounded-2xl border border-slate-800 flex justify-between items-center shadow-xl">
                    <div>
                      <p className="font-bold text-[#10b981] text-lg">{bid.amount} TL</p>
                      <p className="text-sm text-white mt-1">Rota: {bid.loads?.origin} → {bid.loads?.destination}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Nakliyeci: {bid.profiles?.company_name} ({bid.profiles?.phone})</p>
                    </div>
                    {bid.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdateBidStatus(bid.id, bid.load_id, 'accepted')} className="bg-[#10b981] hover:bg-emerald-500 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 transition-all">Kabul Et</button>
                        <button onClick={() => handleUpdateBidStatus(bid.id, bid.load_id, 'rejected')} className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border border-red-500/20">Reddet</button>
                      </div>
                    ) : (
                      <span className={`text-xs font-bold uppercase px-3 py-1.5 rounded-lg ${bid.status === 'accepted' ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                        {bid.status === 'accepted' ? 'Kabul Edildi' : 'Reddedildi'}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* CARRIER UYGUN YÜKLER */}
          {userDashboard.role === "carrier" && activeTab === "board" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold mb-4">🚚 Uygun Yükler & Akıllı Rota Analizi</h2>
              {loads.length === 0 ? (
                <p className="text-slate-400 text-sm">Şu an sistemde açık yük bulunmuyor.</p>
              ) : (
                loads.map((load) => (
                  <div key={load.id} className="bg-[#0b1329]/90 p-6 rounded-2xl border border-slate-800 flex flex-col gap-4 shadow-xl">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-extrabold text-lg text-white flex items-center gap-2">
                          <span>{load.origin}</span>
                          <span className="text-[#10b981]">→</span>
                          <span>{load.destination}</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-1">{load.tonnage} Ton | <span className="text-blue-400 font-semibold">{load.vehicle_type}</span></p>
                      </div>
                      {activeBidLoadId !== load.id ? (
                        <button onClick={() => setActiveBidLoadId(load.id)} className="bg-[#10b981] hover:bg-emerald-500 px-5 py-2.5 rounded-xl font-bold text-sm text-slate-950 transition-all shadow-lg shadow-emerald-500/20">Teklif Ver</button>
                      ) : null}
                    </div>

                    <div className="bg-[#070b14] p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-blue-500/5 pointer-events-none"></div>
                      <div className="flex items-center gap-4 z-10">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[#10b981] font-bold text-xl">📍</div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Yükleme Noktası</p>
                          <p className="text-base font-extrabold text-white">{load.origin}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-center z-10 px-4">
                        <span className="text-xs font-bold text-[#10b981] mb-1">OTOYOL SEVKİYAT HATTI</span>
                        <div className="w-32 md:w-48 h-0.5 bg-gradient-to-r from-[#10b981] to-blue-500 relative">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white animate-ping"></div>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1">Güvenli Lojistik Koridoru</span>
                      </div>
                      <div className="flex items-center gap-4 z-10">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xl">🏁</div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Teslimat Noktası</p>
                          <p className="text-base font-extrabold text-white">{load.destination}</p>
                        </div>
                      </div>
                    </div>

                    {activeBidLoadId === load.id && (
                      <div className="bg-[#070b14] p-4 rounded-xl border border-slate-800 flex gap-3 items-center mt-2 animate-fadeIn">
                        <input type="number" placeholder="Navlun Teklif Tutarı (TL)" className="bg-[#0b1329] border border-slate-800 p-3 rounded-xl text-sm text-white flex-1 focus:border-[#10b981] focus:outline-none" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} />
                        <button onClick={() => handleSendBid(load.id)} className="bg-[#10b981] hover:bg-emerald-500 px-5 py-3 rounded-xl text-sm font-bold text-slate-950">Gönder</button>
                        <button onClick={() => setActiveBidLoadId(null)} className="bg-slate-800 hover:bg-slate-700 px-4 py-3 rounded-xl text-sm text-slate-300">İptal</button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    );
  }

  // GİRİŞ VE KAYIT EKRANI
  return (
    <main className="min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute inset-0 z-0">
        <img src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2000&auto=format&fit=crop" alt="Background" className="w-full h-full object-cover opacity-15 filter saturate-150" />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#070b14] via-[#070b14]/90 to-[#0b1329]/80"></div>
      </div>

      <div className="relative z-10 w-full max-w-lg bg-[#0b1329]/95 backdrop-blur-2xl p-8 rounded-3xl border border-slate-800 shadow-2xl my-8">
        <div className="text-center mb-6">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-[#070b14] border border-slate-800 items-center justify-center shadow-xl shadow-emerald-500/10 mb-2 p-3">
            <span className="text-[#10b981] font-black text-3xl tracking-tighter">T</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight"><span className="text-[#10b981]">Tork</span> Lojistik</h1>
          <p className="text-slate-400 text-xs mt-1 font-medium">B2B Akıllı Navlun ve Onboarding Portalı</p>
        </div>

        <div className="flex bg-[#070b14] p-1.5 rounded-2xl mb-6 border border-slate-800">
          <button onClick={() => { setAuthMode("login"); setMessage(""); }} className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${authMode === 'login' ? 'bg-[#10b981] text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}>Giriş Yap</button>
          <button onClick={() => { setAuthMode("register"); setMessage(""); }} className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${authMode === 'register' ? 'bg-[#10b981] text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}>Kayıt Ol & Onboarding</button>
        </div>

        {authMode === "login" && (
          <div className="flex bg-[#070b14] p-1 rounded-xl mb-6 border border-slate-800">
            <button type="button" onClick={() => { setLoginRole("shipper"); setMessage(""); }} className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${loginRole === 'shipper' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}>📦 Yük Veren Girişi</button>
            <button type="button" onClick={() => { setLoginRole("carrier"); setMessage(""); }} className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${loginRole === 'carrier' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}>🚚 Nakliyeci Girişi</button>
          </div>
        )}

        <form onSubmit={authMode === "login" ? handleLogin : handleSignUp} className="space-y-4">
          
          {authMode === "register" && (
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800/80 space-y-3">
                <p className="text-xs font-bold text-[#10b981] uppercase tracking-wider">1. Rol & Yetki Seçimi</p>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Kayıt Olunacak Profil</label>
                  <div className="relative">
                    <select className="w-full bg-[#070b14] p-3 pr-10 rounded-xl border border-slate-800 text-sm text-white focus:border-[#10b981] focus:outline-none appearance-none cursor-pointer" value={role} onChange={(e) => setRole(e.target.value)}>
                      <option value="shipper" className="bg-[#0b1329] text-white">📦 Yük Veren (Shipper)</option>
                      <option value="carrier" className="bg-[#0b1329] text-white">🚚 Nakliyeci / Taşıyıcı (Carrier)</option>
                    </select>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#10b981]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800/80 space-y-3">
                <p className="text-xs font-bold text-[#10b981] uppercase tracking-wider">2. Şirket & Vergi Bilgileri</p>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Firma Adı" className="w-full bg-[#070b14] p-3 rounded-xl border border-slate-800 text-sm text-white" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                  <input type="text" placeholder="MERSİS No" className="w-full bg-[#070b14] p-3 rounded-xl border border-slate-800 text-sm text-white" value={mersisNo} onChange={(e) => setMersisNo(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Vergi Dairesi" className="w-full bg-[#070b14] p-3 rounded-xl border border-slate-800 text-sm text-white" value={taxOffice} onChange={(e) => setTaxOffice(e.target.value)} required />
                  <input type="text" placeholder="Vergi Numarası" className="w-full bg-[#070b14] p-3 rounded-xl border border-slate-800 text-sm text-white" value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} required />
                </div>
                <input type="text" placeholder="Şirket IBAN (TR...)" className="w-full bg-[#070b14] p-3 rounded-xl border border-slate-800 text-sm text-white" value={iban} onChange={(e) => setIban(e.target.value)} required />
              </div>

              {role === "carrier" && (
                <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800/80 space-y-3">
                  <p className="text-xs font-bold text-[#10b981] uppercase tracking-wider">3. Araç ve Donanım Bilgileri</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Araç Plakası (Örn: 61 TR 2026)" className="w-full bg-[#070b14] p-3 rounded-xl border border-slate-800 text-sm text-white" value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} required />
                    <div className="relative">
                      <select className="w-full bg-[#070b14] p-3 pr-10 rounded-xl border border-slate-800 text-sm text-white appearance-none cursor-pointer" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
                        <option value="TIR (Tenteli)" className="bg-[#0b1329] text-white">TIR (Tenteli)</option>
                        <option value="Kamyon (10 Teker)" className="bg-[#0b1329] text-white">Kamyon (10 Teker)</option>
                        <option value="Frigo (Soğutuculu)" className="bg-[#0b1329] text-white">Frigo (Soğutuculu)</option>
                        <option value="Kırkayak" className="bg-[#0b1329] text-white">Kırkayak</option>
                      </select>
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#10b981]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs text-slate-300 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={adrStatus} onChange={(e) => setAdrStatus(e.target.checked)} className="accent-[#10b981] w-4 h-4" />
                      <span>ADR Uygunluk</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={frigoStatus} onChange={(e) => setFrigoStatus(e.target.checked)} className="accent-[#10b981] w-4 h-4" />
                      <span>Frigo / Soğutuculu</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800/80 space-y-3">
                <p className="text-xs font-bold text-[#10b981] uppercase tracking-wider">4. İletişim & Yetkili Bilgileri</p>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Ad" className="w-full bg-[#070b14] p-3 rounded-xl border border-slate-800 text-sm text-white" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  <input type="text" placeholder="Soyad" className="w-full bg-[#070b14] p-3 rounded-xl border border-slate-800 text-sm text-white" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
                <input type="text" placeholder="Telefon (0532 000 00 00)" className="w-full bg-[#070b14] p-3 rounded-xl border border-slate-800 text-sm text-white" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">E-posta Adresi</label>
            <input type="email" placeholder="ornek@sirket.com" value={email} className="w-full bg-[#070b14] p-3.5 rounded-xl border border-slate-800 text-sm text-white focus:border-[#10b981] focus:outline-none" onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Şifre</label>
            <input type="password" placeholder="••••••••" value={password} className="w-full bg-[#070b14] p-3.5 rounded-xl border border-slate-800 text-sm text-white focus:border-[#10b981] focus:outline-none" onChange={(e) => setPassword(e.target.value)} required />
          </div>

          {authMode === "login" && (
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#070b14] border-slate-800 text-[#10b981] focus:ring-0 focus:ring-offset-0 accent-[#10b981] cursor-pointer" 
                />
                <span>Beni Hatırla</span>
              </label>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full font-extrabold py-4 rounded-xl shadow-xl text-sm mt-2 bg-[#10b981] hover:bg-emerald-500 text-slate-950 transition-all">
            {loading ? "İşlem Yapılıyor..." : (authMode === "login" ? (loginRole === "shipper" ? "Yük Veren Girişi Yap" : "Nakliyeci Girişi Yap") : "Onboarding Başvurusunu Tamamla")}
          </button>
        </form>

        {message && <div className="mt-4 p-3.5 rounded-xl text-xs font-medium border border-slate-800 bg-[#070b14] text-[#10b981] text-center">{message}</div>}
      </div>
    </main>
  );
}