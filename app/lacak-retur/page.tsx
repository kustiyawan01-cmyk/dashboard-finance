"use client";

import React, { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import { 
  Search, Package, Truck, CheckCircle2, AlertTriangle, 
  MapPin, Clock, Box, RefreshCcw, ShieldAlert, Upload,
  Download, Filter, ChevronDown, CheckSquare, Eye, X, ScanLine, Calendar
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
  const [scanInput, setScanInput] = useState("");
  const [scanMessage, setScanMessage] = useState({ text: "", type: "" });
  const [datePreset, setDatePreset] = useState("Semua Waktu");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const parseDateStr = (dateStr: string) => {
    if (!dateStr || dateStr === "-") return null;
    const cleanStr = dateStr.includes(" ") ? dateStr.split(" ")[0] : dateStr;
    const parts = cleanStr.split("/");
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    const partsDash = cleanStr.split("-");
    if (partsDash.length === 3) {
      return new Date(parseInt(partsDash[0]), parseInt(partsDash[1]) - 1, parseInt(partsDash[2]));
    }
    return null;
  };

  useEffect(() => {
    const loadDataFromDB = async () => {
      try {
        const res = await fetch("/api/retur");
        if (res.ok) {
          const data = await res.json();
          setReturData(data);
        }
      } catch (e) {
        console.error("Gagal memuat data dari database", e);
      }
    };
    loadDataFromDB();
  }, []);

  useEffect(() => {
    const saveDataToDB = async () => {
      if (returData.length > 0) {
        try {
          await fetch("/api/retur", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: returData })
          });
        } catch (e) {
          console.error("Gagal menyimpan ke database", e);
        }
      }
    };
    
    // Memberikan jeda waktu (debounce) agar tidak terjadi spam API ke Neon
    const timer = setTimeout(() => saveDataToDB(), 1000);
    return () => clearTimeout(timer);
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
    
    setIsSyncing(true);
    
    const unreceivedData = returData.filter(x => x.statusGudang !== "DITERIMA");
    let updatedCount = 0;

    const updatedData = [...returData];

    for (let i = 0; i < unreceivedData.length; i++) {
      const item = unreceivedData[i];
      try {
        const res = await fetch("/api/binderbyte", {
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

        if (result.status === 200 && result.data) {
          const summary = result.data.summary;
          const history = result.data.history;
          const latestUpdate = history && history.length > 0 ? history[0] : null;

          const indexToUpdate = updatedData.findIndex(x => x.orderId === item.orderId);
          if (indexToUpdate !== -1) {
            updatedData[indexToUpdate] = {
              ...updatedData[indexToUpdate],
              apiStatus: summary?.status || "ON PROCESS",
              apiLastUpdate: latestUpdate ? latestUpdate.date : new Date().toISOString().split('T')[0]
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
    alert(`Sinkronisasi selesai. ${updatedCount} resi diperbarui dari Binderbyte.`);
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

  const handleExportExcel = () => {
    if (returData.length === 0) return alert("Belum ada data untuk diekspor.");
    
    // Menyusun ulang data agar kolom di Excel menjadi lebih rapi dan berbahasa Indonesia
    const exportData = returData.map(item => ({
      "Order ID": item.orderId,
      "Resi": item.resi,
      "Kurir": item.kurir.toUpperCase(),
      "Status Gudang": item.statusGudang,
      "Tanggal Diterima": item.tglDiterima || "-",
      "Status Ekspedisi": item.apiStatus,
      "Update Terakhir (API)": item.apiLastUpdate
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Retur");
    
    // Memberikan nama file dinamis sesuai tanggal hari ini
    XLSX.writeFile(workbook, `Laporan_Retur_Gudang_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const openDetailModal = async (item: any) => {
    setSelectedResi(item);
    setIsLoadingDetail(true);
    setTrackingDetail(null);

    try {
      const res = await fetch("/api/binderbyte", {
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

      if (result.status === 200 && result.data) {
        setTrackingDetail(result.data);
      } else if (result.message) {
        alert("Ditolak Binderbyte: " + result.message);
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

  const playSound = (type: 'success' | 'error') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {}
  };

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    const resiToFind = scanInput.trim().toLowerCase();
    const index = returData.findIndex(item => item.resi.toLowerCase() === resiToFind);

    if (index !== -1) {
      const now = new Date();
      const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      setReturData(prev => {
        const newData = [...prev];
        newData[index] = { ...newData[index], statusGudang: "DITERIMA", tglDiterima: formattedDate };
        return newData;
      });
      setScanMessage({ text: `Sukses: Resi ${scanInput} diterima di gudang!`, type: "success" });
      playSound('success');
    } else {
      setScanMessage({ text: `Gagal: Resi ${scanInput} tidak ditemukan di data retur.`, type: "error" });
      playSound('error');
    }
    
    setScanInput("");
    setTimeout(() => setScanMessage({ text: "", type: "" }), 3500);
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

      let matchDate = true;
      if (datePreset !== "Semua Waktu") {
        const targetDateStr = item.tglDiterima || item.apiLastUpdate;
        const itemDate = parseDateStr(targetDateStr);
        if (!itemDate) {
          matchDate = false;
        } else {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const compareDate = new Date(itemDate);
          compareDate.setHours(0, 0, 0, 0);

          if (datePreset === "Hari Ini") {
            matchDate = compareDate.getTime() === today.getTime();
          } else if (datePreset === "7 Hari Terakhir") {
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 7);
            matchDate = compareDate >= sevenDaysAgo && compareDate <= today;
          } else if (datePreset === "30 Hari Terakhir") {
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);
            matchDate = compareDate >= thirtyDaysAgo && compareDate <= today;
          } else if (datePreset === "Kustom" && customStartDate && customEndDate) {
            const start = new Date(customStartDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            matchDate = compareDate >= start && compareDate <= end;
          }
        }
      }

      return matchSearch && matchStatus && matchDate;
    });
  }, [returData, globalSearch, statusFilter, datePreset, customStartDate, customEndDate]);

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
    <main className="h-screen w-full flex flex-col bg-slate-50 overflow-hidden font-sans p-4 md:p-6 select-none">
      <header className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="text-orange-500" size={24} /> Dashboard Tracking Retur
          </h2>
          <p className="text-slate-500 font-medium text-sm mt-1">Pantau & konfirmasi penerimaan fisik paket retur ke gudang.</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={handleExportExcel}
            disabled={returData.length === 0}
            className="bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 flex items-center gap-2 text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
          >
            <Download size={16} /> Export Laporan
          </button>

          <button 
            onClick={handleSyncTracking}
            disabled={isSyncing || returData.length === 0}
            className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-sm font-bold transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCcw size={16} className={isSyncing ? "animate-spin text-indigo-500" : "text-indigo-500"} />
            {isSyncing ? "Menyinkronkan API..." : "Sinkronisasi Tracking"}
          </button>
          
          <label className="bg-orange-500 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-orange-600 flex items-center gap-2 text-sm font-bold shadow-sm shadow-orange-200 transition-colors">
            <Upload size={16} /> {isUploading ? "Memproses..." : "Import Excel"}
            <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />
          </label>
</div>
    </header>

    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 flex-shrink-0">
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

      <div className="mb-4 bg-white p-4 rounded-xl border border-indigo-200 shadow-sm bg-indigo-50/30">
        <form onSubmit={handleScanSubmit} className="flex flex-col md:flex-row gap-3 items-center">
          <div className="flex-1 w-full relative">
            <ScanLine size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500" />
            <input 
              type="text" 
              autoFocus
              placeholder="Scan Barcode Resi atau Ketik Manual lalu tekan Enter..." 
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              className="w-full pl-11 pr-4 py-3 text-base font-bold text-slate-900 bg-white border border-indigo-300 rounded-lg focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 transition-all shadow-inner"
            />
          </div>
          <button type="submit" className="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md">
            <CheckSquare size={18} /> Terima Paket
          </button>
        </form>
      </div>

      {/* Floating Popup Notification */}
      {scanMessage.text && (
        <div className="fixed top-8 right-8 z-[100] animate-in slide-in-from-top-5 fade-in duration-300">
          <div className={`flex items-center gap-4 px-6 py-4 rounded-xl shadow-2xl border-l-4 ${scanMessage.type === 'success' ? 'bg-white border-emerald-500' : 'bg-white border-red-500'}`}>
            {scanMessage.type === 'success' ? (
              <div className="bg-emerald-100 p-2 rounded-full">
                <CheckCircle2 size={24} className="text-emerald-600" />
              </div>
            ) : (
              <div className="bg-red-100 p-2 rounded-full">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
            )}
            <div>
              <h4 className="font-bold text-slate-800 text-base">
                {scanMessage.type === 'success' ? 'Scan Berhasil!' : 'Peringatan!'}
              </h4>
              <p className="text-sm font-medium text-slate-600">{scanMessage.text}</p>
            </div>
            <button 
              onClick={() => setScanMessage({ text: "", type: "" })} 
              className="ml-2 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

<div className="mb-4 flex flex-col md:flex-row gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex-shrink-0 relative">
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

      {/* Popover Date Picker */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-sm transition-colors flex items-center gap-2 border border-slate-200 h-full min-h-[38px]"
        >
          <Calendar size={16} className="text-indigo-500" />
          <span>Periode: {datePreset === "Kustom" && customStartDate ? `${customStartDate} s/d ${customEndDate || '...'}` : datePreset}</span>
          <ChevronDown size={14} />
        </button>

        {isDatePickerOpen && (
          <div className="absolute right-0 mt-2 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-row overflow-hidden min-w-[420px]">
            {/* Sidebar Preset */}
            <div className="bg-slate-50 border-r border-slate-100 p-2 flex flex-col gap-1 w-44">
              {["Semua Waktu", "Hari Ini", "7 Hari Terakhir", "30 Hari Terakhir", "Kustom"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setDatePreset(preset);
                    if (preset !== "Kustom") {
                      setIsDatePickerOpen(false);
                      setCurrentPage(1);
                    }
                  }}
                  className={`px-3 py-2 text-left text-xs font-bold rounded-md transition-colors ${datePreset === preset ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200/60'}`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Custom Input Form (Right Side) */}
            <div className="p-4 flex flex-col gap-3 flex-1 justify-center">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Tanggal Mulai</label>
                <input
                  type="date"
                  disabled={datePreset !== "Kustom"}
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-500 disabled:bg-slate-100"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Tanggal Selesai</label>
                <input
                  type="date"
                  disabled={datePreset !== "Kustom"}
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-500 disabled:bg-slate-100"
                />
              </div>
              {datePreset === "Kustom" && (
                <button
                  type="button"
                  onClick={() => {
                    if (customStartDate && customEndDate) {
                      setIsDatePickerOpen(false);
                      setCurrentPage(1);
                    } else {
                      alert("Silakan isi kedua tanggal.");
                    }
                  }}
                  className="mt-1 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 rounded-lg text-xs shadow-md transition-colors"
                >
                  Terapkan Filter
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="relative min-w-[200px]">
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:border-indigo-500 text-sm font-medium cursor-pointer h-full min-h-[38px]"
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

<div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
      <div className="overflow-auto flex-1 relative">
        <table className="w-full min-w-[1000px] text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-20 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
              <tr>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Order ID</th>
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
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-indigo-600 tracking-wide uppercase">{item.resi}</p>
                      <p className="text-[11px] font-bold text-slate-400 uppercase mt-0.5">{item.kurir}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${item.statusGudang === "DITERIMA" && item.apiStatus.toLowerCase().includes("menunggu") ? getApiStatusBadge("DELIVERED") : getApiStatusBadge(item.apiStatus)}`}>
                        {item.statusGudang === "DITERIMA" && item.apiStatus.toLowerCase().includes("menunggu") ? "DELIVERED" : item.apiStatus}
                      </span>
                      {item.apiLastUpdate !== "-" && (
                        <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                          Update: {item.statusGudang === "DITERIMA" && item.apiStatus.toLowerCase().includes("menunggu") && item.tglDiterima ? item.tglDiterima.split(' ')[0] : item.apiLastUpdate}
                        </p>
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

    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4 sticky bottom-0 z-20 shadow-[0_-1px_0_0_rgba(226,232,240,1)] flex-shrink-0">
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
                    {trackingDetail.history && trackingDetail.history.map((hist: any, index: number) => {
                      const isFirst = index === 0;
                      return (
                        <div key={index} className="relative pl-6">
                          <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${isFirst ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                          <p className={`text-[11px] font-bold mb-1 ${isFirst ? 'text-indigo-600' : 'text-slate-400'}`}>
                            {hist.date}
                          </p>
                          <p className={`text-sm ${isFirst ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
                            {hist.desc} {hist.location ? `(${hist.location})` : ''}
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