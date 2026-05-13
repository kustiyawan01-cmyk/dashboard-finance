"use client";

import { useAuth } from "@/app/context/AuthContext";
import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { 
  LayoutDashboard, Upload, BarChart3, Settings, 
  Table as TableIcon, ChevronLeft, ChevronRight, CheckCircle2, Search, Filter, Calendar,
  Package, Wallet, Truck, Check, XCircle, Download, ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";
import Link from "next/link";

export default function ShopeePage() {
  const { user } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const [globalSearch, setGlobalSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  
  // STATE UNTUK SORTING TABEL (Default: Tanggal Terbaru)
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });
  
  // STATE UNTUK FILTER TANGGAL (DARI - SAMPAI)
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState({ start: '', end: '' });

  // STATE UNTUK EXPORT TANGGAL
  const [isExportDatePickerOpen, setIsExportDatePickerOpen] = useState(false);
  const [exportDateRange, setExportDateRange] = useState({ start: '', end: '' });

const fetchOrders = async () => {
    try {
      const res = await fetch('/api/shopee');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error("Gagal menarik data");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchOrders();
  }, []);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(orders.map(order => order.status));
    return Array.from(statuses);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // 1. Pencarian Global
      const searchLower = globalSearch.toLowerCase();
      const matchesSearch = 
        globalSearch === "" || 
        order.orderId.toLowerCase().includes(searchLower) ||
        order.productName.toLowerCase().includes(searchLower);
      
      // 2. Filter Status
      const matchesStatus = 
        statusFilter === "Semua Status" || 
        order.status === statusFilter;

      // 3. Filter Tanggal
      let matchesDate = true;
      if (dateRange.start && dateRange.end && order.date && order.date !== "-") {
        const datePart = order.date.split(" ")[0]; // Memotong jam, hanya ambil "DD/MM/YYYY"
        if (datePart && datePart.includes("/")) {
          const [day, month, year] = datePart.split("/");
          const formattedOrderDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          matchesDate = formattedOrderDate >= dateRange.start && formattedOrderDate <= dateRange.end;
        }
      }

return matchesSearch && matchesStatus && matchesDate;
    });
  }, [orders, globalSearch, statusFilter, dateRange]);

  // KALKULASI RINGKASAN KEUANGAN
  const summaryMetrics = useMemo(() => {
    const total = filteredOrders.length;
    let unpaid = 0;
    let packed = 0;
    let shipped = 0;
    let completed = 0;
    let cancelled = 0;

    filteredOrders.forEach(o => {
      const s = o.status.toUpperCase();
      if (s.includes("BATAL") || s.includes("CANCEL")) cancelled++;
      else if (s.includes("SELESAI") || s.includes("COMPLETED") || s.includes("DELIVERED")) completed++;
      else if (s.includes("KIRIM") || s.includes("SHIPPED") || s.includes("TRANSIT")) shipped++;
      else if (s.includes("BAYAR") || s.includes("UNPAID") || s.includes("PAYMENT")) unpaid++;
      else packed++; // Default: masuk ke kategori "Dikemas" / Proses
    });

    const getPct = (val: number) => total === 0 ? "0" : ((val / total) * 100).toFixed(1);

    return {
      total,
      unpaid: { count: unpaid, pct: getPct(unpaid) },
      packed: { count: packed, pct: getPct(packed) },
      shipped: { count: shipped, pct: getPct(shipped) },
      completed: { count: completed, pct: getPct(completed) },
      cancelled: { count: cancelled, pct: getPct(cancelled) }
    };
  }, [filteredOrders]);

  // PRESET TANGGAL UNTUK POPUP
  const handlePresetDate = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    setTempDateRange({ start: formatDate(start), end: formatDate(end) });
  };

  // FUNGSI EXPORT DATA KE EXCEL
  const executeExport = () => {
    // Validasi: Pastikan tanggal sudah diisi di popup export
    if (!exportDateRange.start || !exportDateRange.end) {
      alert("Mohon pilih rentang tanggal (Mulai & Sampai) terlebih dahulu untuk Export!");
      return;
    }

    // Ambil dari seluruh data 'orders', (tarik data murni berdasarkan tanggal export)
    const dataToExportRaw = orders.filter(order => {
      if (!order.date || order.date === "-") return false;
      const datePart = order.date.split(" ")[0];
      if (datePart && datePart.includes("/")) {
        const [day, month, year] = datePart.split("/");
        const formattedOrderDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        return formattedOrderDate >= exportDateRange.start && formattedOrderDate <= exportDateRange.end;
      }
      return false;
    });

    if (dataToExportRaw.length === 0) {
      alert("Tidak ada data untuk rentang tanggal tersebut.");
      return;
    }

    // Format data untuk diexport
    const dataToExport = dataToExportRaw.map(order => ({
      "Tanggal": order.date,
      "Order ID": order.orderId,
      "Nama Produk": order.productName,
      "SKU": order.sku,
      "Quantity": order.quantity,
      "Total Harga": order.amount,
      "Status": order.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Penjualan");
    
    // Nama file disesuaikan dengan rentang tanggal export
    XLSX.writeFile(workbook, `Laporan_Penjualan_${exportDateRange.start}_sd_${exportDateRange.end}.xlsx`);
    setIsExportDatePickerOpen(false); // Tutup popup setelah berhasil
  };

const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const workbook = XLSX.read(event.target?.result, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // 1. Cari baris mana yang merupakan header asli (mengabaikan judul aneh di baris atas)
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        const headerRowIndex = rawData.findIndex(row => 
          Array.isArray(row) && row.some(cell => String(cell || "").trim() === "No. Pesanan")
        );

        if (headerRowIndex === -1) {
          alert("Gagal: Kolom 'No. Pesanan' tidak ditemukan di file ini!");
          setIsUploading(false);
          return;
        }

        // 2. Baca ulang sheet secara otomatis mulai dari baris header tersebut (menggunakan fitur range)
        const jsonData = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex }) as any[];

        // 3. Bersihkan nama kolom dari spasi tersembunyi agar tidak meleset
        const cleanData = jsonData.map(row => {
          const newRow: any = {};
          for (let key in row) {
            newRow[key.trim()] = row[key];
          }
          return newRow;
        });

        // 4. Format data dengan mulus (tanpa logika indexOf yang rawan error)
        const formattedData = cleanData
          .filter(row => row["No. Pesanan"] !== undefined && String(row["No. Pesanan"]).trim() !== "")
          .map(row => {
            let rawAmount = row["Total Pembayaran"];
            // Hapus semua titik dan karakter non-angka agar tidak dibaca sebagai desimal
            let cleanAmount = Number(String(rawAmount || "0").replace(/[^0-9-]/g, ""));
            return {
              date: String(row["Waktu Pesanan Dibuat"] || "-"),
              order_id: String(row["No. Pesanan"] || "-"),
              product_name: String(row["Nama Produk"] || "Produk Tidak Diketahui"),
              sku: String(row["Nomor Referensi SKU"] || "-").trim(),
              quantity: Number(row["Jumlah"] || 0),
              amount: isNaN(cleanAmount) ? 0 : cleanAmount,
              status: String(row["Status Pesanan"] || "Unknown")
            };
          });

        const safeData = Array.isArray(formattedData) ? formattedData : [];

        if (safeData.length === 0) {
          alert("Data 0 / Format Excel tidak sesuai dengan standar laporan Shopee.");
          setIsUploading(false);
          return;
        }

        const res = await fetch('/api/shopee', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orders: safeData })
        });
        if (res.ok) fetchOrders();
      } catch (error) {
        console.error(error);
        alert("Gagal membaca file. Pastikan formatnya benar.");
      } finally {
        setIsUploading(false);
        e.target.value = ""; 
      }
    };
    reader.readAsBinaryString(file);
  };

  // LOGIKA PENGURUTAN (SORTING)
  const sortedOrders = useMemo(() => {
    let sortableItems = [...filteredOrders];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Penanganan khusus untuk tanggal ("DD/MM/YYYY HH:MM:SS" atau format Serial Excel)
        if (sortConfig.key === 'date') {
          const parseDate = (dateStr: string) => {
            if (!dateStr || dateStr === "-") return 0;
            
            // Jika formatnya angka serial dari Excel (contoh: "45321")
            if (!isNaN(Number(dateStr)) && Number(dateStr) > 20000) {
              return Math.round((Number(dateStr) - 25569) * 86400 * 1000);
            }

            // Jika formatnya Teks (DD/MM/YYYY)
            const [datePart, timePart] = String(dateStr).split(" ");
            if (datePart && datePart.includes("/")) {
              const [day, month, year] = datePart.split("/");
              if (year && year.length === 4) {
                return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart || "00:00:00"}`).getTime();
              }
            }
            return 0;
          };
          aValue = parseDate(aValue);
          bValue = parseDate(bValue);
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredOrders, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown size={14} className="ml-1 opacity-40 group-hover:opacity-100 transition-opacity" />;
    if (sortConfig.direction === 'asc') return <ArrowUp size={14} className="ml-1 text-[#EE4D2D]" />;
    return <ArrowDown size={14} className="ml-1 text-[#EE4D2D]" />;
  };

  if (!isMounted) return null;

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = sortedOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedOrders.length / itemsPerPage);

  const generatePagination = () => {
    if (totalPages <= 6) return Array.from({ length: totalPages }, (_, i) => i + 1);
    
    // Jika posisi di awal, tampilkan 5 halaman pertama lalu '...'
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    
    // Jika posisi di akhir, tampilkan '...' lalu 5 halaman terakhir
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    
    // Jika di tengah, tampilkan halaman aktif diapit '...'
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  // Fungsi untuk mengubah angka Excel (46058.xxx) menjadi Tanggal Normal
  const formatTanggalExcel = (excelDate: any) => {
    if (!excelDate || excelDate === "-") return "-";
    
    // Jika formatnya sudah berupa teks biasa (bukan angka serial)
    if (isNaN(Number(excelDate))) {
      return excelDate; 
    }

    // Jika formatnya angka seri Excel (misal: 46058.9600...)
    // 25569 adalah selisih hari antara 1 Jan 1900 (Excel) dan 1 Jan 1970 (Javascript)
    const date = new Date(Math.round((Number(excelDate) - 25569) * 86400 * 1000));
    
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper untuk warna badge status agar lebih premium
  const getStatusStyle = (status: string) => {
    const s = status.toUpperCase();
    if (s.includes("SELESAI") || s.includes("COMPLETED")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s.includes("BATAL") || s.includes("CANCEL")) return "bg-red-50 text-red-700 border-red-200";
    if (s.includes("PROSES") || s.includes("AWAITING")) return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  return (
    <>
      {/* MAIN CONTENT */}
      {/* Padding di HP dikurangi (p-4), dan dibatasi max-width nya */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-50/50 w-full max-w-[100vw]">
        {/* Di HP flex-col (atas bawah), di PC flex-row (kiri kanan) */}
        <header className="mb-6 md:mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Data Penjualan Shopee</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <CheckCircle2 size={14} className="text-[#EE4D2D]" />
              <span className="text-slate-500 font-medium text-sm">Tersinkronisasi dengan Cloud</span>
            </div>
          </div>
          
{/* Kontainer Kanan: Filter Tanggal + Tombol Upload */}
          <div className="flex items-center gap-3">
            {/* DATE PICKER CUSTOM (Desain Mockup) */}
            <div className="relative">
              <button 
                onClick={() => {
                  setTempDateRange(dateRange);
                  setIsDatePickerOpen(!isDatePickerOpen);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-orange-50 transition-colors text-sm font-medium text-slate-700"
              >
                <Calendar size={16} className="text-[#EE4D2D]" />
                {dateRange.start && dateRange.end 
                  ? `${dateRange.start} - ${dateRange.end}` 
                  : "Pilih Rentang Tanggal"}
              </button>

              {isDatePickerOpen && (
                <div className="absolute right-0 top-full mt-2 w-[500px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 flex flex-col overflow-hidden">
                  <div className="flex flex-row h-[280px]">
                    {/* Sidebar Preset */}
                    <div className="w-40 border-r border-slate-100 bg-slate-50/50 p-2 flex flex-col gap-1 overflow-y-auto">
                      <button onClick={() => handlePresetDate(0)} className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-orange-50 hover:text-[#EE4D2D] rounded-md transition-colors">Hari ini</button>
                      <button onClick={() => handlePresetDate(1)} className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-orange-50 hover:text-[#EE4D2D] rounded-md transition-colors">Kemarin</button>
                      <button onClick={() => handlePresetDate(7)} className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-orange-50 hover:text-[#EE4D2D] rounded-md transition-colors">7 hari terakhir</button>
                      <button onClick={() => handlePresetDate(30)} className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-orange-50 hover:text-[#EE4D2D] rounded-md transition-colors">30 hari terakhir</button>
                      <button onClick={() => handlePresetDate(90)} className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-orange-50 hover:text-[#EE4D2D] rounded-md transition-colors">3 bulan terakhir</button>
                      <button onClick={() => setTempDateRange({start: '', end: ''})} className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-orange-50 hover:text-[#EE4D2D] rounded-md transition-colors">Semua waktu</button>
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
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#EE4D2D] focus:ring-1 focus:ring-[#EE4D2D]"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-slate-500 mb-1.5">Sampai Tanggal</label>
                          <input 
                            type="date" 
                            value={tempDateRange.end}
                            onChange={(e) => setTempDateRange(prev => ({...prev, end: e.target.value}))}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#EE4D2D] focus:ring-1 focus:ring-[#EE4D2D]"
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
                            className="px-4 py-2 text-sm font-medium text-white bg-[#EE4D2D] hover:bg-[#d73211] rounded-lg shadow-sm transition-colors"
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

            {/* Tombol Upload */}
            {user?.role === 'admin' && (
              <label className="bg-[#EE4D2D] text-white px-4 py-2.5 rounded-lg cursor-pointer hover:bg-[#d73211] transition-colors text-sm font-medium shadow-sm flex items-center gap-2">
                <Upload size={16} />
                {isUploading ? "Memproses..." : "Upload Laporan"}
                <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />
              </label>
            )}
          </div>
        </header>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {/* Semua Pesanan */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-[#EE4D2D]/30 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[11px] font-medium text-slate-500">Semua Pesanan</p>
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <Package size={14} className="text-blue-500" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{new Intl.NumberFormat('id-ID').format(summaryMetrics.total)}</h3>
              <p className="text-[10px] text-slate-400 mt-1">100% dari total pesanan</p>
            </div>
          </div>

          {/* Menunggu Pembayaran */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-[#EE4D2D]/30 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[11px] font-medium text-slate-500 leading-tight">Menunggu Pembayaran</p>
              <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                <Wallet size={14} className="text-orange-500" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{new Intl.NumberFormat('id-ID').format(summaryMetrics.unpaid.count)}</h3>
              <p className="text-[10px] text-slate-400 mt-1">{summaryMetrics.unpaid.pct}% dari total pesanan</p>
            </div>
          </div>

          {/* Dikemas */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-[#EE4D2D]/30 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[11px] font-medium text-slate-500">Dikemas</p>
              <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                <Package size={14} className="text-purple-500" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{new Intl.NumberFormat('id-ID').format(summaryMetrics.packed.count)}</h3>
              <p className="text-[10px] text-slate-400 mt-1">{summaryMetrics.packed.pct}% dari total pesanan</p>
            </div>
          </div>

          {/* Dikirim */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-[#EE4D2D]/30 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[11px] font-medium text-slate-500">Dikirim</p>
              <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                <Truck size={14} className="text-green-600" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{new Intl.NumberFormat('id-ID').format(summaryMetrics.shipped.count)}</h3>
              <p className="text-[10px] text-slate-400 mt-1">{summaryMetrics.shipped.pct}% dari total pesanan</p>
            </div>
          </div>

          {/* Selesai */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-[#EE4D2D]/30 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[11px] font-medium text-slate-500">Selesai</p>
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <Check size={14} className="text-emerald-500" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{new Intl.NumberFormat('id-ID').format(summaryMetrics.completed.count)}</h3>
              <p className="text-[10px] text-slate-400 mt-1">{summaryMetrics.completed.pct}% dari total pesanan</p>
            </div>
          </div>

          {/* Dibatalkan */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-[#EE4D2D]/30 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[11px] font-medium text-slate-500">Dibatalkan</p>
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <XCircle size={14} className="text-red-500" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{new Intl.NumberFormat('id-ID').format(summaryMetrics.cancelled.count)}</h3>
              <p className="text-[10px] text-slate-400 mt-1">{summaryMetrics.cancelled.pct}% dari total pesanan</p>
            </div>
          </div>
        </div>

        {/* FILTER BAR PREMIUM */}
        {/* Di HP jadi flex-col, di PC flex-row */}
        <div className="mb-4 flex flex-col md:flex-row flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm w-full">
          
          {/* 1. Global Search Input */}
          <div className="flex-1 w-full md:min-w-[300px] relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari nomor pesanan atau nama produk..." 
              value={globalSearch}
              onChange={(e) => { setGlobalSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 text-sm text-slate-900 bg-slate-50 border border-transparent rounded-lg focus:bg-white focus:outline-none focus:border-[#EE4D2D] focus:ring-1 focus:ring-[#EE4D2D] transition-all placeholder:text-slate-400"
            />
          </div>
          <div className="relative min-w-[180px]">
            <select 
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:border-[#EE4D2D] hover:bg-slate-50 transition-colors shadow-sm"
            >
              <option value="Semua Status">Semua Status</option>
              {uniqueStatuses.map((status, idx) => (
<option key={idx} value={status}>{status}</option>
            ))}
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronDownIcon />
          </div>
        </div>
        <button className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
          <Filter size={16} className="text-slate-500"/> Filter Lainnya
        </button>
        {/* EXPORT BUTTON & POPUP */}
        <div className="relative w-full md:w-auto md:ml-auto">
          <button 
            onClick={() => setIsExportDatePickerOpen(!isExportDatePickerOpen)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#EE4D2D] bg-orange-50 border border-[#EE4D2D]/30 rounded-lg hover:bg-orange-100 transition-colors shadow-sm"
          >
            <Download size={16} /> Export Data
          </button>

          {isExportDatePickerOpen && (
            <div className="absolute right-0 top-full mt-2 w-[300px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-5 flex flex-col">
              <h4 className="font-medium text-slate-900 mb-4 text-sm">Pilih Tanggal Export</h4>
              <div className="flex flex-col gap-3 mb-5">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Mulai Tanggal</label>
                  <input 
                    type="date" 
                    value={exportDateRange.start}
                    onChange={(e) => setExportDateRange(prev => ({...prev, start: e.target.value}))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#EE4D2D] focus:ring-1 focus:ring-[#EE4D2D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Sampai Tanggal</label>
                  <input 
                    type="date" 
                    value={exportDateRange.end}
                    onChange={(e) => setExportDateRange(prev => ({...prev, end: e.target.value}))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#EE4D2D] focus:ring-1 focus:ring-[#EE4D2D]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => setIsExportDatePickerOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={executeExport}
                  className="px-3 py-2 text-xs font-medium text-white bg-[#EE4D2D] hover:bg-[#d73211] rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Download size={14} /> Download
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

        {/* DATA TABLE */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col w-full">
          {/* WAJIB: overflow-x-auto agar tabel bisa digeser (swipe) di layar HP */}
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-460px)] min-h-[350px] w-full">
            {/* WAJIB: min-w-[900px] memaksa tabel tidak gepeng di HP */}
            <table className="w-full min-w-[900px] text-left border-collapse relative">
              {/* Tambahkan sticky, top-0, z-10, dan efek blur transparan */}
              <thead className="bg-slate-50/95 backdrop-blur-sm sticky top-0 z-10 outline outline-1 outline-slate-200 shadow-sm">
                <tr>
                  <th 
                    className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group select-none"
                    onClick={() => requestSort('date')}
                  >
                    <div className="flex items-center">Tanggal {getSortIcon('date')}</div>
                  </th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Nama Produk</th>
                  <th 
                    className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group select-none"
                    onClick={() => requestSort('quantity')}
                  >
                    <div className="flex items-center justify-center">Qty {getSortIcon('quantity')}</div>
                  </th>
                  <th 
                    className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group select-none text-right"
                    onClick={() => requestSort('amount')}
                  >
                    <div className="flex items-center justify-end">Total Harga {getSortIcon('amount')}</div>
                  </th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentOrders.length > 0 ? (
                  currentOrders.map((order, index) => (
                    <tr key={index} className="hover:bg-orange-50/30 transition-colors group">
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{formatTanggalExcel(order.date)}</td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-500">{order.orderId}</td>
                      <td className="px-6 py-4 text-sm font-mono text-[#EE4D2D] font-semibold">{order.sku}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 max-w-[280px] truncate">{order.productName}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 text-center">{order.quantity}</td>
                      <td className={`px-6 py-4 text-sm font-semibold text-right ${order.amount < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                        {order.amount < 0 ? "-Rp. " : "Rp. "}{new Intl.NumberFormat('id-ID').format(Math.abs(order.amount))}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 inline-flex rounded-md text-[11px] font-semibold tracking-wide border ${getStatusStyle(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-24 text-center">
                       <div className="flex flex-col items-center justify-center text-slate-400">
                         <TableIcon size={32} className="mb-3 opacity-20" />
                         <p className="text-sm font-medium text-slate-500">Tidak ada data transaksi ditemukan.</p>
                       </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION (Sesuai Desain Mockup) */}
          {/* Di HP flex-col (atas bawah), di PC jadi sejajar */}
          <div className="sticky bottom-0 z-30 flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-4 bg-white border-t border-slate-200 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
            {/* Kiri: Info Data */}
            <p className="text-sm text-slate-600 text-center md:text-left">
              Menampilkan {filteredOrders.length === 0 ? 0 : indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredOrders.length)} dari {new Intl.NumberFormat('id-ID').format(filteredOrders.length)} data
            </p>

            {/* Kanan: Dropdown dan Pagination */}
            <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 w-full md:w-auto justify-center md:justify-end">
              {/* Dropdown Limit */}
              <div className="relative flex items-center border border-slate-200 rounded-md bg-white hover:bg-slate-50 transition-colors">
                <select 
                  value={itemsPerPage}
                  onChange={(e) => {setItemsPerPage(Number(e.target.value)); setCurrentPage(1);}}
                  className="w-full pl-3 pr-8 py-1.5 text-sm font-medium text-slate-700 bg-transparent outline-none cursor-pointer appearance-none"
                >
                  <option value={10}>10 / halaman</option>
                  <option value={50}>50 / halaman</option>
                  <option value={100}>100 / halaman</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDownIcon />
                </div>
              </div>

{/* Navigasi Pagination */}
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm font-medium text-slate-500 hover:text-[#EE4D2D] disabled:opacity-40 transition-colors"
                >
                  Previous
                </button>
                
                <div className="flex items-center gap-1 mx-2">
                  {generatePagination().map((page, index) => (
                    <button
                      key={index}
                      onClick={() => typeof page === 'number' && setCurrentPage(page)}
                      disabled={page === '...'}
                      className={`min-w-[28px] h-[28px] flex items-center justify-center text-sm rounded transition-all ${
                        currentPage === page 
                          ? 'bg-[#EE4D2D] text-white font-medium shadow-sm' 
                          : page === '...' 
                          ? 'text-slate-400 cursor-default' 
                          : 'text-slate-600 hover:bg-orange-50 hover:text-[#EE4D2D]'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm font-medium text-slate-500 hover:text-[#EE4D2D] disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// Ikon panah kecil untuk dropdown (agar terlihat lebih manis)
function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}