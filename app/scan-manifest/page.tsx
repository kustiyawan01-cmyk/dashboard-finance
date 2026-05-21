"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Package, Truck, CheckCircle2, AlertTriangle, 
  Search, Eye, Clock, ScanLine, 
  ChevronRight, AlertCircle, Info, Printer, Box
} from "lucide-react";

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
  const [notification, setNotification] = useState<Message>({ type: "", text: "Pilih kurir dan mulai scan resi." });
  const [isSaving, setIsSaving] = useState(false);
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

  // 2. Deteksi otomatis ekspedisi dari pola nomor resi
  const detectCourier = (resi: string) => {
    if (resi.startsWith("SPX")) return "SPX Express";
    if (resi.startsWith("JX") || resi.startsWith("JP")) return "J&T Express";
    if (resi.startsWith("ID")) return "ID Express";
    if (resi.startsWith("TGR")) return "TGR";
    return "Lainnya";
  };

  // 3. Simulasi otomatis pembuatan OrderID & Kota Tujuan dari marketplace saat di-scan
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
      setNotification({ type: "warning", text: `DUPLIKAT: Resi ${resi} sudah terdata di database!` });
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
      status: "HANDOVER KURIR",
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
        setNotification({ type: "success", text: `SUKSES: Resi ${resi} berhasil disimpan permanen ke Neon DB.` });
        playSound('success');
        fetchManifestData(); // Segarkan isi tabel & grafik statistik
      } else {
        throw new Error();
      }
    } catch (error) {
      setNotification({ type: "error", text: "ERROR: Gagal terhubung ke server database Neon!" });
      playSound('error');
    } finally {
      setIsSaving(false);
      setScanInput("");
      inputRef.current?.focus();
    }
  };

  // 5. Menghitung statistik kurir secara otomatis dari data asli database
  const realStats = useMemo(() => {
    const counts: Record<string, number> = { "SPX Express": 0, "J&T Express": 0, "ID Express": 0, "TGR": 0, "Lainnya": 0 };
    manifestItems.forEach(item => {
      if (counts[item.expedition] !== undefined) {
        counts[item.expedition]++;
      } else {
        counts["Lainnya"]++;
      }
    });
    return counts;
  }, [manifestItems]);

  const StatusBadge = ({ status }: { status: string }) => {
    return (
      <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded border bg-emerald-50 text-emerald-600 border-emerald-200">
        {status}
      </span>
    );
  };

  return (
    <main className="min-h-screen bg-slate-100/50 p-4 md:p-6 font-sans text-slate-800">
      
      {/* CARD METRIK UTAMA */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-500"><Package size={24} /></div>
          <div>
            <p className="text-xs font-bold text-slate-500 mb-0.5">Belum Scan</p>
            <h3 className="text-2xl font-black text-slate-800 leading-none">0</h3>
            <p className="text-[10px] text-slate-400 mt-1">Data Realtime</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg text-blue-500"><Box size={24} /></div>
          <div>
            <p className="text-xs font-bold text-slate-500 mb-0.5">Ready to Ship</p>
            <h3 className="text-2xl font-black text-slate-800 leading-none">0</h3>
            <p className="text-[10px] text-slate-400 mt-1">Siap dikirim</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-500"><Truck size={24} /></div>
          <div>
            <p className="text-xs font-bold text-slate-500 mb-0.5">Handover Kurir</p>
            <h3 className="text-2xl font-black text-slate-800 leading-none">{manifestItems.length}</h3>
            <p className="text-[10px] text-slate-400 mt-1">Total di Database</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 rounded-lg text-purple-500"><CheckCircle2 size={24} /></div>
          <div>
            <p className="text-xs font-bold text-slate-500 mb-0.5">Sudah Pickup</p>
            <h3 className="text-2xl font-black text-slate-800 leading-none">{manifestItems.length}</h3>
            <p className="text-[10px] text-slate-400 mt-1">Telah diserahterimakan</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-lg text-red-500"><AlertTriangle size={24} /></div>
          <div>
            <p className="text-xs font-bold text-slate-500 mb-0.5">Bermasalah</p>
            <h3 className="text-2xl font-black text-slate-800 leading-none">0</h3>
            <p className="text-[10px] text-slate-400 mt-1">Aman</p>
          </div>
        </div>
      </div>

      {/* AREA UTAMA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        
        {/* KIRI: AREA SCANNER BARCODE */}
        <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6">
          <div className="flex-1 border-r md:border-slate-100 md:pr-6">
            <h2 className="text-base font-bold text-slate-800 mb-1">Scan Resi / Outbound</h2>
            <p className="text-xs text-slate-500 mb-4">Arahkan scanner ke resi paket setelah packing selesai</p>
            
            <div className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-xl p-6 flex flex-col items-center justify-center text-center mb-4">
              <ScanLine size={48} className="text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-700 mb-1">Scan barcode di sini</p>
              <p className="text-xs text-slate-400">Gunakan scanner otomatis alfa</p>
            </div>

            <form onSubmit={handleScanSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                disabled={isSaving}
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder={isSaving ? "Menyimpan ke Neon DB..." : "Input manual nomor resi atau scan..."}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none uppercase font-bold"
              />
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors">
                Kirim
              </button>
            </form>
            
            {notification.text && (
              <p className={`text-xs font-bold mt-3 flex items-center gap-1.5 ${notification.type === 'success' ? 'text-emerald-600 bg-emerald-50 border border-emerald-200 p-2 rounded-lg' : 'text-amber-600 bg-amber-50 border border-amber-200 p-2 rounded-lg'}`}>
                {notification.text}
              </p>
            )}
          </div>

          {/* INFORMASI TERAKHIR DI SCAN */}
          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-base font-bold text-slate-800">Informasi Terakhir</h2>
              {lastScanned && <StatusBadge status={lastScanned.status} />}
            </div>

            {lastScanned ? (
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-sm border-b pb-1.5">
                    <span className="text-slate-500">No. Resi</span>
                    <span className="col-span-2 font-black text-indigo-700">{lastScanned.resi}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm border-b pb-1.5">
                    <span className="text-slate-500">Order ID</span>
                    <span className="col-span-2 font-bold text-slate-800">{lastScanned.orderId}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm border-b pb-1.5">
                    <span className="text-slate-500">Ekspedisi</span>
                    <span className="col-span-2 font-semibold text-slate-700">{lastScanned.expedition}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm border-b pb-1.5">
                    <span className="text-slate-500">Tujuan</span>
                    <span className="col-span-2 font-semibold text-slate-700">{lastScanned.tujuan}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span className="text-slate-500">Waktu Scan</span>
                    <span className="col-span-2 font-medium text-slate-600" suppressHydrationWarning>{lastScanned.scannedAt.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed">
                <Box size={36} className="mb-2 opacity-30" />
                <p className="text-xs font-semibold">Belum ada paket yang di-scan pada sesi ini</p>
              </div>
            )}
          </div>
        </div>

        {/* KANAN: PERINGATAN & STATISTIK REAL */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 mb-4">Peringatan Berkas</h2>
            <div className="space-y-4">
              <div className="flex gap-3 items-start">
                <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-700 font-bold">Sinkronisasi Otomatis Terhubung</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Setiap hasil pemindaian langsung diamankan ke database Neon.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex-1">
            <h2 className="text-base font-bold text-slate-800 mb-4">Statistik Hasil Scan Asli</h2>
            
            <div className="border-t border-slate-100 pt-3">
              <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Performa Ekspedisi Terbanyak (Asli DB)</h3>
              <div className="space-y-3">
                {Object.entries(realStats).map(([key, val]) => {
                  const percentage = manifestItems.length > 0 ? (val / manifestItems.length) * 100 : 0;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-[10px] font-bold w-24 text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-center truncate">{key}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                      </div>
                      <span className="text-xs font-bold text-slate-600 w-8 text-right">{val}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABEL DATA ASLI DARI DATABASE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-base font-bold text-slate-800">Semua Aktivitas Tersimpan di Database Neon</h2>
            <p className="text-xs text-slate-400 mt-0.5">Menampilkan seluruh riwayat pengiriman paket yang sudah valid</p>
          </div>
          <button onClick={() => window.print()} disabled={manifestItems.length === 0} className="text-xs font-bold flex items-center gap-1.5 text-white bg-emerald-600 px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50">
            <Printer size={14} /> Cetak Lembar Manifest Resmi
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">No. Resi</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ekspedisi</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status Database</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Waktu Pemindaian</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {manifestItems.length > 0 ? (
                manifestItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3.5 text-sm font-black text-indigo-700 tracking-wide">{item.resi}</td>
                    <td className="px-6 py-3.5 text-sm font-mono text-slate-600">{item.orderId || "-"}</td>
                    <td className="px-6 py-3.5 text-sm font-bold text-slate-700">{item.expedition}</td>
                    <td className="px-6 py-3.5">
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold uppercase tracking-wider">
                        {item.status || "DISERAHKAN KE KURIR"}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-slate-500" suppressHydrationWarning>
                      {new Date(item.scannedAt).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-slate-500 font-medium">{item.operator || "Admin Gudang"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm font-medium text-slate-400 bg-slate-50/30">
                    <Box size={32} className="mx-auto mb-2 opacity-30 text-slate-400" />
                    Belum ada data di database Neon. Silakan lakukan pemindaian resi pertama Anda di atas!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </main>
  );
}