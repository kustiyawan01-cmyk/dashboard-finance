"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import * as XLSX from "xlsx";
import { 
  Calendar, Bell, ChevronDown, Search, Plus, 
  Download, RefreshCcw, Settings, Edit, Trash2,
  WalletCards, Wallet, CalendarRange, ListOrdered, LayoutGrid,
  Building2, PenTool, Wifi, Car, Coffee, Printer, Monitor, Droplet,
  Banknote, QrCode, Smartphone, Receipt, X, Package, Megaphone, Users2,
  Briefcase, Wrench, Truck, FileBox
} from "lucide-react";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function ExpensesPage() {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<any[]>([]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua Kategori");
  const [selectedMethod, setSelectedMethod] = useState("Semua Metode");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // STATE FILTER TANGGAL
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState({ start: '', end: '' });

  const handlePresetDate = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    setTempDateRange({ start: formatDate(start), end: formatDate(end) });
  };

  // State Modal & Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState<number | null>(null); // State baru untuk melacak ID yang diedit
  
  const defaultFormData = {
    tanggal: new Date().toISOString().split('T')[0],
    kategori: "Biaya Operasional",
    keterangan: "",
    jumlah: "",
    metode_pembayaran: "Transfer Bank"
  };
  const [formData, setFormData] = useState(defaultFormData);

  const [metrics, setMetrics] = useState({
    total: 0, bulanIni: 0, rataHarian: 0, totalTransaksi: 0, totalKategori: 0, trendData: [] as number[],
    internal: { operasional: 0, marketing: 0, maintenance: 0, karyawan: 0, bahan: 0, gaji: 0, perlengkapan: 0 }
  });

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/expenses');
      if (res.ok) {
        const rawData = await res.json();
        
        // Filter Data berdasarkan rentang tanggal
        const data = rawData.filter((item: any) => {
          if (!dateRange.start && !dateRange.end) return true;
          
          const itemDate = new Date(item.tanggal);
          const year = itemDate.getFullYear();
          const month = String(itemDate.getMonth() + 1).padStart(2, '0');
          const day = String(itemDate.getDate()).padStart(2, '0');
          const datePart = `${year}-${month}-${day}`;

          if (dateRange.start && dateRange.end && dateRange.start === dateRange.end) {
            return datePart === dateRange.start;
          }

          let isValid = true;
          if (dateRange.start) isValid = isValid && datePart >= dateRange.start;
          if (dateRange.end) isValid = isValid && datePart <= dateRange.end;
          
          return isValid;
        });

        setExpenses(data);

        let tTotal = 0, tBulanIni = 0;
        let op=0, mkt=0, mtc=0, krw=0, bhn=0, gj=0, plg=0;
        const categories = new Set();
        const dailySums: Record<string, number> = {};
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        data.forEach((item: any) => {
          const amount = Number(item.jumlah) || 0;
          tTotal += amount;
          categories.add(item.kategori);

          // Pisahkan ke 7 Kategori Internal
          const cat = String(item.kategori || "").toLowerCase();
          if(cat.includes("operasional")) op+=amount;
          else if(cat.includes("marketing") || cat.includes("iklan")) mkt+=amount;
          else if(cat.includes("maintenance") || cat.includes("perbaikan")) mtc+=amount;
          else if(cat.includes("karyawan") && !cat.includes("gaji")) krw+=amount;
          else if(cat.includes("bahan") || cat.includes("produksi")) bhn+=amount;
          else if(cat.includes("gaji")) gj+=amount;
          else if(cat.includes("perlengkapan") || cat.includes("atk")) plg+=amount;
          else op+=amount; // Fallback masuk ke operasional

          const dateStr = new Date(item.tanggal).toISOString().split('T')[0];
          dailySums[dateStr] = (dailySums[dateStr] || 0) + amount;

          const itemDate = new Date(item.tanggal);
          if (itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear) tBulanIni += amount;
        });

        const sortedDates = Object.keys(dailySums).sort();
        const trend = sortedDates.slice(-10).map(d => dailySums[d]);
        
        setMetrics({
          total: tTotal, bulanIni: tBulanIni, rataHarian: sortedDates.length > 0 ? tTotal / sortedDates.length : 0,
          totalTransaksi: data.length, totalKategori: categories.size, trendData: trend.length > 0 ? trend : [0, 0, 0, 0, 0],
          internal: { operasional: op, marketing: mkt, maintenance: mtc, karyawan: krw, bahan: bhn, gaji: gj, perlengkapan: plg }
        });
      }
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchExpenses(); }, [dateRange]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const matchSearch = exp.keterangan.toLowerCase().includes(searchTerm.toLowerCase()) || exp.kategori.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = selectedCategory === "Semua Kategori" || exp.kategori === selectedCategory;
      const matchMethod = selectedMethod === "Semua Metode" || exp.metode_pembayaran === selectedMethod;
      return matchSearch && matchCategory && matchMethod;
    });
  }, [expenses, searchTerm, selectedCategory, selectedMethod]);

  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const paginatedExpenses = filteredExpenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filteredExpenses.map(exp => ({ Tanggal: exp.tanggal, Kategori: exp.kategori, Keterangan: exp.keterangan, Metode: exp.metode_pembayaran, Jumlah: exp.jumlah })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pengeluaran");
    XLSX.writeFile(wb, `Laporan_Pengeluaran.xlsx`);
  };

  // --- LOGIKA BUKA MODAL EDIT ---
  const handleEditClick = (exp: any) => {
    setFormData({
      tanggal: new Date(exp.tanggal).toISOString().split('T')[0],
      kategori: exp.kategori,
      keterangan: exp.keterangan,
      jumlah: exp.jumlah.toString(),
      metode_pembayaran: exp.metode_pembayaran
    });
    setEditId(exp.id); // Simpan ID
    setIsModalOpen(true);
  };

  // --- LOGIKA HAPUS DATA ---
  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus catatan pengeluaran ini?")) return;
    try {
      const res = await fetch('/api/expenses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) fetchExpenses();
      else alert("Gagal menghapus data.");
    } catch (error) { alert("Terjadi kesalahan sistem."); }
  };

  // --- LOGIKA SIMPAN & UPDATE DATA ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editId) {
        // Proses Edit (PUT)
        const res = await fetch('/api/expenses', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editId, ...formData, jumlah: Number(formData.jumlah) })
        });
        if (res.ok) {
          setIsModalOpen(false);
          setEditId(null);
          setFormData(defaultFormData);
          fetchExpenses();
        } else alert("Gagal update data.");
      } else {
        // Proses Tambah Baru (POST)
        const payload = [{ ...formData, jumlah: Number(formData.jumlah) }];
        const res = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          setIsModalOpen(false);
          setFormData(defaultFormData);
          fetchExpenses();
        } else alert("Gagal menyimpan data.");
      }
    } catch (error) { alert("Terjadi kesalahan sistem."); } 
    finally { setIsSubmitting(false); }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    setFormData(defaultFormData);
  };

  const formatRp = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const getCategoryStyle = (kategori: string) => {
    const kat = kategori.toLowerCase();
    if (kat.includes('operasional')) return { icon: <Building2 size={14}/>, color: 'text-blue-600 bg-blue-50 border-blue-100' };
    if (kat.includes('marketing')) return { icon: <Megaphone size={14}/>, color: 'text-pink-600 bg-pink-50 border-pink-100' };
    if (kat.includes('maintenance')) return { icon: <Settings size={14}/>, color: 'text-slate-600 bg-slate-100 border-slate-200' };
    if (kat.includes('karyawan')) return { icon: <Users2 size={14}/>, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' };
    if (kat.includes('bahan')) return { icon: <Package size={14}/>, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
    if (kat.includes('gaji')) return { icon: <Wallet size={14}/>, color: 'text-purple-600 bg-purple-50 border-purple-100' };
    if (kat.includes('perlengkapan')) return { icon: <PenTool size={14}/>, color: 'text-amber-500 bg-amber-50 border-amber-100' };
    return { icon: <LayoutGrid size={14}/>, color: 'text-slate-600 bg-slate-100 border-slate-200' };
  };

  const getMethodStyle = (metode: string) => {
    const met = metode.toLowerCase();
    if (met.includes('transfer')) return { icon: <Banknote size={14}/>, color: 'text-blue-600 bg-blue-50' };
    if (met.includes('qris')) return { icon: <QrCode size={14}/>, color: 'text-purple-600 bg-purple-50' };
    if (met.includes('wallet') || met.includes('ovo') || met.includes('dana') || met.includes('tunai') || met.includes('cash')) return { icon: <Smartphone size={14}/>, color: 'text-emerald-600 bg-emerald-50' };
    return { icon: <Banknote size={14}/>, color: 'text-slate-600 bg-slate-100' };
  };

  const uniqueCategories = ["Semua Kategori", ...Array.from(new Set(expenses.map(e => e.kategori)))];
  const uniqueMethods = ["Semua Metode", ...Array.from(new Set(expenses.map(e => e.metode_pembayaran)))];

  if (loading && expenses.length === 0) return <div className="p-10 text-[15px] text-slate-500 font-medium flex justify-center items-center h-screen">Mempersiapkan Data Pengeluaran...</div>;

  return (
    <main className="flex-1 p-8 bg-[#F8FAFC] min-h-screen font-sans text-slate-800 relative">
      
      {/* HEADER */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pengeluaran Kantor</h1>
          <p className="text-[15px] text-slate-500 mt-1 font-medium">Kelola dan pantau semua pengeluaran operasional kantor Anda.</p>
        </div>
        
        {/* DATE PICKER CUSTOM (Pop-up) */}
        <div className="relative z-50">
          <button 
            onClick={() => {
              setTempDateRange(dateRange);
              setIsDatePickerOpen(!isDatePickerOpen);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors text-[14px] font-medium text-slate-700"
          >
            <Calendar size={18} className="text-indigo-500" />
            {dateRange.start && dateRange.end 
              ? `${dateRange.start} - ${dateRange.end}` 
              : "Semua Waktu"}
          </button>

          {isDatePickerOpen && (
            <div className="absolute right-0 top-full mt-2 w-[500px] bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col overflow-hidden">
              <div className="flex flex-row h-[280px]">
                {/* Sidebar Preset */}
                <div className="w-40 border-r border-slate-100 bg-slate-50/50 p-2 flex flex-col gap-1 overflow-y-auto">
                  <button onClick={() => handlePresetDate(0)} className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors">Hari ini</button>
                  <button onClick={() => handlePresetDate(1)} className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors">Kemarin</button>
                  <button onClick={() => handlePresetDate(7)} className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors">7 hari terakhir</button>
                  <button onClick={() => handlePresetDate(30)} className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors">30 hari terakhir</button>
                  <button onClick={() => handlePresetDate(90)} className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors">3 bulan terakhir</button>
                  <button onClick={() => setTempDateRange({start: '', end: ''})} className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors">Semua waktu</button>
                </div>
                
                {/* Input Area */}
                <div className="flex-1 p-5 flex flex-col">
                  <h4 className="font-medium text-slate-900 mb-4">Atur Tanggal Kustom</h4>
                  <div className="flex items-center gap-4 mb-auto">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Mulai Tanggal</label>
                      <input 
                        type="date" 
                        value={tempDateRange.start}
                        onChange={(e) => setTempDateRange(prev => ({...prev, start: e.target.value}))}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Sampai Tanggal</label>
                      <input 
                        type="date" 
                        value={tempDateRange.end}
                        onChange={(e) => setTempDateRange(prev => ({...prev, end: e.target.value}))}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Aksi Bawah */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button 
                      onClick={() => { setDateRange({start: '', end: ''}); setIsDatePickerOpen(false); setCurrentPage(1); }}
                      className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-md uppercase tracking-wider transition-colors"
                    >
                      Reset
                    </button>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setIsDatePickerOpen(false)}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => {
                          setDateRange(tempDateRange);
                          setIsDatePickerOpen(false);
                          setCurrentPage(1);
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- PENGELUARAN INTERNAL BISNIS --- */}
      <div className="mb-8">
        <h3 className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-4">Pengeluaran Internal Bisnis</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <MiniMetricCard label="Operasional" value={formatRp(metrics.internal.operasional)} icon={<Briefcase />} color="text-amber-500 bg-amber-50" />
          <MiniMetricCard label="Marketing" value={formatRp(metrics.internal.marketing)} icon={<Megaphone />} color="text-amber-500 bg-amber-50" />
          <MiniMetricCard label="Maintenance" value={formatRp(metrics.internal.maintenance)} icon={<Wrench />} color="text-amber-500 bg-amber-50" />
          <MiniMetricCard label="Karyawan" value={formatRp(metrics.internal.karyawan)} icon={<Users2 />} color="text-amber-500 bg-amber-50" />
          <MiniMetricCard label="Beli Bahan" value={formatRp(metrics.internal.bahan)} icon={<Truck />} color="text-amber-500 bg-amber-50" />
          <MiniMetricCard label="Biaya Gaji" value={formatRp(metrics.internal.gaji)} icon={<Wallet />} color="text-amber-500 bg-amber-50" />
          <MiniMetricCard label="Perlengkapan" value={formatRp(metrics.internal.perlengkapan)} icon={<FileBox />} color="text-amber-500 bg-amber-50" />
        </div>
      </div>

      {/* TOP METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-8">
        <TopCard title="Total Pengeluaran" value={formatRp(metrics.total)} icon={<WalletCards />} color="red" trend={metrics.trendData} />
        <TopCard title="Pengeluaran Bulan Ini" value={formatRp(metrics.bulanIni)} icon={<Wallet />} color="emerald" trend={metrics.trendData} />
        <TopCard title="Rata-rata / Hari" value={formatRp(metrics.rataHarian)} icon={<CalendarRange />} color="blue" trend={metrics.trendData} />
        <TopCard title="Transaksi" value={metrics.totalTransaksi.toString()} icon={<ListOrdered />} color="purple" trend={metrics.trendData} isNumber />
        <TopCard title="Kategori" value={metrics.totalKategori.toString()} icon={<LayoutGrid />} color="orange" trend={metrics.trendData} isNumber />
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-200 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative w-full max-w-xs">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" placeholder="Cari keterangan atau kategori..." 
                value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              />
            </div>
            <select value={selectedCategory} onChange={(e) => {setSelectedCategory(e.target.value); setCurrentPage(1);}} className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-[13px] font-medium text-slate-600 focus:outline-none pr-8 cursor-pointer">
              {uniqueCategories.map(cat => <option key={cat as string} value={cat as string}>{cat as string}</option>)}
            </select>
            <select value={selectedMethod} onChange={(e) => {setSelectedMethod(e.target.value); setCurrentPage(1);}} className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-[13px] font-medium text-slate-600 focus:outline-none pr-8 cursor-pointer">
              {uniqueMethods.map(met => <option key={met as string} value={met as string}>{met as string}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-[#FF5722] text-white px-5 py-2.5 rounded-lg text-[14px] font-bold hover:bg-[#E64A19] transition-colors shadow-sm shadow-orange-200">
              <Plus size={18} /> Tambah Pengeluaran
            </button>
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3 ml-1">
               <button onClick={fetchExpenses} title="Refresh Data" className="p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-md transition-colors"><RefreshCcw size={18} /></button>
               <button onClick={handleExport} title="Download Excel" className="p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-md transition-colors"><Download size={18} /></button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200">
                <th className="px-6 py-4 text-[13px] font-bold text-slate-800 w-[15%]">Tanggal</th>
                <th className="px-6 py-4 text-[13px] font-bold text-slate-800 w-[20%]">Kategori</th>
                <th className="px-6 py-4 text-[13px] font-bold text-slate-800 w-[30%]">Keterangan</th>
                <th className="px-6 py-4 text-[13px] font-bold text-slate-800 w-[15%]">Metode</th>
                <th className="px-6 py-4 text-[13px] font-bold text-slate-800 w-[10%] text-right">Jumlah</th>
                <th className="px-6 py-4 w-[10%] text-center text-[13px] font-bold text-slate-800">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedExpenses.map((exp, idx) => {
                const catStyle = getCategoryStyle(exp.kategori);
                const methStyle = getMethodStyle(exp.metode_pembayaran);
                
                return (
                  <tr key={idx} className="bg-white hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 text-[14px] font-medium text-slate-600">{formatDate(exp.tanggal)}</td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${catStyle.color}`}>
                        {catStyle.icon}
                        <span className="text-[12px] font-bold tracking-wide">{exp.kategori}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[14px] text-slate-700 font-medium">{exp.keterangan}</td>
                    <td className="px-6 py-4">
                       <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${methStyle.color}`}>
                         {methStyle.icon}
                         <span className="text-[12px] font-bold">{exp.metode_pembayaran}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right text-[15px] font-bold text-slate-900">{formatRp(exp.jumlah)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditClick(exp)} title="Edit Data" className="text-blue-500 hover:text-blue-700 p-1.5 rounded-md hover:bg-blue-50 transition-colors">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(exp.id)} title="Hapus Data" className="text-red-500 hover:text-red-700 p-1.5 rounded-md hover:bg-red-50 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {paginatedExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-24 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4"><Receipt size={32} className="text-slate-300" /></div>
                    <p className="text-slate-500 font-bold text-[15px]">Tidak ada data ditemukan</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="p-5 border-t border-slate-200 flex justify-between items-center bg-white">
            <span className="text-[13px] text-slate-500 font-medium">
              Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredExpenses.length)} dari {filteredExpenses.length} data
            </span>
            <div className="flex items-center gap-1">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"><ChevronDown size={16} className="rotate-90" /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 flex items-center justify-center rounded-md font-bold text-[13px] ${currentPage === page ? 'bg-[#FF5722] text-white' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}>{page}</button>
              ))}
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"><ChevronDown size={16} className="-rotate-90" /></button>
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL FORM --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-[18px] font-black text-slate-900">{editId ? "Edit Pengeluaran" : "Catat Pengeluaran Baru"}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-[12px] font-bold text-slate-600 uppercase tracking-wide mb-2">Tanggal</label>
                  <input type="date" required value={formData.tanggal} onChange={(e) => setFormData({...formData, tanggal: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-slate-600 uppercase tracking-wide mb-2">Kategori</label>
                  <select required value={formData.kategori} onChange={(e) => setFormData({...formData, kategori: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <option>Biaya Operasional</option>
                    <option>Biaya Marketing</option>
                    <option>Biaya Maintenance</option>
                    <option>Biaya Karyawan</option>
                    <option>Biaya Beli Bahan</option>
                    <option>Biaya Gaji</option>
                    <option>Biaya Perlengkapan</option>
                    <option>Lainnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-600 uppercase tracking-wide mb-2">Keterangan / Tujuan</label>
                <input type="text" required placeholder="Contoh: Beli kertas HVS dan Tinta" value={formData.keterangan} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-[12px] font-bold text-slate-600 uppercase tracking-wide mb-2">Jumlah (Rp)</label>
                  <input type="number" required placeholder="50000" min="0" value={formData.jumlah} onChange={(e) => setFormData({...formData, jumlah: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[14px] font-bold text-red-600 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-slate-600 uppercase tracking-wide mb-2">Metode Pembayaran</label>
                  <select required value={formData.metode_pembayaran} onChange={(e) => setFormData({...formData, metode_pembayaran: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <option>Transfer Bank</option>
                    <option>QRIS</option>
                    <option>E-Wallet (OVO/Dana)</option>
                    <option>Cash / Tunai</option>
                    <option>Kartu Kredit</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition-colors">Batal</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 bg-[#FF5722] text-white font-bold rounded-lg hover:bg-[#E64A19] transition-colors disabled:opacity-50">
                  {isSubmitting ? "Menyimpan..." : (editId ? "Update Data" : "Simpan Pengeluaran")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function MiniMetricCard({ label, value, icon, color }: any) {
  return (
    <div className={`p-4 rounded-xl border border-slate-200 shadow-sm bg-white flex items-center gap-3 hover:-translate-y-1 transition-transform duration-300`}>
      <div className={`p-2.5 rounded-xl ${color}`}>
        {React.cloneElement(icon, { size: 18 })}
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-[14px] font-black text-slate-900 leading-none tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function TopCard({ title, value, icon, color, trend }: any) {
  const colorMap: Record<string, { bg: string, text: string, hex: string }> = {
    red: { bg: 'bg-red-50', text: 'text-red-500', hex: '#EF4444' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-500', hex: '#10B981' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-500', hex: '#3B82F6' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-500', hex: '#8B5CF6' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-500', hex: '#F97316' },
  };
  const theme = colorMap[color];
  const sparklineOptions = { chart: { type: 'line', sparkline: { enabled: true } }, stroke: { curve: 'smooth', width: 2 }, colors: [theme.hex], tooltip: { fixed: { enabled: false }, x: { show: false }, marker: { show: false } } } as ApexCharts.ApexOptions;

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme.bg} ${theme.text}`}>{React.cloneElement(icon, { size: 16 })}</div>
        <div><span className="text-[12px] font-bold text-slate-600 block">{title}</span></div>
      </div>
      <div>
        <h3 className="text-[20px] font-black text-slate-900 tracking-tight mb-2 leading-none">{value}</h3>
        <div className="flex items-center gap-1.5 mb-2">
          <span className={`text-[11px] font-bold ${color === 'red' ? 'text-red-500' : 'text-emerald-500'} flex items-center`}>{color === 'red' ? '↓ 8.21%' : '↑ 4.35%'}</span>
          <span className="text-[10px] text-slate-400 font-medium">Dari periode sebelumnya</span>
        </div>
        <div className="h-8 w-full"><ReactApexChart options={sparklineOptions} series={[{ data: trend }]} type="line" height={32} /></div>
      </div>
    </div>
  );
}