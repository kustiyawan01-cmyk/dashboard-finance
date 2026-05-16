"use client";

import React, { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import { 
  Search, Package, Truck, CheckCircle2, AlertTriangle, 
  MapPin, Clock, Box, RefreshCcw, ShieldAlert, Upload,
  Download, Filter, ChevronDown, CheckSquare, Eye, X
} from "lucide-react";

export default function LacakReturPage() {
  const [returData, setReturData] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [selectedResi, setSelectedResi] = useState<any | null>(null);
  const [trackingDetail, setTrackingDetail] = useState<any | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  useEffect(() => {
    const savedData = localStorage.getItem("returDataStore");
    if (savedData) {
      try {
        setReturData(JSON.parse(savedData));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (returData.length > 0) {
      localStorage.setItem("returDataStore", JSON.stringify(returData));
    }
  }, [returData]);

  // Format Tanggal ISO dari Biteship ke Format Lokal
  const formatDateBiteship = (isoString: string) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const summaryMetrics = useMemo(() => {
    let total = returData.length;
    let diterimaGudang = 0;
    let dalamPerjalanan = 0;
    let bermasalah = 0;
    let pending = 0;

    returData.forEach(item => {
      if (item.statusGudang === "DITERIMA") {
        diterimaGudang++;
      } else {
        const apiStat = (item.apiStatus || "").toLowerCase();
        if (apiStat.includes("delivered") || apiStat.includes("sukses") || apiStat.includes("selesai")) {
          dalamPerjalanan++; 
        } else if (apiStat.includes("picking") || apiStat.includes("dropping") || apiStat.includes("transit") || apiStat.includes("process") || apiStat.includes("perjalanan")) {
          dalamPerjalanan++;
        } else if (apiStat.includes("return") || apiStat.includes("reject") || apiStat.includes("gagal") || apiStat.includes("problem")) {
          bermasalah++;
        } else {
          pending++;
        }
      }
    });

    return { total, diterimaGudang, dalamPerjalanan, bermasalah, pending };
  }, [returData]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = (evt: any) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" });

        if (rows.length < 2) {
          setIsUploading(false);
          return;
        }

        const headers = Array.from(rows[0]).map(h => String(h).toLowerCase().trim());
        
        const iId = headers.findIndex(h => h.includes("order id") || h.includes("id pesanan"));
        const iResi = headers.findIndex(h => h.includes("resi") || h.includes("tracking id"));
        const iKurir = headers.findIndex(h => h.includes("kurir") || h.includes("shipping provider") || h.includes("logistik"));
        const iBuyer = headers.findIndex(h => h.includes("pembeli") || h.includes("buyer"));
        const iProduk = headers.findIndex(h => h.includes("produk") || h.includes("product name"));

        if (iId === -1 || iResi === -1) {
          alert("Format tidak dikenali. Pastikan ada kolom Order ID dan Resi.");
          setIsUploading(false);
          return;
        }

const newData: any[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row[iId] || !row[iResi]) continue;

          let rawResi = String(row[iResi]).trim();
          
          if (rawResi.toLowerCase().includes("tracking number") || rawResi.toLowerCase().includes("resi")) continue;

          let parsedKurir = "shopee"; 
          const rawKurir = iKurir !== -1 ? String(row[iKurir]).toLowerCase() : "";

          if (rawKurir.includes("j&t") || rawKurir.includes("jnt")) parsedKurir = "jnt";
          else if (rawKurir.includes("sicepat")) parsedKurir = "sicepat";
          else if (rawKurir.includes("jne")) parsedKurir = "jne";
          else if (rawKurir.includes("ninja")) parsedKurir = "ninja";
          else if (rawKurir.includes("anteraja")) parsedKurir = "anteraja";
          else if (rawKurir.includes("id express") || rawKurir.includes("ide")) parsedKurir = "ide";
          else if (rawKurir.includes("spx") || rawKurir.includes("shopee")) parsedKurir = "shopee";

          newData.push({
            orderId: String(row[iId]).trim(),
            resi: rawResi,
            kurir: parsedKurir,
            buyer: iBuyer !== -1 ? String(row[iBuyer]) : "-",
            produk: iProduk !== -1 ? String(row[iProduk]) : "-",
            apiStatus: "Menunggu Sinkronisasi",
            apiLastUpdate: "-",
            statusGudang: "PENDING",
            tglDiterima: null
          });
        }

        setReturData(prev => {
          const combined = [...prev];
          newData.forEach(newItem => {
            if (!combined.find(x => x.orderId === newItem.orderId)) {
              combined.push(newItem);
            }
          });
          return combined;
        });

      } catch (error) {
        alert("Gagal membaca file Excel.");
      } finally {
        setIsUploading(false);
        e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSyncTracking = async () => {
    if (returData.length === 0) return alert("Belum ada data retur.");
    
    const apiKey = process.env.NEXT_PUBLIC_RAJAONGKIR_API_KEY;
    if (!apiKey) return alert("API Key RajaOngkir belum dikonfigurasi di file .env.local.");

    setIsSyncing(true);
    
    const unreceivedData = returData.filter(x => x.statusGudang !== "DITERIMA");
    let updatedCount = 0;

    const updatedData = [...returData];

    for (let i = 0; i < unreceivedData.length; i++) {
      const item = unreceivedData[i];
      try {
        const res = await fetch("/api/rajaongkir", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ waybill: item.resi, courier: item.kurir })
        });
        
        const result = await res.json();
        
        if (!res.ok) {
           console.error("Sinkronisasi gagal:", result.error, result.detail);
           continue; // Lanjutkan ke resi berikutnya jika error
        }

        if (result.rajaongkir && result.rajaongkir.status.code === 200) {
          const deliveryData = result.rajaongkir.result;
          const manifest = deliveryData.manifest;
          const latestUpdate = manifest && manifest.length > 0 ? manifest[manifest.length - 1] : null;

          const indexToUpdate = updatedData.findIndex(x => x.orderId === item.orderId);
          if (indexToUpdate !== -1) {
            updatedData[indexToUpdate] = {
              ...updatedData[indexToUpdate],
              apiStatus: deliveryData.summary.status || "ON PROCESS",
              apiLastUpdate: latestUpdate ? `${latestUpdate.manifest_date} ${latestUpdate.manifest_time}` : new Date().toISOString().split('T')[0]
            };
            updatedCount++;
          }
        }
      } catch (e) {
      }
      await new Promise(r => setTimeout(r, 600));
    }

    setReturData(updatedData);
    setIsSyncing(false);
    alert(`Sinkronisasi selesai. ${updatedCount} resi diperbarui dari RajaOngkir.`);
  };

  const handleTerimaGudang = (orderId: string) => {
    if(window.confirm("Konfirmasi bahwa fisik barang ini sudah masuk dan dicek di gudang?")) {
      const now = new Date();
      const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      setReturData(prev => prev.map(item => 
        item.orderId === orderId 
          ? { ...item, statusGudang: "DITERIMA", tglDiterima: formattedDate } 
          : item
      ));
    }
  };

  const openDetailModal = async (item: any) => {
    setSelectedResi(item);
    setIsLoadingDetail(true);
    setTrackingDetail(null);

    try {
      const res = await fetch("/api/rajaongkir", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ waybill: item.resi, courier: item.kurir })
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        alert("GAGAL LACAK:\n" + (result.error || "Terjadi kesalahan") + "\n\n" + (result.detail || ""));
        setIsLoadingDetail(false);
        return;
      }

      if (result.rajaongkir) {
        if (result.rajaongkir.status.code === 200) {
          setTrackingDetail(result.rajaongkir.result);
        } else {
          alert("Ditolak RajaOngkir: " + result.rajaongkir.status.description);
        }
      } else if (result.error) {
        alert("Error Backend: " + result.error);
      } else {
        alert("Respons tidak dikenali: " + JSON.stringify(result).substring(0, 50));
      }
    } catch (e: any) {
      alert("Error Jaringan: " + e.message);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const filteredData = useMemo(() => {
    return returData.filter(item => {
      const matchSearch = globalSearch === "" || 
        item.resi.toLowerCase().includes(globalSearch.toLowerCase()) || 
        item.orderId.toLowerCase().includes(globalSearch.toLowerCase()) ||
        item.buyer.toLowerCase().includes(globalSearch.toLowerCase());

      let matchStatus = true;
      if (statusFilter === "Selesai (Gudang)") matchStatus = item.statusGudang === "DITERIMA";
      if (statusFilter === "Perjalanan") matchStatus = item.statusGudang !== "DITERIMA" && !item.apiStatus.toLowerCase().includes("menunggu");
      if (statusFilter === "Pending") matchStatus = item.statusGudang !== "DITERIMA" && item.apiStatus.toLowerCase().includes("menunggu");

      return matchSearch && matchStatus;
    });
  }, [returData, globalSearch, statusFilter]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const getApiStatusBadge = (apiStatus: string) => {
    const s = apiStatus.toLowerCase();
    if (s.includes("delivered") || s.includes("sukses") || s.includes("selesai")) return "bg-blue-100 text-blue-700 border-blue-200";
    if (s.includes("return") || s.includes("reject") || s.includes("gagal") || s.includes("problem")) return "bg-red-100 text-red-700 border-red-200";
    if (s.includes("menunggu") || s.includes("allocated")) return "bg-slate-100 text-slate-600 border-slate-200";
    return "bg-orange-100 text-orange-700 border-orange-200";
  };

  return (
    <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full font-sans">
      <header className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="text-orange-500" size={24} /> Dashboard Tracking Retur
          </h2>
          <p className="text-slate-500 font-medium text-sm mt-1">Pantau & konfirmasi penerimaan fisik paket retur ke gudang.</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={handleSyncTracking}
            disabled={isSyncing || returData.length === 0}
            className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-sm font-bold transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCcw size={16} className={isSyncing ? "animate-spin text-indigo-500" : "text-indigo-500"} />
            {isSyncing ? "Menyinkronkan API..." : "Sinkronisasi Tracking"}
          </button>
          
          <label className="bg-orange-500 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-orange-600 flex items-center gap-2 text-sm font-bold shadow-sm shadow-orange-200 transition-colors">
            <Upload size={16} /> {isUploading ? "Memproses..." : "Import Excel Retur"}
            <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Retur</p>
            <Box size={16} className="text-slate-400" />
          </div>
          <h3 className="text-2xl font-black text-slate-900">{summaryMetrics.total}</h3>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Perjalanan API</p>
            <Truck size={16} className="text-blue-500" />
          </div>
          <h3 className="text-2xl font-black text-blue-700">{summaryMetrics.dalamPerjalanan}</h3>
        </div>

        <div className="bg-white p-4 rounded-xl border border-red-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[11px] font-bold text-red-600 uppercase tracking-wider">Bermasalah</p>
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <h3 className="text-2xl font-black text-red-700">{summaryMetrics.bermasalah}</h3>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Belum Dilacak</p>
            <Clock size={16} className="text-slate-400" />
          </div>
          <h3 className="text-2xl font-black text-slate-700">{summaryMetrics.pending}</h3>
        </div>

        <div className="bg-emerald-500 p-4 rounded-xl border border-emerald-600 shadow-md text-white">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider">Selesai (Gudang)</p>
            <CheckCircle2 size={16} className="text-white" />
          </div>
          <h3 className="text-2xl font-black text-white">{summaryMetrics.diterimaGudang}</h3>
        </div>
      </div>

      <div className="mb-4 flex flex-col md:flex-row gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari Resi, Order ID, atau Pembeli..." 
            value={globalSearch}
            onChange={(e) => { setGlobalSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 text-sm text-slate-900 bg-slate-50 border border-transparent rounded-lg focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>
        
        <div className="relative min-w-[200px]">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:border-indigo-500 text-sm font-medium cursor-pointer"
          >
            <option value="Semua Status">Semua Status</option>
            <option value="Selesai (Gudang)">Telah Diterima Gudang</option>
            <option value="Perjalanan">Dalam Perjalanan API</option>
            <option value="Pending">Belum Dilacak</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <ChevronDown size={16} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full min-w-[1000px] text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Order & Pembeli</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Resi & Kurir</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status Expedisi (API)</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Status Gudang</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Aksi Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentItems.length > 0 ? (
                currentItems.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-mono font-bold text-slate-800">{item.orderId}</p>
                      <p className="text-[12px] font-medium text-slate-500 mt-0.5 truncate max-w-[200px]">{item.buyer}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-indigo-600 tracking-wide uppercase">{item.resi}</p>
                      <p className="text-[11px] font-bold text-slate-400 uppercase mt-0.5">{item.kurir}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getApiStatusBadge(item.apiStatus)}`}>
                        {item.apiStatus}
                      </span>
                      {item.apiLastUpdate !== "-" && (
                        <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Update: {item.apiLastUpdate}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.statusGudang === "DITERIMA" ? (
                        <div className="flex flex-col items-center">
                          <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
                            <CheckSquare size={12} /> DITERIMA
                          </span>
                          <span className="text-[10px] text-slate-400 mt-1 font-medium">{item.tglDiterima}</span>
                        </div>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                          PENDING
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <button 
                          onClick={() => openDetailModal(item)}
                          className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 rounded-md transition-all"
                          title="Lihat Histori Perjalanan API"
                        >
                          <Eye size={16} />
                        </button>
                        
                        {item.statusGudang !== "DITERIMA" && (
                          <button 
                            onClick={() => handleTerimaGudang(item.orderId)}
                            className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold rounded-md transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            <Box size={14} /> Terima
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center text-slate-400">
                      <Box size={40} className="mb-3 opacity-20" />
                      <p className="text-sm font-medium">Tidak ada data retur yang sesuai filter.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500 font-medium">
            Menampilkan {filteredData.length === 0 ? 0 : indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredData.length)} dari {filteredData.length} retur
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              Prev
            </button>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1.5 text-sm font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {selectedResi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden">
            
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                  <Truck size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Histori Perjalanan Ekspedisi</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase mt-0.5">{selectedResi.resi} • {selectedResi.kurir}</p>
                </div>
              </div>
              <button onClick={() => setSelectedResi(null)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {isLoadingDetail ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <RefreshCcw size={32} className="animate-spin mb-4 text-indigo-500" />
                  <p className="font-medium text-sm">Menghubungi server ekspedisi...</p>
                </div>
              ) : trackingDetail ? (
                <div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Status Terakhir</p>
                      <p className="font-bold text-slate-800">{trackingDetail.summary?.status || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Tujuan / Pembeli</p>
                      <p className="font-bold text-slate-800">{trackingDetail.summary?.receiver_name || "-"}</p>
                    </div>
                  </div>

                  <h4 className="font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Timeline Detail</h4>
                  <div className="relative border-l-2 border-slate-200 ml-3 space-y-6 pb-4">
                    {trackingDetail.manifest && [...trackingDetail.manifest].reverse().map((hist: any, index: number) => {
                      const isFirst = index === 0;
                      return (
                        <div key={index} className="relative pl-6">
                          <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${isFirst ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                          <p className={`text-[11px] font-bold mb-1 ${isFirst ? 'text-indigo-600' : 'text-slate-400'}`}>
                            {hist.manifest_date} {hist.manifest_time}
                          </p>
                          <p className={`text-sm ${isFirst ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
                            {hist.manifest_description} {hist.city_name ? `(${hist.city_name})` : ''}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 font-medium">
                  <AlertTriangle size={32} className="mx-auto mb-3 text-red-400" />
                  <p>Data resi tidak ditemukan atau belum update di server ekspedisi.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}