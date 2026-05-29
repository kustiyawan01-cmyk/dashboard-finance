"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Package, Truck, CheckCircle2, AlertTriangle, 
  Search, Eye, Clock, ScanLine, 
  ChevronRight, AlertCircle, Info, Printer, Box, RefreshCw, ClipboardCopy, Filter, MapPin, X,
  Menu, Bell, MoreVertical, Calendar, Barcode
} from "lucide-react";

interface TrackingHistory {
  date: string;
  desc: string;
}

interface ScannedItem {
  resi: string;
  orderId: string;
  expedition: string;
  status: string;
  tujuan: string;
  scannedAt: string | Date;
  operator: string;
}

interface Message {
  type: "success" | "error" | "warning" | "info" | "";
  text: string;
}

export default function DashboardOutboundPage() {
  const [scanInput, setScanInput] = useState("");
  const [manifestItems, setManifestItems] = useState<ScannedItem[]>([]);
  const [lastScanned, setLastScanned] = useState<ScannedItem | null>(null);
  const [notification, setNotification] = useState<Message>({ type: "", text: "Sistem siap. Silakan scan resi." });
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"SEMUA" | "SIAP DIKIRIM" | "PROSES" | "DELIVERED">("SEMUA");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [trackingData, setTrackingData] = useState<TrackingHistory[]>([]);
  const [trackingItem, setTrackingItem] = useState<ScannedItem | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Ambil data asli dari Neon DB saat halaman dibuka
  const fetchManifestData = async () => {
    setIsLoadingData(true);
    try {
      const res = await fetch("/api/manifest");
      if (!res.ok) {
        throw new Error("Gagal mengambil data database");
      }
      const data = await res.json();
      setManifestItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Gagal mengambil data database", e);
      setNotification({ type: "error", text: "Gagal mengambil data manifest dari server." });
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchManifestData();
    if (window.innerWidth >= 1024) {
      if (window.innerWidth >= 1024) {
        if (window.innerWidth >= 1024) {
        inputRef.current?.focus();
      }
      }
    }
  }, []);

// 2. Deteksi otomatis ekspedisi dari pola nomor resi yang lebih presisi
  const detectCourier = (resi: string) => {
    const r = resi.toUpperCase();
    
    // Logika SPX Express (Awalan SPX atau Awalan ID yang berakhiran E)
    if (r.startsWith("SPX")) return "SPX Express";
    if (r.startsWith("ID") && r.length >= 14 && r.endsWith("E")) return "SPX Express";
    
    // Logika J&T Express
    if (r.startsWith("JX") || r.startsWith("JP") || r.startsWith("JD")) return "J&T Express";
    
    // Logika ID Express (Biasanya awalan IDE, IDS, atau IDV)
    if (r.startsWith("IDE") || r.startsWith("IDS") || r.startsWith("IDV")) return "ID Express";
    
    // Logika Lainnya
    if (r.startsWith("TGR")) return "TGR";
    if (r.startsWith("00") && r.length === 12) return "SiCepat";
    if (r.length === 15 && /^\d+$/.test(r)) return "JNE";
    if (r.length === 12 && /^\d+$/.test(r)) return "J&T Cargo";
    
    // Jika masih awalan ID tapi bukan IDE dan bukan ID...E, kemungkinan besar tetap SPX
    if (r.startsWith("ID")) return "SPX Express";

    return "Lainnya";
  };

  // 3. Simulasi otomatis pembuatan OrderID & Kota Tujuan dari marketplace
  const generateMarketplaceMock = () => {
    const cities = ["Bandung", "Jakarta", "Surabaya", "Medan", "Semarang", "Makassar"];
    const randomCity = cities[Math.floor(Math.random() * cities.length)];
    const randomOrder = `#INV/${new Date().toLocaleDateString('id-ID', {year: '2-digit', month: '2-digit', day: '2-digit'}).replace(/\//g, '')}/${Math.floor(1000 + Math.random() * 9000)}`;
    return { orderId: randomOrder, tujuan: randomCity };
  };

  const playSound = (type: 'success' | 'error') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {}
  };

  // 4. Logika simpan data secara langsung ke database saat barcode di-scan
  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const resi = scanInput.trim().toUpperCase();
    if (!resi) return;

    if (!/^[A-Z0-9]{8,30}$/.test(resi)) {
      setNotification({ type: "error", text: "Format resi tidak valid. Gunakan 8-30 karakter huruf atau angka." });
      playSound('error');
      setScanInput("");
      if (window.innerWidth >= 1024) {
        if (window.innerWidth >= 1024) {
        inputRef.current?.focus();
      }
      }
      return;
    }

    if (manifestItems.some(item => item.resi === resi)) {
      setNotification({ type: "warning", text: `Gagal: Resi ${resi} sudah di-scan sebelumnya!` });
      playSound('error');
      setScanInput("");
      return;
    }

    setIsSaving(true);
    const { orderId, tujuan } = generateMarketplaceMock();
    const newItem: ScannedItem = {
      resi,
      orderId,
      expedition: detectCourier(resi),
      status: "SIAP DIKIRIM",
      tujuan,
      scannedAt: new Date().toISOString(),
      operator: "Admin Gudang"
    };

    try {
      const res = await fetch("/api/manifest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [newItem] })
      });

      if (res.ok) {
        setLastScanned({ ...newItem, scannedAt: new Date() });
        setNotification({ type: "success", text: `Resi ${resi} berhasil masuk ke antrean pengiriman.` });
        playSound('success');
        fetchManifestData(); 
      } else {
        throw new Error();
      }
    } catch (error) {
      setNotification({ type: "error", text: "Koneksi server terputus. Coba lagi!" });
      playSound('error');
    } finally {
      setIsSaving(false);
      setScanInput("");
      if (window.innerWidth >= 1024) {
        if (window.innerWidth >= 1024) {
        inputRef.current?.focus();
      }
      }
    }
  };

  // 4b. Fungsi Sinkronisasi Status dengan BinderByte API
  const handleSyncStatus = async () => {
    setIsSyncing(true);
    setNotification({ type: "info", text: "Menyinkronkan data dengan sistem ekspedisi..." });
    
    let successCount = 0;
    let failCount = 0;
    const updatedItems = [...manifestItems];

    for (let i = 0; i < updatedItems.length; i++) {
      try {
        let courierCode = "lainnya";
        const exp = updatedItems[i].expedition;
        
        if (exp === "J&T Express") courierCode = "jnt";
        else if (exp === "SPX Express") courierCode = "spx";
        else if (exp === "ID Express") courierCode = "ide";
        else if (exp === "J&T Cargo") courierCode = "jntcargo";
        else if (exp === "JNE") courierCode = "jne";
        else if (exp === "SiCepat") courierCode = "sicepat";

        if (courierCode === "lainnya") continue;

        const res = await fetch("/api/binderbyte", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ waybill: updatedItems[i].resi, courier: courierCode })
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.status === 200 && data.data && data.data.summary) {
            const newStatus = data.data.summary.status;
            
            // Cek apakah status dari ekspedisi berbeda dengan status di database kita
            if (newStatus && newStatus !== updatedItems[i].status) {
              updatedItems[i].status = newStatus;
              
              // UPDATE KE DATABASE NEON AGAR PERMANEN
              try {
                await fetch("/api/manifest", {
                  method: "PUT", 
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ 
                    resi: updatedItems[i].resi, 
                    status: newStatus 
                  })
                });
              } catch (e) {
                console.error("Gagal menyimpan status baru ke database", e);
              }
              
              successCount++;
            }
          } else {
            failCount++;
          }
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
      }
    }

    setManifestItems(updatedItems);
    setNotification({ type: "success", text: `Update massal selesai. Berhasil: ${successCount}, Tertunda: ${failCount}` });
    setIsSyncing(false);
  };

  // 5. Fitur Auto-Sync: Mengecek resi otomatis setiap 15 menit
  useEffect(() => {
    if (manifestItems.length === 0 || isSyncing) return;
    const autoSyncTimer = setInterval(() => {
      handleSyncStatus();
    }, 15 * 60 * 1000); 
    return () => clearInterval(autoSyncTimer);
  }, [manifestItems, isSyncing]);

  // Fungsi tambahan untuk copy resi ke clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setNotification({ type: "success", text: `Resi ${text} disalin ke clipboard.` });
  };

  const getOfficialTrackingUrl = (expedition: string) => {
    if (expedition === "J&T Express") return "https://jet.co.id/track";
    if (expedition === "SPX Express") return "https://spx.co.id/";
    if (expedition === "ID Express") return "https://idexpress.com/lacak-paket";
    if (expedition === "J&T Cargo") return "https://www.jtcargo.id/networkQuery";
    if (expedition === "JNE") return "https://jne.co.id/tracking-package";
    if (expedition === "SiCepat") return "https://www.sicepat.com/";
    return "https://cekresi.com/";
  };

  const openOfficialTracking = (item: ScannedItem) => {
    navigator.clipboard.writeText(item.resi);
    setNotification({ type: "info", text: `Resi ${item.resi} disalin. Silakan tempel di website resmi ${item.expedition}.` });
    window.open(getOfficialTrackingUrl(item.expedition), "_blank", "noopener,noreferrer");
  };

  // Fungsi untuk mengambil histori perjalanan (tracing) dari BinderByte
  const handleTrackItem = async (item: ScannedItem) => {
    setTrackingItem(item);
    setIsModalOpen(true);
    setIsLoadingHistory(true);
    setTrackingData([]);

    try {
      let courierCode = "lainnya";
      if (item.expedition === "J&T Express") courierCode = "jnt";
      else if (item.expedition === "SPX Express") courierCode = "spx";
      else if (item.expedition === "ID Express") courierCode = "ide";
      else if (item.expedition === "J&T Cargo") courierCode = "jntcargo";
      else if (item.expedition === "JNE") courierCode = "jne";
      else if (item.expedition === "SiCepat") courierCode = "sicepat";

      if (courierCode !== "lainnya") {
        const res = await fetch("/api/binderbyte", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ waybill: item.resi, courier: courierCode })
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.status === 200 && data?.data?.history) {
            setTrackingData(data.data.history);
          }
        }
      }
    } catch (error) {
      console.error("Gagal melacak:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Filter logika tabel
  const todayManifestItems = manifestItems.filter(item => {
    const itemDate = new Date(item.scannedAt);
    const now = new Date();
    return itemDate.getFullYear() === now.getFullYear() && itemDate.getMonth() === now.getMonth() && itemDate.getDate() === now.getDate();
  });

  const filteredItems = manifestItems.filter(item => {
    const keyword = searchQuery.trim().toUpperCase();
    const matchesSearch = !keyword ||
      item.resi.toUpperCase().includes(keyword) ||
      item.orderId.toUpperCase().includes(keyword) ||
      item.expedition.toUpperCase().includes(keyword) ||
      item.status.toUpperCase().includes(keyword) ||
      item.tujuan.toUpperCase().includes(keyword);

    if (!matchesSearch) return false;
    if (filterStatus === "SEMUA") return true;
    if (filterStatus === "SIAP DIKIRIM") return item.status === "SIAP DIKIRIM";
    if (filterStatus === "DELIVERED") return item.status === "DELIVERED";
    return item.status !== "SIAP DIKIRIM" && item.status !== "DELIVERED";
  });

  const StatusBadge = ({ status }: { status: string }) => {
    let colors = "bg-slate-100 text-slate-600 border-slate-200";
    if (status === "SIAP DIKIRIM") colors = "bg-blue-50 text-blue-600 border-blue-200";
    if (status === "DELIVERED") colors = "bg-emerald-50 text-emerald-600 border-emerald-200";
    if (status === "ON PROCESS" || status === "PICKUP") colors = "bg-amber-50 text-amber-600 border-amber-200";

    return (
      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded border whitespace-nowrap print:border-none print:bg-transparent print:p-0 print:text-black ${colors}`}>
        {status}
      </span>
    );
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex items-center justify-center">
        <div className="text-sm font-bold text-slate-500">Memuat dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white text-slate-800 font-sans flex flex-col print:block">
      {/* HEADER TOP NAVBAR */}
      <header className="hidden lg:flex bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-4 justify-between items-center sticky top-0 z-20 shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <Menu className="text-slate-500 cursor-pointer hover:text-slate-800" size={24} />
          <h1 className="text-base font-bold text-slate-800">Dashboard Outbound</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative cursor-pointer">
            <Bell className="text-slate-500 hover:text-slate-800" size={20} />
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">2</span>
          </div>
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xs">AD</div>
            <div className="hidden md:block">
              <p className="text-sm font-bold text-slate-800 leading-tight">Admin Gudang</p>
              <p className="text-[10px] text-slate-500 font-medium">Administrator</p>
            </div>
            <ChevronRight size={16} className="text-slate-400 rotate-90 ml-1" />
          </div>
        </div>
      </header>

      <main className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-[1440px] mx-auto w-full max-w-full flex-1 print:block print:p-0 print:m-0 print:max-w-none">
        
        {/* ROW 1: KOTAK METRIK OPERASIONAL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5 mb-6 lg:mb-8 print:hidden">
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col min-h-[168px]">
            <div className="flex gap-4 items-start mb-2">
              <div className="bg-blue-50 p-3 rounded-lg text-blue-600"><Box size={20} /></div>
              <div>
                <p className="text-[11px] font-medium text-slate-500 mb-0.5">Total Antrian Hari Ini</p>
                <h3 className="text-2xl font-black text-slate-800 leading-none">{todayManifestItems.length}</h3>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 mb-3">Paket menunggu diproses</p>
            <button className="text-[11px] font-bold text-blue-600 flex items-center gap-1 w-max">Lihat detail <ChevronRight size={12} /></button>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col min-h-[168px]">
            <div className="flex gap-4 items-start mb-2">
              <div className="bg-purple-50 p-3 rounded-lg text-purple-600"><ScanLine size={20} /></div>
              <div>
                <p className="text-[11px] font-medium text-slate-500 mb-0.5">Siap Diserahkan</p>
                <h3 className="text-2xl font-black text-slate-800 leading-none">{todayManifestItems.filter(i => i.status === 'SIAP DIKIRIM').length}</h3>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 mb-3">Paket siap diserahkan ke kurir</p>
            <button className="text-[11px] font-bold text-blue-600 flex items-center gap-1 w-max">Lihat detail <ChevronRight size={12} /></button>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col min-h-[168px]">
            <div className="flex gap-4 items-start mb-2">
              <div className="bg-orange-50 p-3 rounded-lg text-orange-500"><Truck size={20} /></div>
              <div>
                <p className="text-[11px] font-medium text-slate-500 mb-0.5">Sedang Diproses Kurir</p>
                <h3 className="text-2xl font-black text-slate-800 leading-none">{todayManifestItems.filter(i => i.status !== 'SIAP DIKIRIM' && i.status !== 'DELIVERED').length}</h3>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 mb-3">Paket dalam proses pengiriman</p>
            <button className="text-[11px] font-bold text-blue-600 flex items-center gap-1 w-max">Lihat detail <ChevronRight size={12} /></button>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col min-h-[168px]">
            <div className="flex gap-4 items-start mb-2">
              <div className="bg-emerald-50 p-3 rounded-lg text-emerald-500"><CheckCircle2 size={20} /></div>
              <div>
                <p className="text-[11px] font-medium text-slate-500 mb-0.5">Berhasil Terkirim</p>
                <h3 className="text-2xl font-black text-slate-800 leading-none">{todayManifestItems.filter(i => i.status === 'DELIVERED').length}</h3>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 mb-3">Paket berhasil terkirim hari ini</p>
            <button className="text-[11px] font-bold text-blue-600 flex items-center gap-1 w-max">Lihat detail <ChevronRight size={12} /></button>
          </div>
        </div>

        {/* ROW 2: AREA SCANNER BARCODE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 lg:mb-8 p-4 sm:p-6 lg:p-7 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-800">Pemindaian Barcode</h2>
              <p className="text-xs text-slate-500 mt-1">Kelola proses scan resi dengan tampilan yang lebih cepat dan mudah dibaca.</p>
            </div>
            <span className="w-max px-3 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full flex items-center gap-2 border border-emerald-100">
               <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Scanner Terhubung
            </span>
          </div>

          {notification.text && (
            <div className={`mb-6 px-4 py-3 rounded-lg border text-xs font-bold flex items-center gap-2 ${
              notification.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
              notification.type === "error" ? "bg-red-50 text-red-700 border-red-100" :
              notification.type === "warning" ? "bg-amber-50 text-amber-700 border-amber-100" :
              "bg-blue-50 text-blue-700 border-blue-100"
            }`}>
              {notification.type === "success" && <CheckCircle2 size={16} />}
              {notification.type === "error" && <AlertCircle size={16} />}
              {notification.type === "warning" && <AlertTriangle size={16} />}
              {(notification.type === "info" || notification.type === "") && <Info size={16} />}
              <span>{notification.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6 lg:gap-8 items-stretch">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Barcode size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 leading-tight">Area Pemindaian</p>
                    <p className="text-xs text-slate-500">Scan resi, simpan otomatis, lalu pantau status pengiriman.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl bg-white border border-slate-200 p-4">
                    <p className="text-[11px] font-bold text-slate-500 mb-1">Mode Input</p>
                    <p className="text-sm font-bold text-slate-800">Scanner / Manual</p>
                  </div>
                  <div className="rounded-xl bg-white border border-slate-200 p-4">
                    <p className="text-[11px] font-bold text-slate-500 mb-1">Penyimpanan</p>
                    <p className="text-sm font-bold text-slate-800">Otomatis ke Manifest</p>
                  </div>
                </div>

                <div className="rounded-xl bg-white border border-slate-200 p-4">
                  <p className="text-[11px] font-bold text-slate-500 mb-2">Petunjuk Cepat</p>
                  <ul className="space-y-2 text-xs text-slate-600">
                    <li>• Arahkan scanner ke kolom input atau ketik manual nomor resi.</li>
                    <li>• Tekan Enter untuk menyimpan data ke manifest.</li>
                    <li>• Sistem akan mendeteksi ekspedisi secara otomatis.</li>
                  </ul>
                </div>
              </div>

              <div className="mt-5 inline-flex flex-wrap items-center gap-3 bg-emerald-50 border border-emerald-100 px-4 py-3 rounded-xl text-[11px] font-bold text-emerald-700">
                <span className="flex items-center gap-1.5"><CheckCircle2 size={14} /> Update terakhir: <span suppressHydrationWarning>{new Date().toLocaleString('id-ID', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</span></span>
                <span className="hidden sm:block w-[1px] bg-emerald-200 h-4"></span>
                <span>Berhasil: {todayManifestItems.length}</span>
                <span className="hidden sm:block w-[1px] bg-emerald-200 h-4"></span>
                <span>Tertunda: {isSyncing ? "..." : "0"}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <p className="text-sm font-bold text-slate-800">Scan Resi</p>
                  <p className="text-xs text-slate-500 mt-1">Fokuskan scanner ke kolom di bawah untuk proses yang lebih cepat.</p>
                </div>
                <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full flex items-center gap-2 border border-emerald-100 whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Siap
                </span>
              </div>

              <form onSubmit={handleScanSubmit} className="w-full relative group mb-4">
                <div className="absolute inset-0 border-2 border-dashed border-slate-300 rounded-2xl pointer-events-none group-focus-within:border-indigo-400 transition-colors"></div>
                <input
                  ref={inputRef}
                  type="text"
                  disabled={isSaving}
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  className="w-full h-28 sm:h-32 bg-transparent text-center text-xl sm:text-2xl md:text-3xl px-4 py-2 focus:outline-none uppercase font-black text-slate-800 placeholder-transparent z-10 relative"
                  inputMode="text"
                />
                {!scanInput && (
                   <div className="absolute inset-0 flex items-center justify-center gap-3 pointer-events-none text-slate-400 px-4">
                     <Barcode size={28} />
                     <div className="text-left">
                       <span className="text-base sm:text-lg font-bold text-slate-500 block leading-tight">SCAN RESI DI SINI</span>
                       <span className="text-[11px] sm:text-xs font-medium text-slate-400">atau ketik nomor resi lalu tekan Enter</span>
                     </div>
                   </div>
                )}
              </form>

              <p className="text-[11px] text-slate-400 text-center">Sistem akan otomatis menyimpan data setelah alat scanner menekan "Enter".</p>
            </div>
          </div>
        </div>

        {/* ROW 3: PREVIEW PAKET TERAKHIR */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 lg:mb-8 print:hidden">
           <div className="px-6 py-4 border-b border-slate-100">
             <h2 className="text-sm font-bold text-slate-800">Preview Paket Terakhir</h2>
           </div>
           <div className="p-5 sm:p-6 lg:p-8">
             {lastScanned ? (
                <div className="w-full border border-slate-200 rounded-2xl p-5 sm:p-6 bg-slate-50/70">
                  <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-5 lg:gap-6 items-start">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="rounded-xl bg-white border border-slate-200 p-4">
                        <p className="text-[10px] text-slate-500 mb-1">Nomor Resi</p>
                        <p className="text-base font-bold text-indigo-700 break-all">{lastScanned.resi}</p>
                        <p className="text-[10px] text-slate-400 mt-1 break-all">{lastScanned.orderId}</p>
                      </div>
                      <div className="rounded-xl bg-white border border-slate-200 p-4">
                        <p className="text-[10px] text-slate-500 mb-1">Ekspedisi</p>
                        <p className="text-sm font-bold text-slate-700">{lastScanned.expedition}</p>
                      </div>
                      <div className="rounded-xl bg-white border border-slate-200 p-4">
                        <p className="text-[10px] text-slate-500 mb-1">Waktu Scan</p>
                        <p className="text-sm font-bold text-slate-700" suppressHydrationWarning>{new Date(lastScanned.scannedAt).toLocaleTimeString('id-ID')}</p>
                      </div>
                    </div>
                    <div className="rounded-xl bg-white border border-slate-200 p-4 flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] text-slate-500 mb-1">Status Paket</p>
                        <StatusBadge status={lastScanned.status} />
                      </div>
                      <p className="text-xs text-slate-500">Data paket terakhir yang berhasil masuk ke antrean pengiriman.</p>
                    </div>
                  </div>
                </div>
             ) : (
                <div className="text-center py-8 sm:py-10 text-slate-400 flex flex-col items-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                   <Box size={40} className="mb-3 opacity-30 text-slate-300" />
                   <p className="text-sm font-bold text-slate-600 mb-1">Belum ada data untuk ditampilkan</p>
                   <p className="text-xs">Lakukan pemindaian untuk melihat detail paket terbaru</p>
                </div>
             )}
           </div>
        </div>

        {/* ROW 4: TABEL DATA INTERNAL */}
        <div className="bg-white print:bg-transparent rounded-2xl shadow-sm print:shadow-none flex flex-col border border-slate-200 print:border-none overflow-hidden print:overflow-visible">
          
          {/* KOP SURAT KHUSUS CETAK (PRINT ONLY) */}
          <div className="hidden print:block mb-6 text-center border-b-2 border-black pb-4 mt-8">
            <h1 className="text-2xl font-black uppercase tracking-widest text-black">Manifest Penyerahan Barang</h1>
            <p className="text-sm font-medium text-black mt-1" suppressHydrationWarning>Dicetak pada: {new Date().toLocaleString('id-ID', {day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'})} WIB</p>
            <p className="text-sm font-medium text-black mt-1">Total Paket: {filteredItems.length} | Kurir / Ekspedisi: ___________________</p>
          </div>

          {/* CONTROL PANEL TABEL */}
          <div className="p-4 sm:p-5 lg:p-6 border-b border-slate-200 bg-white print:hidden">
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto_auto] gap-4 lg:gap-5 items-start xl:items-center">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-slate-400" />
                  <p className="text-xs font-bold text-slate-700">Filter Manifest</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setFilterStatus("SEMUA")} className={`text-[11px] font-bold px-4 py-2 rounded-full transition-colors ${filterStatus === "SEMUA" ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50"}`}>Semua</button>
                  <button onClick={() => setFilterStatus("SIAP DIKIRIM")} className={`text-[11px] font-bold px-4 py-2 rounded-full transition-colors ${filterStatus === "SIAP DIKIRIM" ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50"}`}>Gudang (Siap Kirim)</button>
                  <button onClick={() => setFilterStatus("PROSES")} className={`text-[11px] font-bold px-4 py-2 rounded-full transition-colors ${filterStatus === "PROSES" ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50"}`}>Ekspedisi (Proses)</button>
                  <button onClick={() => setFilterStatus("DELIVERED")} className={`text-[11px] font-bold px-4 py-2 rounded-full transition-colors ${filterStatus === "DELIVERED" ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50"}`}>Terkirim</button>
                </div>
              </div>

              <div className="relative w-full xl:w-80">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari resi, order, status..."
                  className="w-full pl-9 pr-3 py-3 text-[11px] font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                <button onClick={handleSyncStatus} disabled={isSyncing || manifestItems.length === 0} className="w-full sm:w-auto justify-center text-[11px] font-bold flex items-center gap-2 text-white bg-slate-800 px-5 py-3 rounded-xl hover:bg-slate-900 transition-colors disabled:opacity-50">
                  <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} /> 
                  {isSyncing ? "Menarik Data API..." : "Update Status Ekspedisi"}
                </button>
                <button onClick={() => window.print()} disabled={manifestItems.length === 0} className="w-full sm:w-auto justify-center text-[11px] font-bold flex items-center gap-2 text-slate-700 bg-white border border-slate-200 shadow-sm px-5 py-3 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50">
                  <Printer size={14} /> Cetak Handover
                </button>
              </div>
            </div>
          </div>

          {/* TABEL */}
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full min-w-[920px] text-left border-collapse print:text-black">
              <thead className="bg-white border-b border-slate-100 print:border-black">
                <tr>
                  <th className="px-6 py-4 print:px-2 print:py-2 text-[11px] font-bold text-slate-500 print:text-black capitalize">Nomor Resi</th>
                  <th className="px-6 py-4 print:px-2 print:py-2 text-[11px] font-bold text-slate-500 print:text-black capitalize">Ekspedisi</th>
                  <th className="px-6 py-4 print:px-2 print:py-2 text-[11px] font-bold text-slate-500 print:text-black capitalize">Status</th>
                  <th className="px-6 py-4 print:px-2 print:py-2 text-[11px] font-bold text-slate-500 print:text-black capitalize">Waktu Pemindaian</th>
                  <th className="px-6 py-4 print:px-2 print:py-2 text-[11px] font-bold text-slate-500 print:text-black capitalize">Lokasi</th>
                  <th className="px-6 py-4 print:px-2 print:py-2 text-[11px] font-bold text-slate-500 capitalize text-center print:hidden">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white print:divide-slate-300">
                {isLoadingData ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <RefreshCw size={32} className="mb-3 animate-spin opacity-50" />
                        <p className="text-sm font-bold">Memuat data manifest...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredItems.length > 0 ? (
                  filteredItems.map((item, idx) => (
                    <tr key={item.resi} className="hover:bg-slate-50 transition-colors group print:border-b print:border-slate-300">
                      <td className="px-6 py-4 print:px-2 print:py-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-indigo-700 print:text-black">{item.resi}</span>
                            <button onClick={() => copyToClipboard(item.resi)} className="text-slate-400 hover:text-indigo-600 print:hidden"><ClipboardCopy size={12} /></button>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 print:text-slate-600">{item.orderId}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 print:px-2 print:py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {item.expedition === "J&T Express" && <div className="text-red-500 font-black italic text-xs tracking-tighter print:hidden">J&T</div>}
                          {item.expedition === "J&T Cargo" && <div className="bg-[#009944] text-white px-1.5 py-0.5 rounded-sm font-black italic text-[10px] tracking-tight print:hidden">J&T CARGO</div>}
                          {item.expedition === "SPX Express" && <div className="text-orange-500 font-black italic text-xs tracking-tighter print:hidden">SPX</div>}
                          {item.expedition === "JNE" && <div className="text-blue-600 font-black italic text-xs tracking-tighter print:hidden">JNE</div>}
                          {item.expedition === "SiCepat" && <div className="text-red-600 font-black italic text-xs tracking-tighter print:hidden">SiCepat</div>}
                          {item.expedition === "ID Express" && <div className="text-orange-600 font-black italic text-xs tracking-tighter print:hidden">IDE</div>}
                          {item.expedition === "Lainnya" && <div className="text-slate-400 font-black italic text-xs tracking-tighter print:hidden">EXP</div>}
                          <span className="text-xs font-bold text-slate-700 print:text-black">{item.expedition}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 print:px-2 print:py-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-6 py-4 print:px-2 print:py-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500 print:text-black" suppressHydrationWarning>
                          <Calendar size={14} className="text-slate-400 print:hidden" />
                          {new Date(item.scannedAt).toLocaleString('id-ID', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'})}
                        </div>
                      </td>
                      <td className="px-6 py-4 print:px-2 print:py-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 print:text-black">
                          <MapPin size={14} className="text-slate-400 print:hidden" /> Gudang Pusat
                        </div>
                      </td>
                      <td className="px-6 py-4 print:hidden">
                        <div className="flex items-center justify-center gap-3">
                          <button onClick={() => handleTrackItem(item)} title="Lacak Perjalanan" className="text-slate-400 hover:text-indigo-600 border border-slate-200 p-1.5 rounded-md transition-colors"><Eye size={14} /></button>
                          <button onClick={() => openOfficialTracking(item)} title="Buka Website Resmi" className="text-slate-400 hover:text-indigo-600 border border-slate-200 p-1.5 rounded-md transition-colors"><ChevronRight size={14} /></button>
                          <button onClick={() => copyToClipboard(item.resi)} title="Salin Resi" className="text-slate-400 hover:text-indigo-600 border border-slate-200 p-1.5 rounded-md transition-colors"><ClipboardCopy size={14} /></button>
                          <button className="text-slate-400 hover:text-slate-800 border border-slate-200 p-1.5 rounded-md transition-colors"><MoreVertical size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Search size={32} className="mb-3 opacity-30" />
                        <p className="text-sm font-bold">Tidak ada data ditemukan untuk filter ini.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* AREA TANDA TANGAN KHUSUS CETAK (PRINT ONLY) */}
          <div className="hidden print:flex justify-between items-end mt-16 px-16 text-black">
            <div className="text-center">
              <p className="mb-20 font-medium text-sm">Diserahkan Oleh (Gudang),</p>
              <p className="font-bold underline">Admin Gudang</p>
            </div>
            <div className="text-center">
              <p className="mb-20 font-medium text-sm">Diterima Oleh (Kurir),</p>
              <p className="font-bold text-slate-400">_________________________</p>
            </div>
          </div>
        </div>

        <footer className="pt-4 pb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[10px] text-slate-400 font-medium print:hidden">
          <p>© 2024 Sistem Gudang Internal. All rights reserved.</p>
          <p>v2.1.0</p>
        </footer>
        
      </main>

      {/* MODAL HISTORI TRACING */}
      {isModalOpen && trackingItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg"><MapPin size={20} /></div>
                <div>
                  <h2 className="text-base font-bold text-slate-800 leading-tight">Histori Perjalanan Ekspedisi</h2>
                  <p className="text-xs text-slate-500 font-medium">{trackingItem.resi} • {trackingItem.expedition}</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 p-2 rounded-lg transition-colors border border-slate-200">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Status Terakhir</p>
                  <StatusBadge status={trackingItem.status} />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Tujuan</p>
                  <p className="text-sm font-bold text-slate-700">{trackingItem.tujuan}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-sm font-bold text-slate-800">Timeline Detail</h3>
                <button onClick={() => openOfficialTracking(trackingItem)} className="text-[11px] font-bold flex items-center gap-2 text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors">
                  Buka Website Resmi <ChevronRight size={13} />
                </button>
              </div>
              
              {isLoadingHistory ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <RefreshCw size={24} className="animate-spin text-indigo-500 mb-3" />
                  <p className="text-sm font-medium text-slate-500">Menarik data dari ekspedisi...</p>
                </div>
              ) : trackingData.length > 0 ? (
                <div className="relative border-l-2 border-slate-200 ml-3 space-y-6 pb-4 mt-2">
                  {trackingData.map((hist, idx) => (
                    <div key={idx} className="relative pl-6">
                      <span className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white ${idx === 0 ? 'bg-indigo-600' : 'bg-slate-300'}`}></span>
                      <p className={`text-xs font-bold mb-0.5 ${idx === 0 ? 'text-indigo-600' : 'text-slate-500'}`}>{hist.date}</p>
                      <p className={`text-sm ${idx === 0 ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>{hist.desc}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Box size={32} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-medium text-slate-500 mb-4">Belum ada riwayat perjalanan atau resi tidak valid.</p>
                  <button onClick={() => openOfficialTracking(trackingItem)} className="text-[11px] font-bold inline-flex items-center gap-2 text-white bg-slate-800 px-4 py-2.5 rounded-lg hover:bg-slate-900 transition-colors">
                    Lacak di Website Resmi <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}