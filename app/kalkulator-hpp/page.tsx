"use client";

import { useState } from "react";
import { 
  Calculator, Package, Store, Save, RefreshCcw, DollarSign, 
  ClipboardList, TrendingUp, Percent, Tag, Activity, Truck, Users, Target
} from "lucide-react";

export default function KalkulatorHPPPage() {
  // STATE INPUT PRODUK & PLATFORM
  const [platform, setPlatform] = useState("TikTok");
  const [namaProduk, setNamaProduk] = useState("");
  
  // STATE INPUT HPP PRODUK (MODAL)
  const [hargaBeli, setHargaBeli] = useState<number | "">("");
  const [biayaKemasan, setBiayaKemasan] = useState<number | "">("");
  const [biayaKaryawan, setBiayaKaryawan] = useState<number | "">("");
  const [biayaLain, setBiayaLain] = useState<number | "">("");
  
  // STATE INPUT PENJUALAN & PROMOSI
  const [hargaJual, setHargaJual] = useState<number | "">(""); // Harga Etalase / Subtotal
  const [diskonPenjual, setDiskonPenjual] = useState<number | "">(""); // Voucher / Diskon Coret
  
  // STATE INPUT POTONGAN & TARGET
  const [komisiAffiliatePersen, setKomisiAffiliatePersen] = useState<number | "">(""); 
  const [ongkirPenjual, setOngkirPenjual] = useState<number | "">(""); 
  const [biayaIklan, setBiayaIklan] = useState<number | "">(""); 
  const [targetProfitPersen, setTargetProfitPersen] = useState<number | "">(25); // Default 25%

  // STATE HISTORY
  const [history, setHistory] = useState<any[]>([]);

  // LOGIKA PERSENTASE ADMIN PLATFORM
  const getAdminFeePercent = (plat: string) => {
    switch(plat) {
      case "TikTok": return 8.0; 
      case "Shopee": return 8.5; 
      case "Tokopedia": return 6.5; 
      case "Lainnya": return 0;
      default: return 8.0;
    }
  };

  const adminPercent = getAdminFeePercent(platform);

  // KONVERSI INPUT KE ANGKA
  const numHargaBeli = Number(hargaBeli) || 0;
  const numKemasan = Number(biayaKemasan) || 0;
  const numKaryawan = Number(biayaKaryawan) || 0;
  const numLain = Number(biayaLain) || 0;
  
  const numHargaJual = Number(hargaJual) || 0; 
  const numDiskon = Number(diskonPenjual) || 0; 
  
  const numAffiliatePersen = Number(komisiAffiliatePersen) || 0;
  const numOngkirPenjual = Number(ongkirPenjual) || 0;
  const numIklan = Number(biayaIklan) || 0;
  const numTargetProfit = Number(targetProfitPersen) || 0;

  // ---------------------------------------------------------
  // 1. ANALISIS KONDISI SAAT INI (REALITA)
  // ---------------------------------------------------------
  const totalHPP = numHargaBeli + numKemasan + numKaryawan + numLain;
  const totalPendapatan = numHargaJual > 0 ? numHargaJual - numDiskon : 0;
  
  const biayaPlatformRp = totalPendapatan > 0 ? (totalPendapatan * adminPercent) / 100 : 0;
  const biayaAffiliateRp = totalPendapatan > 0 ? (totalPendapatan * numAffiliatePersen) / 100 : 0;
  const totalPotongan = biayaPlatformRp + biayaAffiliateRp + numOngkirPenjual;

  const danaDiselesaikan = totalPendapatan > 0 ? totalPendapatan - totalPotongan : 0;
  const labaBersihSaatIni = danaDiselesaikan > 0 ? danaDiselesaikan - totalHPP - numIklan : (totalHPP > 0 ? -totalHPP : 0);
  const marginSaatIniPersen = totalPendapatan > 0 ? (labaBersihSaatIni / totalPendapatan) * 100 : 0;

  // ---------------------------------------------------------
  // 2. PERHITUNGAN REKOMENDASI (TARGET AMAN)
  // ---------------------------------------------------------
  // Rumus: Harga Minimal Aktual = (HPP + Fix Cost) / (1 - %PotonganPlatform - %PotonganAffiliate - %TargetProfit)
  const totalPersenPotongan = adminPercent + numAffiliatePersen;
  const pembagiAman = 1 - ((totalPersenPotongan + numTargetProfit) / 100);
  
  // Mencegah error jika total persentase potongan + profit >= 100%
  const hargaJualAmanAktual = pembagiAman > 0 
    ? (totalHPP + numOngkirPenjual + numIklan) / pembagiAman 
    : 0;

  // Harga Etalase (Coret) = Harga Aman Aktual + Rencana Diskon Penjual
  const hargaJualAmanEtalase = hargaJualAmanAktual > 0 ? hargaJualAmanAktual + numDiskon : 0;

  // FORMATTER
  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Math.round(angka));
  };

  // HANDLERS
  const handleReset = () => {
    setNamaProduk(""); setHargaBeli(""); setBiayaKemasan(""); setBiayaKaryawan(""); 
    setBiayaLain(""); setHargaJual(""); setDiskonPenjual(""); setKomisiAffiliatePersen(""); 
    setOngkirPenjual(""); setBiayaIklan(""); setTargetProfitPersen(25);
  };

  const handleSaveToHistory = () => {
    if (!namaProduk || totalHPP === 0) return alert("Nama produk dan modal wajib diisi!");
    const newRecord = {
      id: Date.now(),
      date: new Date().toLocaleDateString('id-ID'),
      platform,
      namaProduk,
      totalHPP,
      hargaJualAmanEtalase,
      targetProfit: numTargetProfit
    };
    setHistory([newRecord, ...history]);
    // Jangan reset semua agar bisa membandingkan produk lain dengan skema yang sama
    setNamaProduk(""); 
  };

  return (
    <main className="flex-1 p-6 md:p-10 bg-[#0B0F19] min-h-screen text-slate-200 relative overflow-hidden font-sans">
      
      {/* Background Neon Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none"></div>

      {/* HEADER */}
      <header className="mb-10 relative z-10 flex flex-col items-center md:items-start">
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 tracking-tight flex items-center gap-3 drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]">
          <Calculator size={32} className="text-cyan-400" /> PRO Pricing Strategy
        </h2>
        <p className="text-slate-400 text-sm mt-2 font-medium">Kalkulasi modal, simulasi mutasi, dan rekomendasi harga anti-boncos.</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 relative z-10">
        
        {/* KOLOM KIRI: FORM INPUT */}
        <div className="xl:col-span-7 space-y-6">
          
          {/* BAGIAN 1: INFO PRODUK & MODAL */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
            <h3 className="font-bold text-cyan-400 border-b border-white/10 pb-3 mb-5 flex items-center gap-2">
              <Package size={18} /> 1. Detail Produk & HPP Dasar
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Platform</label>
                <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-cyan-500/50 outline-none">
                  <option value="TikTok" className="bg-slate-900">TikTok Shop (Est. 8.0%)</option>
                  <option value="Shopee" className="bg-slate-900">Shopee (Est. 8.5%)</option>
                  <option value="Tokopedia" className="bg-slate-900">Tokopedia (Est. 6.5%)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Nama Produk</label>
                <input type="text" value={namaProduk} onChange={(e) => setNamaProduk(e.target.value)} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-cyan-500/50 outline-none" placeholder="Contoh: Lampu LED Dashboard" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Harga Beli / Produksi (Rp)</label>
                <input type="number" value={hargaBeli} onChange={(e) => setHargaBeli(Number(e.target.value))} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-cyan-500/50 outline-none" placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Biaya Kemasan & Ops (Rp)</label>
                <input type="number" value={biayaKemasan} onChange={(e) => setBiayaKemasan(Number(e.target.value))} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-cyan-500/50 outline-none" placeholder="0" />
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-cyan-950/30 border border-cyan-800/50 rounded-lg flex justify-between items-center">
              <span className="text-sm font-semibold text-cyan-200">Total HPP Dasar</span>
              <span className="text-lg font-bold text-cyan-400">{formatRupiah(totalHPP)}</span>
            </div>
          </div>

          {/* BAGIAN 2: SIMULASI PESANAN SAAT INI */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
            <h3 className="font-bold text-slate-200 border-b border-white/10 pb-3 mb-5 flex items-center gap-2">
              <Activity size={18} className="text-emerald-400" /> 2. Simulasi Transaksi (Realita)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Harga Jual Normal / Coret (Rp)</label>
                <input type="number" value={hargaJual} onChange={(e) => setHargaJual(Number(e.target.value))} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white font-bold focus:ring-2 focus:ring-emerald-500/50 outline-none" placeholder="Subtotal pesanan" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Diskon dari Penjual (Rp)</label>
                <input type="number" value={diskonPenjual} onChange={(e) => setDiskonPenjual(Number(e.target.value))} className="w-full px-4 py-2.5 bg-rose-500/5 border border-rose-900/50 rounded-lg text-sm text-white focus:ring-2 focus:ring-rose-500/50 outline-none" placeholder="Voucher toko" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 flex items-center gap-1"><Users size={12}/> Komisi Affiliate (%)</label>
                <input type="number" value={komisiAffiliatePersen} onChange={(e) => setKomisiAffiliatePersen(Number(e.target.value))} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-rose-500/50 outline-none" placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 flex items-center gap-1"><Truck size={12}/> Biaya Ongkir Penjual (Rp)</label>
                <input type="number" value={ongkirPenjual} onChange={(e) => setOngkirPenjual(Number(e.target.value))} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-rose-500/50 outline-none" placeholder="0" />
              </div>
            </div>
            
            {numHargaJual > 0 && (
              <div className="mt-5 pt-4 border-t border-white/5 flex justify-between items-center">
                <span className="text-sm text-slate-400">Laba Bersih Transaksi Ini:</span>
                <span className={`text-lg font-black ${labaBersihSaatIni >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {labaBersihSaatIni >= 0 ? '+' : ''}{formatRupiah(labaBersihSaatIni)}
                </span>
              </div>
            )}
          </div>

          {/* BAGIAN 3: TARGET PROFIT BARU */}
          <div className="bg-gradient-to-br from-indigo-900/40 to-blue-900/40 backdrop-blur-xl border border-indigo-500/30 p-6 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
            <h3 className="font-bold text-indigo-300 border-b border-indigo-500/30 pb-3 mb-5 flex items-center gap-2">
              <Target size={18} /> 3. Set Target Profit & Harga Aman
            </h3>

            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <label className="text-sm font-medium text-slate-200 w-full md:w-1/2">
                Target Profit Bersih yang Diinginkan
                <p className="text-xs text-slate-400 mt-1 font-normal">Persentase dari harga bayar pembeli.</p>
              </label>
              <div className="w-full md:w-1/2 relative">
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-300 font-bold">%</span>
                <input 
                  type="number" 
                  value={targetProfitPersen} 
                  onChange={(e) => setTargetProfitPersen(Number(e.target.value))} 
                  className="w-full px-4 py-3 bg-black/30 border border-indigo-500/50 rounded-xl text-lg text-white font-black text-center focus:ring-2 focus:ring-indigo-400 outline-none transition-all" 
                />
              </div>
            </div>

            {/* BUTTONS */}
            <div className="flex gap-4 mt-8">
              <button onClick={handleReset} className="w-1/3 py-3 bg-white/5 border border-white/10 text-slate-300 rounded-xl font-bold text-sm hover:bg-white/10 transition-all">
                Reset
              </button>
              <button onClick={handleSaveToHistory} className="w-2/3 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold text-sm hover:from-indigo-500 hover:to-blue-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)]">
                Simpan Target
              </button>
            </div>
          </div>

        </div>

        {/* KOLOM KANAN: HASIL REKOMENDASI AI */}
        <div className="xl:col-span-5 space-y-6">
          
          {/* PANEL FORMULA HARGA AMAN */}
          <div className="bg-gradient-to-b from-slate-900 to-black p-1 rounded-2xl shadow-2xl relative">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-cyan-400 via-indigo-500 to-purple-600 rounded-2xl blur opacity-30 animate-pulse pointer-events-none"></div>
            
            <div className="bg-[#0B0F19] p-6 rounded-xl relative z-10 h-full">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                  <Target size={20} className="text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-black text-white text-lg tracking-tight">Rekomendasi Harga Jual</h3>
                  <p className="text-xs text-indigo-300">Formula Aman Net Profit {numTargetProfit}%</p>
                </div>
              </div>

              {pembagiAman <= 0 ? (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-center">
                  <p className="text-sm font-bold text-rose-400">Target Tidak Masuk Akal!</p>
                  <p className="text-xs text-rose-300/70 mt-1">Total potongan ({totalPersenPotongan}%) + target profit ({numTargetProfit}%) melebihi atau sama dengan 100%.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="p-5 bg-white/5 border border-white/10 rounded-xl">
                    <p className="text-xs text-slate-400 uppercase tracking-widest mb-1 font-semibold">1. Harga Minimal Aktual</p>
                    <p className="text-xs text-slate-500 mb-3">Harga bayar pembeli setelah diskon.</p>
                    <h2 className="text-3xl font-black text-emerald-400 tracking-tight">
                      {formatRupiah(hargaJualAmanAktual)}
                    </h2>
                  </div>

                  <div className="p-5 bg-indigo-950/30 border border-indigo-500/30 rounded-xl relative overflow-hidden">
                    <div className="absolute right-0 top-0 text-indigo-500/10 -mt-4 -mr-4">
                      <Tag size={100} />
                    </div>
                    <p className="text-xs text-indigo-300 uppercase tracking-widest mb-1 font-semibold">2. Harga Etalase (Coret)</p>
                    <p className="text-xs text-slate-400 mb-3">Ditambah rencana voucher <span className="text-rose-400">Rp {numDiskon.toLocaleString('id-ID')}</span></p>
                    <h2 className="text-4xl font-black text-white tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                      {formatRupiah(hargaJualAmanEtalase)}
                    </h2>
                  </div>

                  {/* PROOFING / PEMBUKTIAN */}
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-3 text-center tracking-wider">Pembuktian Rumus</p>
                    <div className="space-y-2 text-[11px] font-medium">
                      <div className="flex justify-between text-slate-400">
                        <span>Harga Dibayar Pembeli</span>
                        <span className="text-white">{formatRupiah(hargaJualAmanAktual)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Potongan Platform & Aff ({totalPersenPotongan}%)</span>
                        <span className="text-rose-400">- {formatRupiah(hargaJualAmanAktual * totalPersenPotongan / 100)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Beban Ongkir Penjual</span>
                        <span className="text-rose-400">- {formatRupiah(numOngkirPenjual)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400 border-b border-white/5 pb-2">
                        <span>Modal HPP Dasar</span>
                        <span className="text-rose-400">- {formatRupiah(totalHPP)}</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-indigo-300 font-bold">Net Profit Tepat {numTargetProfit}%</span>
                        <span className="text-emerald-400 font-black">{formatRupiah(hargaJualAmanAktual * numTargetProfit / 100)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIWAYAT */}
          <div className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] h-[250px] flex flex-col">
            <h3 className="font-bold text-slate-300 text-sm border-b border-white/10 pb-3 mb-3 flex items-center gap-2">
              <ClipboardList size={16} className="text-cyan-400" /> Draft Harga Etalase
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-white/10">
              {history.length > 0 ? (
                history.map((item) => (
                  <div key={item.id} className="p-3 bg-black/20 border border-white/5 rounded-lg flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-white text-xs">{item.namaProduk || "Produk"}</h4>
                      <p className="text-[10px] text-slate-500">HPP: {formatRupiah(item.totalHPP)} | Target: {item.targetProfit}%</p>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs font-black text-indigo-400">{formatRupiah(item.hargaJualAmanEtalase)}</span>
                      <span className="text-[9px] text-slate-500 uppercase bg-white/5 px-1.5 py-0.5 rounded">{item.platform}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                  <p className="text-xs">Belum ada target yang disimpan.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}