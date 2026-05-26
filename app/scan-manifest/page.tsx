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
  const [filterStatus, setFilterStatus] = useState<"SEMUA" | "SIAP DIKIRIM" | "PROSES">("SEMUA");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [trackingData, setTrackingData] = useState<TrackingHistory[]>([]);
  const [trackingItem, setTrackingItem] = useState<ScannedItem | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Ambil data asli dari Neon DB saat halaman dibuka
  const fetchManifestData = async () => {
    try {
      const res = await fetch("/api/manifest");
      if (res.ok) {
        const data = await res.json();
        setManifestItems(data);
      }
    } catch (e) {
      console.error("Gagal mengambil data database", e);
    }
  };

  useEffect(() => {
    fetchManifestData();
    inputRef.current?.focus();
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
      inputRef.current?.focus();
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
  const filteredItems = manifestItems.filter(item => {
    if (filterStatus === "SEMUA") return true;
    if (filterStatus === "SIAP DIKIRIM") return item.status === "SIAP DIKIRIM";
    return item.status !== "SIAP DIKIRIM"; // Asumsi "PROSES" adalah status selain siap dikirim
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

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white text-slate-800 font-sans flex flex-col print:block">
      {/* HEADER TOP NAVBAR */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm print:hidden">
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

      <main className="p-4 md:p-8 max-w-[1400px] mx-auto w-full flex-1 print:block print:p-0 print:m-0 print:max-w-none">
        
        {/* ROW 1: KOTAK METRIK OPERASIONAL */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 print:hidden">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
            <div className="flex gap-4 items-start mb-2">
              <div className="bg-blue-50 p-3 rounded-lg text-blue-600"><Box size={20} /></div>
              <div>
                <p className="text-[11px] font-medium text-slate-500 mb-0.5">Total Antrian Hari Ini</p>
                <h3 className="text-2xl font-black text-slate-800 leading-none">{manifestItems.length}</h3>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 mb-3">Paket menunggu diproses</p>
            <button className="text-[11px] font-bold text-blue-600 flex items-center gap-1 w-max">Lihat detail <ChevronRight size={12} /></button>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
            <div className="flex gap-4 items-start mb-2">
              <div className="bg-purple-50 p-3 rounded-lg text-purple-600"><ScanLine size={20} /></div>
              <div>
                <p className="text-[11px] font-medium text-slate-500 mb-0.5">Siap Diserahkan</p>
                <h3 className="text-2xl font-black text-slate-800 leading-none">{manifestItems.filter(i => i.status === 'SIAP DIKIRIM').length}</h3>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 mb-3">Paket siap diserahkan ke kurir</p>
            <button className="text-[11px] font-bold text-blue-600 flex items-center gap-1 w-max">Lihat detail <ChevronRight size={12} /></button>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
            <div className="flex gap-4 items-start mb-2">
              <div className="bg-orange-50 p-3 rounded-lg text-orange-500"><Truck size={20} /></div>
              <div>
                <p className="text-[11px] font-medium text-slate-500 mb-0.5">Sedang Diproses Kurir</p>
                <h3 className="text-2xl font-black text-slate-800 leading-none">{manifestItems.filter(i => i.status !== 'SIAP DIKIRIM' && i.status !== 'DELIVERED').length}</h3>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 mb-3">Paket dalam proses pengiriman</p>
            <button className="text-[11px] font-bold text-blue-600 flex items-center gap-1 w-max">Lihat detail <ChevronRight size={12} /></button>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
            <div className="flex gap-4 items-start mb-2">
              <div className="bg-emerald-50 p-3 rounded-lg text-emerald-500"><CheckCircle2 size={20} /></div>
              <div>
                <p className="text-[11px] font-medium text-slate-500 mb-0.5">Berhasil Terkirim</p>
                <h3 className="text-2xl font-black text-slate-800 leading-none">{manifestItems.filter(i => i.status === 'DELIVERED').length}</h3>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 mb-3">Paket berhasil terkirim hari ini</p>
            <button className="text-[11px] font-bold text-blue-600 flex items-center gap-1 w-max">Lihat detail <ChevronRight size={12} /></button>
          </div>
        </div>

        {/* ROW 2: AREA SCANNER BARCODE */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 p-6 print:hidden">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-sm font-bold text-slate-800">Pemindaian Barcode</h2>
            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full flex items-center gap-2 border border-emerald-100">
               <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Scanner Terhubung
            </span>
          </div>

          <div className="max-w-2xl mx-auto flex flex-col items-center">
            <p className="text-[11px] font-bold text-slate-800 mb-4">Arahkan alat scanner ke kolom di bawah</p>
            
            <form onSubmit={handleScanSubmit} className="w-full relative group mb-3">
              <div className="absolute inset-0 border-2 border-dashed border-slate-300 rounded-xl pointer-events-none group-focus-within:border-indigo-400 transition-colors"></div>
              <input
                ref={inputRef}
                type="text"
                disabled={isSaving}
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                className="w-full h-24 bg-transparent text-center text-2xl md:text-3xl px-4 py-2 focus:outline-none uppercase font-black text-slate-800 placeholder-transparent z-10 relative"
                autoFocus
              />
              {!scanInput && (
                 <div className="absolute inset-0 flex items-center justify-center gap-3 pointer-events-none text-slate-400">
                   <Barcode size={32} />
                   <div className="text-left">
                     <span className="text-lg font-bold text-slate-500 block leading-tight">SCAN RESI DI SINI</span>
                     <span className="text-[11px] font-medium text-slate-400">atau ketik nomor resi lalu tekan Enter</span>
                   </div>
                 </div>
              )}
            </form>

            <p className="text-[11px] text-slate-400 mb-8">Sistem akan otomatis menyimpan data setelah alat scanner menekan "Enter".</p>

            <div className="inline-flex items-center gap-4 bg-emerald-50 border border-emerald-100 px-6 py-2.5 rounded-lg text-[11px] font-bold text-emerald-700">
              <span className="flex items-center gap-1.5"><CheckCircle2 size={14} /> Update terakhir: <span suppressHydrationWarning>{new Date().toLocaleString('id-ID', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</span></span>
              <span className="w-[1px] bg-emerald-200 h-4"></span>
              <span>Berhasil: {manifestItems.length}</span>
              <span className="w-[1px] bg-emerald-200 h-4"></span>
              <span>Tertunda: {isSyncing ? "..." : "0"}</span>
            </div>
          </div>
        </div>

        {/* ROW 3: PREVIEW PAKET TERAKHIR */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 print:hidden">
           <div className="px-6 py-4 border-b border-slate-100">
             <h2 className="text-sm font-bold text-slate-800">Preview Paket Terakhir</h2>
           </div>
           <div className="p-8 flex justify-center">
             {lastScanned ? (
                <div className="w-full max-w-4xl border border-slate-200 rounded-xl p-6 flex justify-between items-center bg-slate-50/50">
                  <div className="flex gap-8">
                    <div>
                      <p className="text-[10px] text-slate-500 mb-1">Nomor Resi</p>
                      <p className="text-base font-bold text-indigo-700">{lastScanned.resi}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{lastScanned.orderId}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 mb-1">Ekspedisi</p>
                      <p className="text-sm font-bold text-slate-700">{lastScanned.expedition}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 mb-1">Waktu Scan</p>
                      <p className="text-sm font-bold text-slate-700" suppressHydrationWarning>{new Date(lastScanned.scannedAt).toLocaleTimeString('id-ID')}</p>
                    </div>
                  </div>
                  <div><StatusBadge status={lastScanned.status} /></div>
                </div>
             ) : (
                <div className="text-center py-6 text-slate-400 flex flex-col items-center">
                   <Box size={40} className="mb-3 opacity-30 text-slate-300" />
                   <p className="text-sm font-bold text-slate-600 mb-1">Belum ada data untuk ditampilkan</p>
                   <p className="text-xs">Lakukan pemindaian untuk melihat detail paket terbaru</p>
                </div>
             )}
           </div>
        </div>

        {/* ROW 4: TABEL DATA INTERNAL */}
        <div className="bg-white print:bg-transparent rounded-xl shadow-sm print:shadow-none flex flex-col border border-slate-200 print:border-none overflow-hidden print:overflow-visible">
          
          {/* KOP SURAT KHUSUS CETAK (PRINT ONLY) */}
          <div className="hidden print:block mb-6 text-center border-b-2 border-black pb-4 mt-8">
            <h1 className="text-2xl font-black uppercase tracking-widest text-black">Manifest Penyerahan Barang</h1>
            <p className="text-sm font-medium text-black mt-1" suppressHydrationWarning>Dicetak pada: {new Date().toLocaleString('id-ID', {day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'})} WIB</p>
            <p className="text-sm font-medium text-black mt-1">Total Paket: {filteredItems.length} | Kurir / Ekspedisi: ___________________</p>
          </div>

          {/* CONTROL PANEL TABEL */}
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white print:hidden">
            <div className="flex items-center gap-3">
              <Filter size={16} className="text-slate-400" />
              <div className="flex gap-2">
                <button onClick={() => setFilterStatus("SEMUA")} className={`text-[11px] font-bold px-4 py-1.5 rounded-full transition-colors ${filterStatus === "SEMUA" ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50"}`}>Semua</button>
                <button onClick={() => setFilterStatus("SIAP DIKIRIM")} className={`text-[11px] font-bold px-4 py-1.5 rounded-full transition-colors ${filterStatus === "SIAP DIKIRIM" ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50"}`}>Gudang (Siap Kirim)</button>
                <button onClick={() => setFilterStatus("PROSES")} className={`text-[11px] font-bold px-4 py-1.5 rounded-full transition-colors ${filterStatus === "PROSES" ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50"}`}>Ekspedisi (Proses)</button>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button onClick={handleSyncStatus} disabled={isSyncing || manifestItems.length === 0} className="text-[11px] font-bold flex items-center gap-2 text-white bg-slate-800 px-5 py-2.5 rounded-lg hover:bg-slate-900 transition-colors disabled:opacity-50">
                <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} /> 
                {isSyncing ? "Menarik Data API..." : "Update Status Ekspedisi"}
              </button>
              <button onClick={() => window.print()} disabled={manifestItems.length === 0} className="text-[11px] font-bold flex items-center gap-2 text-slate-700 bg-white border border-slate-200 shadow-sm px-5 py-2.5 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
                <Printer size={14} /> Cetak Handover
              </button>
            </div>
          </div>

          {/* TABEL */}
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left border-collapse print:text-black">
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
                {filteredItems.length > 0 ? (
                  filteredItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors group print:border-b print:border-slate-300">
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

        <footer className="pt-4 pb-8 flex justify-between items-center text-[10px] text-slate-400 font-medium print:hidden">
          <p>© 2024 Sistem Gudang Internal. All rights reserved.</p>
          <p>v2.1.0</p>
        </footer>
        
      </main>

      {/* MODAL HISTORI TRACING */}
      {isModalOpen && trackingItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
            
            <div className="p-6 flex-1 overflow-y-auto">
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

              <h3 className="text-sm font-bold text-slate-800 mb-4">Timeline Detail</h3>
              
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
                  <p className="text-sm font-medium text-slate-500">Belum ada riwayat perjalanan atau resi tidak valid.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}