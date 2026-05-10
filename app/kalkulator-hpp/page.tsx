"use client";

import { useState } from "react";
import { 
  Calculator, Package, Store, Save, RefreshCcw, DollarSign, 
  ShoppingBag, ClipboardList, TrendingUp
} from "lucide-react";

export default function KalkulatorHPPPage() {
  // STATE INPUT FORM
  const [platform, setPlatform] = useState("Shopee");
  const [namaProduk, setNamaProduk] = useState("");
  const [hargaBeli, setHargaBeli] = useState<number | "">("");
  const [biayaKemasan, setBiayaKemasan] = useState<number | "">("");
  const [biayaKaryawan, setBiayaKaryawan] = useState<number | "">("");
  const [biayaAdmin, setBiayaAdmin] = useState<number | "">(""); // Estimasi fee platform
  const [biayaIklan, setBiayaIklan] = useState<number | "">(""); // Khusus Iklan Shopee/TikTok
  const [biayaLain, setBiayaLain] = useState<number | "">("");

  // STATE HISTORY
  const [history, setHistory] = useState<any[]>([]);

  // LOGIKA PERHITUNGAN
  const totalHPP = (Number(hargaBeli) || 0) + (Number(biayaKemasan) || 0) + (Number(biayaKaryawan) || 0) + (Number(biayaAdmin) || 0) + (Number(biayaIklan) || 0) + (Number(biayaLain) || 0);
  const saranHargaJual = totalHPP > 0 ? totalHPP + (totalHPP * 0.3) : 0; // Margin 30% standar
  const potensiKeuntungan = saranHargaJual - totalHPP;

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);
  };

  const handleReset = () => {
    setNamaProduk(""); setHargaBeli(""); setBiayaKemasan(""); 
    setBiayaKaryawan(""); setBiayaAdmin(""); setBiayaIklan(""); setBiayaLain("");
  };

  const handleSaveToHistory = () => {
    if (!namaProduk || totalHPP === 0) return alert("Nama produk dan biaya tidak boleh kosong!");
    const newRecord = {
      id: Date.now(),
      date: new Date().toLocaleDateString('id-ID'),
      platform,
      namaProduk,
      totalHPP,
      saranHargaJual
    };
    setHistory([newRecord, ...history]);
    handleReset();
  };

  return (
    <main className="flex-1 p-8 bg-slate-50 min-h-screen text-slate-800">
      {/* HEADER */}
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Calculator size={24} className="text-blue-600" /> Kalkulator HPP
        </h2>
        <p className="text-slate-500 text-sm mt-1">Hitung Harga Pokok Penjualan agar tidak boncos saat jualan di marketplace.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* KOLOM KIRI: FORM INPUT */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 border-b pb-3 mb-5 flex items-center gap-2">
              <Package size={18} className="text-slate-400" /> Detail Produk & Platform
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Platform Penjualan</label>
                <div className="relative">
                  <Store size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select 
                    value={platform} 
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                  >
                    <option value="Shopee">Shopee</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Tokopedia">Tokopedia</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Nama Produk</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Kaos Polos L"
                  value={namaProduk}
                  onChange={(e) => setNamaProduk(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <h3 className="font-bold text-slate-800 border-b pb-3 mt-8 mb-5 flex items-center gap-2">
              <DollarSign size={18} className="text-slate-400" /> Rincian Biaya (Rp)
            </h3>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-slate-600 w-1/3">Harga Beli / Produksi</label>
                <input type="number" placeholder="0" value={hargaBeli} onChange={(e) => setHargaBeli(Number(e.target.value))} className="w-2/3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-slate-600 w-1/3">Biaya Kemasan (Plastik/Lakban)</label>
                <input type="number" placeholder="0" value={biayaKemasan} onChange={(e) => setBiayaKemasan(Number(e.target.value))} className="w-2/3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-slate-600 w-1/3">Biaya Tenaga Kerja per Item</label>
                <input type="number" placeholder="0" value={biayaKaryawan} onChange={(e) => setBiayaKaryawan(Number(e.target.value))} className="w-2/3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-slate-600 w-1/3">Fee Admin Platform (Shopee/TikTok)</label>
                <input type="number" placeholder="0" value={biayaAdmin} onChange={(e) => setBiayaAdmin(Number(e.target.value))} className="w-2/3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-slate-600 w-1/3">Biaya Iklan per Item (Ads)</label>
                <input type="number" placeholder="0" value={biayaIklan} onChange={(e) => setBiayaIklan(Number(e.target.value))} className="w-2/3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-slate-600 w-1/3">Biaya Lain-lain (Opsional)</label>
                <input type="number" placeholder="0" value={biayaLain} onChange={(e) => setBiayaLain(Number(e.target.value))} className="w-2/3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={handleReset} className="w-1/3 py-2.5 border border-slate-200 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-50 flex justify-center items-center gap-2 transition-all">
                <RefreshCcw size={16} /> Reset
              </button>
              <button onClick={handleSaveToHistory} className="w-2/3 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 flex justify-center items-center gap-2 transition-all shadow-sm">
                <Save size={16} /> Simpan ke Riwayat
              </button>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN: HASIL & RIWAYAT */}
        <div className="lg:col-span-5 space-y-6">
          {/* KARTU HASIL HPP */}
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl text-white">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total HPP per Item</p>
            <h1 className="text-4xl font-black text-white tracking-tight mb-6">{formatRupiah(totalHPP)}</h1>
            
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Rekomendasi Harga Jual (Margin 30%)</span>
                <span className="font-bold text-emerald-400">{formatRupiah(saranHargaJual)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Potensi Keuntungan Bersih</span>
                <span className="font-bold text-blue-400">+{formatRupiah(potensiKeuntungan)}</span>
              </div>
            </div>
          </div>

          {/* KARTU RIWAYAT PERHITUNGAN */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[400px] flex flex-col">
            <h3 className="font-bold text-slate-800 border-b pb-3 mb-4 flex items-center gap-2">
              <ClipboardList size={18} className="text-slate-400" /> Riwayat HPP
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {history.length > 0 ? (
                history.map((item) => (
                  <div key={item.id} className="p-4 bg-slate-50 border border-slate-100 rounded-lg hover:border-blue-200 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{item.namaProduk}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{item.date}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.platform === 'Shopee' ? 'bg-orange-100 text-orange-600' : 
                        item.platform === 'TikTok' ? 'bg-slate-200 text-black' : 
                        'bg-emerald-100 text-emerald-600'
                      }`}>
                        {item.platform}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200/60">
                      <span className="text-xs text-slate-500 font-medium">HPP: <span className="text-slate-900 font-bold">{formatRupiah(item.totalHPP)}</span></span>
                      <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                        <TrendingUp size={12}/> Jual: {formatRupiah(item.saranHargaJual)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 opacity-60">
                  <Calculator size={32} />
                  <p className="text-xs font-medium">Belum ada riwayat perhitungan.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}