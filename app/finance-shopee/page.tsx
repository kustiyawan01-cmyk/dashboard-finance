"use client";

import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { 
  LayoutDashboard, Upload, BarChart3, Settings, 
  Table as TableIcon, ChevronLeft, ChevronRight, CheckCircle2,
  WalletCards, TrendingDown, CircleDollarSign, ArrowUpDown, ArrowUp, ArrowDown,
  Eye, X, Search, Calendar, Save, ShoppingBag
} from "lucide-react";
import Link from "next/link";

export default function FinanceShopeePage() {
  const [finances, setFinances] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // STATE UNTUK PAGINATION & FILTER
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [globalSearch, setGlobalSearch] = useState("");
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

useEffect(() => {
    const fetchFinance = async () => {
      try {
        const res = await fetch('/api/finance-shopee');
        if (res.ok) {
          const data = await res.json();
          // Hitung ulang 'fees' DAN 'revenue' agar muncul di Summary Cards setelah refresh
          const calculatedData = data.map((item: any) => {
            const originalPrice = Number(item.originalPrice) || 0;
            const sellerDiscount = Number(item.sellerDiscount) || 0;
            
            return {
              ...item,
              // Hitung Pendapatan Kotor (Sesuai rumus: Harga Asli - Diskon Produk)
              revenue: originalPrice - Math.abs(sellerDiscount),
              // Hitung Total Semua Potongan Shopee yang Baru
              fees: Math.abs(item.adminFee || 0) + 
                    Math.abs(item.serviceFee || 0) + 
                    Math.abs(item.freeOngkirXtra || 0) +
                    Math.abs(item.cashbackXtra || 0) +
                    Math.abs(item.ams || 0) +
                    Math.abs(item.affiliate || 0) +
                    Math.abs(item.pajak || 0) +
                    Math.abs(item.biayaCod || 0) +
                    Math.abs(item.shopeeAds || 0) +
                    Math.abs(item.penalti || 0) +
                    Math.abs(item.refund || 0) +
                    Math.abs(item.retur || 0) +
                    Math.abs(item.transferBank || 0) +
                    Math.abs(item.materai || 0) +
                    Math.abs(item.penyesuaianSistem || 0) +
                    Math.abs(item.shippingLogistics || 0)
            };
          });
          setFinances(calculatedData);
        }
      } catch (error) {
        console.error("Gagal menarik data Shopee");
      }
    };
    fetchFinance();
  }, []);

  // 2. LOGIKA UPLOAD CSV SHOPEE (Auto-Detect Header)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const binaryData = event.target?.result as string;
        const workbook = XLSX.read(binaryData, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // CARI BARIS HEADER
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        let headerRowIndex = -1;
        
        for (let i = 0; i < Math.min(20, rawData.length); i++) {
          const rowText = String(rawData[i]?.join(" ")).toLowerCase();
          if (rowText.includes("no. pesanan") || rowText.includes("waktu pesanan")) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) throw new Error("Header tidak ditemukan");

        const parsedData = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex }) as any[];

        const getVal = (row: any, keyName: string) => {
          const actualKey = Object.keys(row).find(k => k.trim().toLowerCase() === keyName.toLowerCase());
          return actualKey ? row[actualKey] : undefined;
        };

const formattedData = parsedData
  .filter(row => getVal(row, "No. Pesanan"))
  .map((row) => {
    const originalPrice = Number(getVal(row, "Harga Asli Produk")) || 0;
    const sellerDiscount = Number(getVal(row, "Total Diskon Produk")) || 0;
    const net = Number(getVal(row, "Pelepasan Dana")) || Number(getVal(row, "Total Penghasilan")) || 0;

    return {
      orderId: String(getVal(row, "No. Pesanan") || "-"),
      createdDate: String(getVal(row, "Waktu Pesanan Dibuat") || "-"),
      date: String(getVal(row, "Tanggal Dana Dilepaskan") || "-"),
      originalPrice,
      sellerDiscount,
      shippingBuyer: Number(getVal(row, "Ongkir Dibayar Pembeli")) || 0,
      shopeeSubsidy: Number(getVal(row, "Gratis Ongkir dari Shopee")) || 0,
      voucherShopee: Number(getVal(row, "Voucher Ditanggung Shopee")) || 0,
      cashbackShopee: Number(getVal(row, "Cashback Ditanggung Shopee")) || 0,
      penyesuaianSaldo: Number(getVal(row, "Penyesuaian Saldo")) || 0,
      codBuyer: Number(getVal(row, "Biaya COD Dibayar Pembeli")) || 0,
      kompensasi: Number(getVal(row, "Kompensasi")) || 0,
      adminFee: Number(getVal(row, "Biaya Administrasi")) || 0,
      serviceFee: Number(getVal(row, "Biaya Layanan")) || 0,
      freeOngkirXtra: Number(getVal(row, "Biaya Program Gratis Ongkir XTRA")) || 0,
      cashbackXtra: Number(getVal(row, "Biaya Program Cashback XTRA")) || 0,
      ams: Number(getVal(row, "Biaya Affiliate Marketing Solution")) || 0,
      affiliate: Number(getVal(row, "Komisi Shopee Affiliate")) || 0,
      pajak: Number(getVal(row, "Pajak")) || 0,
      biayaCod: Number(getVal(row, "Biaya COD")) || 0,
      voucherSeller: Number(getVal(row, "Voucher disponsor oleh Penjual")) || 0,
      cashbackSeller: Number(getVal(row, "Cashback Koin disponsori Penjual")) || 0,
      shopeeAds: Number(getVal(row, "Biaya Iklan Shopee Ads")) || Number(getVal(row, "Biaya Iklan")) || 0,
      penalti: Number(getVal(row, "Penalti")) || 0,
      refund: Number(getVal(row, "Jumlah Pengembalian Dana ke Pembeli")) || 0,
      retur: Number(getVal(row, "Retur Barang")) || 0,
      transferBank: Number(getVal(row, "Biaya Transfer Bank")) || 0,
      materai: Number(getVal(row, "Biaya Materai")) || 0,
      penyesuaianSistem: Number(getVal(row, "Penyesuaian Sistem")) || Number(getVal(row, "Potongan Lainnya")) || 0,
      shippingLogistics: Number(getVal(row, "Ongkir yang Diteruskan oleh Shopee ke Jasa Kirim")) || 0,
      net: net,
      qty: Number(getVal(row, "Jumlah")) || 1,
      revenue: originalPrice - Math.abs(sellerDiscount)
    };
  });

        setFinances(formattedData);
        setCurrentPage(1);
      } catch (error) {
        console.error(error);
        alert("Gagal membaca file. Pastikan mengunggah Laporan Penghasilan Shopee yang benar.");
      } finally {
        setIsUploading(false);
        e.target.value = ""; 
      }
    };
    reader.readAsBinaryString(file);
  };

  // 3. SIMPAN KE NEON
  const handleSaveToDatabase = async () => {
    if (finances.length === 0) return alert("Upload file dulu!");
    setIsSaving(true);
    try {
      const response = await fetch('/api/finance-shopee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finances),
      });
      if (response.ok) alert("Data Keuangan Shopee Sinkron!");
      else alert("Gagal simpan ke Cloud.");
    } catch (error) {
      alert("Kesalahan koneksi Database.");
    } finally { setIsSaving(false); }
  };

  // FORMATTERS
  const formatRupiah = (angka: any) => {
    const val = Number(angka) || 0;
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  const formatDisplayDate = (dateVal: any) => {
    if (!dateVal || dateVal === "-" || dateVal === "undefined") return "-";
    try {
      if (!isNaN(Number(dateVal)) && Number(dateVal) > 30000) {
        const jsDate = new Date(Math.round((Number(dateVal) - 25569) * 86400 * 1000));
        return `${String(jsDate.getDate()).padStart(2, '0')}/${String(jsDate.getMonth() + 1).padStart(2, '0')}/${jsDate.getFullYear()}`;
      }
      return String(dateVal).split(" ")[0];
    } catch (e) { return String(dateVal); }
  };

  // 4. SUMMARY CARDS
  const summaryMetrics = useMemo(() => {
    let totalRevenue = 0; let totalFees = 0; let totalNet = 0;
    finances.forEach(item => {
      totalRevenue += item.revenue;
      totalFees += item.fees;
      totalNet += item.net;
    });
    return { totalRevenue, totalFees, totalNet };
  }, [finances]);

  // 5. FILTERING
  const filteredFinances = useMemo(() => {
    return finances.filter(item => {
      const matchesSearch = item.orderId.toLowerCase().includes(globalSearch.toLowerCase());
      return matchesSearch;
    });
  }, [finances, globalSearch]);

  // 6. PAGINATION
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredFinances.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredFinances.length / (itemsPerPage || 1));

  const generatePagination = () => {
    const pages = [];
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else {
      if (currentPage <= 4) pages.push(1, 2, 3, 4, 5, '...', totalPages);
      else if (currentPage >= totalPages - 3) pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      else pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  return (
    <>
      <main className="flex-1 p-8">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Keuangan Shopee</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <CheckCircle2 size={14} className="text-[#EE4D2D]" />
              <span className="text-slate-500 font-medium text-sm">Upload file &quot;Income.csv&quot; Shopee</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSaveToDatabase} disabled={isSaving || finances.length === 0}
              className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 flex items-center gap-2 text-sm font-bold disabled:opacity-50 transition-all shadow-sm">
              <Save size={16} /> {isSaving ? "Menyimpan..." : "Simpan ke Neon"}
            </button>
            <label className="bg-[#EE4D2D] text-white px-4 py-2.5 rounded-lg cursor-pointer hover:bg-[#d73211] flex items-center gap-2 text-sm font-bold shadow-sm transition-all">
              <Upload size={16} /> {isUploading ? "Memproses..." : "Upload Shopee Income"}
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </header>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute right-4 top-4 bg-orange-50 p-2 rounded-full"><ShoppingBag size={20} className="text-[#EE4D2D]" /></div>
            <p className="text-sm font-medium text-slate-500 mb-1">Pendapatan Kotor (Setelah Diskon)</p>
            <h3 className="text-2xl font-bold text-slate-900">{formatRupiah(summaryMetrics.totalRevenue)}</h3>
          </div>
          <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm relative overflow-hidden">
            <div className="absolute right-4 top-4 bg-red-50 p-2 rounded-full"><TrendingDown size={20} className="text-red-500" /></div>
            <p className="text-sm font-medium text-red-500 mb-1">Total Biaya & Potongan</p>
            <h3 className="text-2xl font-bold text-red-600">{formatRupiah(summaryMetrics.totalFees)}</h3>
          </div>
          <div className="bg-[#EE4D2D] p-6 rounded-xl shadow-md text-white relative overflow-hidden">
            <div className="absolute right-4 top-4 bg-white/20 p-2 rounded-full"><WalletCards size={20} className="text-white" /></div>
            <p className="text-sm font-medium text-orange-100 mb-1">Total Pelepasan Dana (Net)</p>
            <h3 className="text-2xl font-bold text-white">{formatRupiah(summaryMetrics.totalNet)}</h3>
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="mb-4 flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex-1 min-w-[300px] relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Cari No. Pesanan..." value={globalSearch}
              onChange={(e) => { setGlobalSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-transparent rounded-lg focus:bg-white outline-none focus:ring-1 focus:ring-[#EE4D2D] transition-all" />
          </div>
        </div>

        {/* DATA TABLE (SATU SAJA, TIDAK GANDA) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-auto max-h-[65vh]">
            <table className="w-full text-left border-collapse relative">
              <thead className="bg-slate-50 sticky top-0 z-10 outline outline-1 outline-slate-200 shadow-sm">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">1. No. Pesanan</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">2. Tgl Selesai</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">3. QTY</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">4. Harga Jual</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">5. Harga Modal</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">6. Total HPP</th>
                  <th className="px-6 py-4 text-xs font-bold text-red-500 uppercase tracking-wider text-right">7. Total Potongan</th>
                  <th className="px-6 py-4 text-xs font-bold text-emerald-600 uppercase tracking-wider text-right">8. Laba Bersih</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentItems.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-slate-600 font-medium">{item.orderId}</td>
                    <td className="px-6 py-4 text-sm text-slate-700 font-medium">{formatDisplayDate(item.date)}</td>
                    <td className="px-6 py-4 text-base text-center text-slate-700 font-semibold">{item.qty || 1}</td>
                    <td className="px-6 py-4 text-base text-right text-slate-700 font-medium">{formatRupiah(item.originalPrice)}</td>
                    <td className="px-6 py-4 text-base text-right text-slate-600">{formatRupiah(item.hpp || 0)}</td>
                    <td className="px-6 py-4 text-base text-right text-slate-600">{formatRupiah(item.totalHpp || 0)}</td>
                    {/* Menggunakan item.fees agar seluruh potongan Shopee dijumlahkan */}
                    <td className="px-6 py-4 text-base text-right text-red-500 font-semibold">{formatRupiah(item.fees)}</td>
                    <td className="px-6 py-4 text-base text-right text-emerald-600 font-bold">{formatRupiah(item.labaBersih || item.net)}</td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => setSelectedOrder(item)} className="p-2 text-slate-400 hover:text-[#EE4D2D] transition-colors"><Eye size={20} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PAGINATION FOOTER */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-500">
              Menampilkan <span className="font-medium text-slate-900">{currentItems.length}</span> dari <span className="font-medium text-slate-900">{filteredFinances.length}</span> data
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="appearance-none bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-[#EE4D2D] focus:border-[#EE4D2D] block w-full pl-3 pr-8 py-1.5 cursor-pointer outline-none transition-all shadow-sm"
                >
                  <option value={10}>10 per halaman</option>
                  <option value={20}>20 per halaman</option>
                  <option value={50}>50 per halaman</option>
                  <option value={100}>100 per halaman</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-[#EE4D2D] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                
                <div className="flex items-center px-1">
                  {generatePagination().map((page, idx) => (
                    <button 
                      key={idx}
                      onClick={() => typeof page === 'number' && setCurrentPage(page)}
                      disabled={page === '...'}
                      className={`min-w-[28px] h-[28px] flex items-center justify-center text-sm rounded transition-all ${
                        currentPage === page 
                          ? 'bg-[#EE4D2D] text-white font-medium shadow-sm' 
                          : page === '...' 
                          ? 'text-slate-400 cursor-default' 
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-[#EE4D2D] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

{/* MODAL DETAIL SHOPEE (RINGKAS & SMART) */}
        {selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-200">
              <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 sticky top-0 z-10">
                <div>
                  <h3 className="font-bold text-[#EE4D2D] text-lg">Rincian Finansial Pesanan</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {selectedOrder.orderId}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
              </div>
              
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto bg-slate-50/30">
                
                {/* --- 1. SEKSI PEMASUKAN --- */}
                <section>
                  <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <ArrowUp size={14} /> Pemasukan
                  </h4>
                  <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm space-y-3 text-sm">
                    <DetailRow label="Harga Produk" desc="Total harga barang yang dibeli pembeli." value={selectedOrder.originalPrice} />
                    <DetailRow label="Ongkir Dibayar Pembeli" desc="Biaya pengiriman yang dibayar customer." value={selectedOrder.shippingBuyer} />
                    <DetailRow label="Subsidi Ongkir Shopee" desc="Bantuan ongkir dari Shopee." value={selectedOrder.shopeeSubsidy} color="text-emerald-600" isPlus />
                    <DetailRow label="Voucher Ditanggung Shopee" desc="Diskon promo yang dibayar Shopee." value={selectedOrder.voucherShopee} color="text-emerald-600" isPlus />
                    <DetailRow label="Cashback Shopee" desc="Cashback promo dari Shopee." value={selectedOrder.cashbackShopee} color="text-emerald-600" isPlus />
                    <DetailRow label="Pendapatan Penjualan" desc="Total pemasukan dari transaksi sebelum dipotong fee." value={selectedOrder.originalPrice - Math.abs(selectedOrder.sellerDiscount || 0)} bold />
                    <DetailRow label="Dana Diterima" desc="Saldo bersih yang masuk ke akun seller." value={selectedOrder.net} color="text-emerald-600" isPlus bold />
                    <DetailRow label="Penyesuaian Saldo" desc="Tambahan/koreksi saldo dari Shopee." value={selectedOrder.penyesuaianSaldo} color="text-emerald-600" isPlus />
                    <DetailRow label="Biaya COD Dibayar Pembeli" desc="Tambahan biaya layanan COD." value={selectedOrder.codBuyer} />
                    <DetailRow label="Kompensasi Shopee" desc="Ganti rugi atau kompensasi dari sistem." value={selectedOrder.kompensasi} color="text-emerald-600" isPlus />
                    
                    {/* TOTAL PENDAPATAN */}
                    <div className="pt-3 mt-3 border-t-2 border-dashed border-emerald-200 flex justify-between items-center text-emerald-700 font-bold text-base">
                      <span>Total Pendapatan</span>
                      <span>{formatRupiah(
                        Number(selectedOrder.originalPrice || 0) + 
                        Number(selectedOrder.shippingBuyer || 0) + 
                        Number(selectedOrder.shopeeSubsidy || 0) + 
                        Number(selectedOrder.voucherShopee || 0) + 
                        Number(selectedOrder.cashbackShopee || 0) + 
                        Number(selectedOrder.penyesuaianSaldo || 0) + 
                        Number(selectedOrder.codBuyer || 0) + 
                        Number(selectedOrder.kompensasi || 0)
                      )}</span>
                    </div>
                  </div>
                </section>

                {/* --- 2. SEKSI POTONGAN --- */}
                <section>
                  <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <ArrowDown size={14} /> Potongan
                  </h4>
                  <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm space-y-3 text-sm">
                    <DetailRow label="Biaya Administrasi" desc="Fee marketplace Shopee." value={selectedOrder.adminFee} color="text-red-500" isMinus />
                    <DetailRow label="Biaya Layanan" desc="Biaya tambahan layanan marketplace." value={selectedOrder.serviceFee} color="text-red-500" isMinus />
                    <DetailRow label="Biaya Program Gratis Ongkir XTRA" desc="Kontribusi seller untuk program free ongkir." value={selectedOrder.freeOngkirXtra} color="text-red-500" isMinus />
                    <DetailRow label="Biaya Cashback XTRA" desc="Potongan cashback promo." value={selectedOrder.cashbackXtra} color="text-red-500" isMinus />
                    <DetailRow label="Biaya Affiliate Marketing Solution (AMS)" desc="Komisi affiliate Shopee." value={selectedOrder.ams} color="text-red-500" isMinus />
                    <DetailRow label="Komisi Shopee Affiliate" desc="Fee creator/affiliate." value={selectedOrder.affiliate} color="text-red-500" isMinus />
                    <DetailRow label="Pajak (PPN/PPh)" desc="Potongan pajak transaksi." value={selectedOrder.pajak} color="text-red-500" isMinus />
                    <DetailRow label="Biaya COD" desc="Fee layanan Cash On Delivery." value={selectedOrder.biayaCod} color="text-red-500" isMinus />
                    <DetailRow label="Voucher Ditanggung Penjual" desc="Diskon seller." value={selectedOrder.voucherSeller} color="text-orange-600" isMinus />
                    <DetailRow label="Cashback Ditanggung Penjual" desc="Cashback promo seller." value={selectedOrder.cashbackSeller} color="text-orange-600" isMinus />
                    <DetailRow label="Biaya Iklan Shopee Ads" desc="Potongan biaya iklan otomatis." value={selectedOrder.shopeeAds} color="text-red-500" isMinus />
                    <DetailRow label="Penalti/Denda" desc="Potongan karena pelanggaran toko." value={selectedOrder.penalti} color="text-red-500" isMinus />
                    <DetailRow label="Refund Pembeli" desc="Dana dikembalikan ke pembeli." value={selectedOrder.refund} color="text-red-500" isMinus />
                    <DetailRow label="Retur Barang" desc="Potongan akibat retur." value={selectedOrder.retur} color="text-red-500" isMinus />
                    <DetailRow label="Biaya Transfer Bank" desc="Biaya pencairan saldo." value={selectedOrder.transferBank} color="text-red-500" isMinus />
                    <DetailRow label="Biaya Materai" desc="Potongan dokumen/transaksi tertentu." value={selectedOrder.materai} color="text-red-500" isMinus />
                    <DetailRow label="Penyesuaian Sistem" desc="Adjustment manual dari Shopee." value={selectedOrder.penyesuaianSistem} color="text-red-500" isMinus />
                    
                    {/* TOTAL POTONGAN */}
                    <div className="pt-3 mt-3 border-t-2 border-dashed border-red-200 flex justify-between items-center text-red-600 font-bold text-base">
                      <span>Total Potongan</span>
                      <span>-{formatRupiah(
                        Math.abs(Number(selectedOrder.adminFee || 0)) + 
                        Math.abs(Number(selectedOrder.serviceFee || 0)) + 
                        Math.abs(Number(selectedOrder.freeOngkirXtra || 0)) +
                        Math.abs(Number(selectedOrder.cashbackXtra || 0)) +
                        Math.abs(Number(selectedOrder.ams || 0)) +
                        Math.abs(Number(selectedOrder.affiliate || 0)) +
                        Math.abs(Number(selectedOrder.pajak || 0)) +
                        Math.abs(Number(selectedOrder.biayaCod || 0)) +
                        Math.abs(Number(selectedOrder.voucherSeller || 0)) +
                        Math.abs(Number(selectedOrder.cashbackSeller || 0)) +
                        Math.abs(Number(selectedOrder.shopeeAds || 0)) +
                        Math.abs(Number(selectedOrder.penalti || 0)) +
                        Math.abs(Number(selectedOrder.refund || 0)) +
                        Math.abs(Number(selectedOrder.retur || 0)) +
                        Math.abs(Number(selectedOrder.transferBank || 0)) +
                        Math.abs(Number(selectedOrder.materai || 0)) +
                        Math.abs(Number(selectedOrder.penyesuaianSistem || 0))
                      )}</span>
                    </div>
                  </div>
                </section>

                {/* --- 3. HASIL AKHIR --- */}
                <div className="bg-[#EE4D2D] p-5 rounded-xl shadow-lg border border-orange-600 sticky bottom-0 z-10 mt-4">
                  <div className="flex justify-between items-center text-white">
                    <div>
                      <span className="block text-sm font-medium opacity-90">Dana Diterima (Settlement)</span>
                      <span className="block text-[10px] text-orange-200 mt-0.5">Saldo bersih yang masuk ke akun seller.</span>
                    </div>
                    <span className="text-3xl font-bold tracking-tight">{formatRupiah(selectedOrder.net)}</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

// Komponen Pembantu agar ringkas dan HANYA memunculkan yang ada nilainya (> 0)
function DetailRow({ label, desc, value, isMinus = false, isPlus = false, color = "text-slate-900", bold = false }: any) {
  if (!value || Math.abs(Number(value)) === 0) return null;
  
  const formatRupiah = (angka: any) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Math.abs(Number(angka)));
  };

  return (
    <div className="flex justify-between items-center border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
      <div>
        <span className={`block font-medium ${bold ? 'text-slate-900 font-bold' : 'text-slate-700'}`}>{label}</span>
        <span className="block text-[10px] text-slate-400">{desc}</span>
      </div>
      <span className={`font-semibold ${color} ${bold ? 'font-bold text-lg' : ''}`}>
        {isMinus ? '-' : isPlus ? '+' : ''}{formatRupiah(value)}
      </span>
    </div>
  );
}
