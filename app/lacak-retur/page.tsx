"use client";

import React, { useState } from "react";
import { 
  Search, Package, Truck, CheckCircle2, AlertTriangle, 
  MapPin, Clock, Box, RefreshCcw, ShieldAlert
} from "lucide-react";

export default function LacakReturPage() {
  const [resi, setResi] = useState("");
  const [kurir, setKurir] = useState("spx");
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState<any | null>(null);

  // FUNGSI CEK RESI REAL-TIME API BINDERBYTE
  const handleCekResi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resi) return alert("Masukkan nomor resi!");
    
    setLoading(true);
    setTrackingData(null);
    
    try {
      // Ambil API Key dari .env.local
      const apiKey = process.env.NEXT_PUBLIC_BINDERBYTE_API_KEY;
      
      if (!apiKey) {
        alert("API Key BinderByte belum dikonfigurasi di file .env.local!");
        setLoading(false);
        return;
      }

      const response = await fetch(`https://api.binderbyte.com/v1/track?api_key=${apiKey}&courier=${kurir}&awb=${resi}`);
      const result = await response.json();

      if (result.status === 200) {
        const data = result.data;
        
        // Memetakan data riwayat perjalanan paket
        const historyMapped = data.history.map((hist: any, index: number) => {
          let icon = <MapPin className="text-slate-500" size={20}/>;
          let color = "bg-slate-100 border-slate-200";
          let descLower = hist.desc.toLowerCase();

          if (index === 0 && data.summary.status.toLowerCase() === "delivered") {
            icon = <CheckCircle2 className="text-emerald-500" size={20}/>;
            color = "bg-emerald-100 border-emerald-200";
          } else if (descLower.includes("kurir") || descLower.includes("menuju") || descLower.includes("dikirim")) {
            icon = <Truck className="text-blue-500" size={20}/>;
            color = "bg-blue-100 border-blue-200";
          } else if (descLower.includes("gagal") || descLower.includes("tolak") || descLower.includes("kembali") || descLower.includes("retur")) {
            icon = <AlertTriangle className="text-red-500" size={20}/>;
            color = "bg-red-100 border-red-200";
          } else if (descLower.includes("drop") || descLower.includes("diserahkan") || descLower.includes("diterima")) {
            icon = <Package className="text-indigo-500" size={20}/>;
            color = "bg-indigo-100 border-indigo-200";
          }

          return {
            date: hist.date,
            desc: hist.desc,
            icon,
            color
          };
        });

        setTrackingData({
          status: data.summary.status,
          kurir: data.summary.courier,
          resi: data.summary.awb,
          pembeli: data.detail.receiver || "Tidak Diketahui",
          asal: data.detail.origin || "Tidak Diketahui",
          tujuan: data.detail.destination || "Tidak Diketahui",
          tanggal_retur: data.summary.date,
          history: historyMapped
        });

      } else {
        alert(`Gagal melacak: ${result.message || "Resi tidak ditemukan atau belum update."}`);
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan sistem saat menghubungi server ekspedisi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 p-8 bg-[#F8FAFC] min-h-screen font-sans text-slate-800">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <ShieldAlert className="text-red-500" size={32} /> Lacak Paket Retur / RTS
        </h1>
        <p className="text-[15px] text-slate-500 mt-2 font-medium">
          Lacak status pengembalian barang (Return to Sender) secara real-time langsung dari database Ekspedisi.
        </p>
      </div>

      {/* SEARCH CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8 max-w-4xl">
        <form onSubmit={handleCekResi} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Nomor Resi (AWB)</label>
            <div className="relative">
              <Box className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Contoh: SPXID029384729" 
                value={resi}
                onChange={(e) => setResi(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[15px] font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all uppercase"
              />
            </div>
          </div>
          
          <div className="md:w-64">
            <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Pilih Ekspedisi</label>
            <select 
              value={kurir}
              onChange={(e) => setKurir(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[15px] font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none"
            >
              <option value="spx">Shopee Express (SPX)</option>
              <option value="jnt">J&T Express</option>
              <option value="sicepat">SiCepat Ekspres</option>
              <option value="jne">JNE</option>
              <option value="ninja">Ninja Xpress</option>
              <option value="anteraja">AnterAja</option>
              <option value="idexpress">ID Express</option>
            </select>
          </div>

          <div className="flex items-end">
            <button 
              type="submit"
              disabled={loading}
              className="w-full md:w-auto h-[50px] px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-200 transition-all disabled:opacity-50"
            >
              {loading ? <RefreshCcw className="animate-spin" size={20}/> : <Search size={20}/>}
              {loading ? "Melacak..." : "Lacak Paket"}
            </button>
          </div>
        </form>
      </div>

      {/* TRACKING RESULT AREA */}
      {trackingData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl animate-in slide-in-from-bottom-5 duration-500">
          
          {/* INFO KIRI */}
          <div className="lg:col-span-4 space-y-6">
            {/* Status Utama */}
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute right-[-10px] top-[-10px] opacity-10"><AlertTriangle size={120} /></div>
              <span className="bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-4 inline-block shadow-sm">Status Paket</span>
              <h2 className="text-3xl font-black text-red-700 leading-tight mb-1">RETUR / RTS</h2>
              <p className="text-sm font-medium text-red-600 mt-2">Paket Gagal Kirim / Ditolak Pembeli.</p>
            </div>

            {/* Detail Info */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">No. Resi</p>
                <p className="font-bold text-slate-800 text-[16px]">{trackingData.resi} <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[11px] ml-2">{trackingData.kurir}</span></p>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nama Pembeli</p>
                <p className="font-bold text-slate-800">{trackingData.pembeli}</p>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Rute</p>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin size={16} className="text-slate-400" />
                  <span className="font-bold text-slate-700">{trackingData.asal}</span>
                </div>
                <div className="w-0.5 h-4 bg-slate-200 ml-2 my-1"></div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-slate-400" />
                  <span className="font-bold text-slate-700">{trackingData.tujuan}</span>
                </div>
              </div>
            </div>
          </div>

          {/* TIMELINE KANAN */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 mb-8 border-b border-slate-100 pb-4 flex items-center gap-2">
              <Clock className="text-indigo-500" /> Riwayat Perjalanan Paket
            </h3>
            
            <div className="relative border-l-2 border-slate-100 ml-4 space-y-8">
              {trackingData.history.map((hist: any, index: number) => (
                <div key={index} className="relative pl-8">
                  {/* Ikon Lingkaran Timeline */}
                  <div className={`absolute -left-[17px] top-0 w-8 h-8 rounded-full border-4 flex items-center justify-center bg-white ${hist.color}`}>
                    {React.cloneElement(hist.icon, { size: 14 })}
                  </div>
                  
                  {/* Konten Timeline */}
                  <div className={`p-4 rounded-xl border ${index === 0 ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-white border-slate-100'}`}>
                    <span className="text-[12px] font-bold text-slate-400 tracking-wide block mb-1.5">{hist.date}</span>
                    <p className={`text-[14px] font-medium leading-relaxed ${index === 0 ? 'text-slate-900 font-bold' : 'text-slate-600'}`}>
                      {hist.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </main>
  );
}