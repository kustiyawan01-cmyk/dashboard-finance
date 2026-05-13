"use client";

import { useAuth } from "@/app/context/AuthContext";
import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { 
  LayoutDashboard, Upload, BarChart3, Settings, 
  Table as TableIcon, ChevronLeft, ChevronRight, CheckCircle2,
  WalletCards, TrendingDown, CircleDollarSign, ArrowUpDown, ArrowUp, ArrowDown,
  Eye, X, Search, Calendar, Save, Check, ShoppingBag, Download, Receipt, TrendingUp,
  Megaphone, Users, Truck, Box, Percent, Wallet, Lock, Package
} from "lucide-react";

export default function FinanceShopeePage() {
  const { user } = useAuth();
  const [finances, setFinances] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // STATE UNTUK MENAMPUNG DATA PENJUALAN & PRODUK (Untuk tarik QTY, SKU & HPP)
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // STATE FILTER & PAGINATION
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  // Default langsung diurutkan berdasarkan Tanggal Selesai (date) dari yang Paling Baru (desc)
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });
  
  const [globalSearch, setGlobalSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState({ start: '', end: '' });
  
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // --- FETCH DATA AWAL ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Tarik Penjualan Shopee (Untuk QTY & SKU)
        const resSales = await fetch('/api/shopee');
        if (resSales.ok) setSalesOrders(await resSales.json());

        // Tarik Database Finance Shopee
        const resFinance = await fetch('/api/finance-shopee');
        if (resFinance.ok) setFinances(await resFinance.json());

        // Tarik Master Produk (Untuk HPP)
        const resProducts = await fetch('/api/products');
        if (resProducts.ok) setProducts(await resProducts.json());
      } catch (error) {
        console.error("Gagal menarik data", error);
      }
    };
    fetchData();
  }, []);

  // --- FUNGSI UPLOAD EXCEL SHOPEE (SANGAT TANGGUH) ---
  const handleFileUpload = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (evt: any) => {
      try {
        const data = new Uint8Array(evt.target.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        
        // Cari sheet Income / Laporan Penghasilan
        const wsname = wb.SheetNames.find(name => name.toLowerCase().includes('income') || name.toLowerCase().includes('penghasilan')) || wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: false, defval: "" });

        // Cari Baris Header Asli
        let headerIdx = -1;
        for (let i = 0; i < Math.min(20, rows.length); i++) {
          const rowStr = rows[i].join("|").toLowerCase();
          if (rowStr.includes("no. pesanan") || rowStr.includes("order id")) {
            headerIdx = i; break;
          }
        }

        if (headerIdx === -1) {
           alert("Gagal menemukan kolom 'No. Pesanan'. Pastikan ini laporan Penghasilan Shopee yang benar.");
           setIsUploading(false); return; 
        }

        const headers = Array.from(rows[headerIdx] || []).map(h => String(h || "").trim().toLowerCase());
        
        // Perbaikan Logika: Utamakan kecocokan nama persis agar tidak tertukar dengan kolom Tanggal
        const findIdx = (keys: string[]) => {
          let idx = headers.findIndex(h => keys.includes(h)); 
          if (idx === -1) {
            idx = headers.findIndex(h => keys.some(k => h.includes(k)));
          }
          return idx;
        };

        // MAPPING KOLOM SHOPEE
        const iID = findIdx(['no. pesanan', 'order id']);
        const iStatus = findIdx(['status']);
        const iCreatedDate = findIdx(['waktu pesanan dibuat']);
        const iDate = findIdx(['tanggal dana dilepaskan', 'waktu penyelesaian']);
        
        // MAPPING PEMASUKAN SHOPEE
        const iHargaAsli = findIdx(['harga asli produk']);
        const iOngkirPembeli = findIdx(['ongkir dibayar pembeli']);
        const iSubsidiOngkir = findIdx(['gratis ongkir dari shopee', 'subsidi ongkos kirim shopee', 'diskon ongkir ditanggung jasa kirim']);
        const iVoucherShopee = findIdx(['diskon produk dari shopee', 'voucher ditanggung shopee']);
        const iCashbackShopee = findIdx(['cashback shopee']);
        const iPenyesuaianSaldo = findIdx(['penyesuaian saldo']);
        const iCodPembeli = findIdx(['biaya cod dibayar pembeli']);
        const iKompensasi = findIdx(['kompensasi shopee', 'kompensasi']);
        const iDanaDiterima = findIdx(['total penghasilan', 'dana dilepaskan']);

        // MAPPING POTONGAN SHOPEE
        const iAdmin = findIdx(['biaya administrasi']);
        const iLayanan = findIdx(['biaya layanan']);
        const iOngkirXtra = findIdx(['biaya program hemat biaya kirim', 'biaya program gratis ongkir xtra']);
        const iCashbackXtra = findIdx(['biaya kampanye', 'biaya cashback xtra']);
        const iAms = findIdx(['biaya komisi ams', 'biaya affiliate marketing solution']);
        const iKomisiAffiliate = findIdx(['komisi shopee affiliate']);
        const iPajak = findIdx(['bea masuk, ppn & pph', 'pajak']);
        const iBiayaCod = findIdx(['biaya cod', 'biaya penanganan']);
        const iVoucherPenjual = findIdx(['voucher disponsori oleh penjual', 'voucher ditanggung penjual', 'total diskon produk']);
        const iCashbackPenjual = findIdx(['cashback koin co-fund disponsori penjual', 'cashback ditanggung penjual']);
        const iShopeeAds = findIdx(['biaya iklan', 'shopee ads']);
        const iPenalti = findIdx(['penalti', 'denda']);
        const iRefund = findIdx(['jumlah pengembalian dana ke pembeli', 'refund pembeli']);
        const iRetur = findIdx(['ongkos kirim pengembalian barang', 'retur barang']);
        const iTransfer = findIdx(['biaya transfer']);
        const iMaterai = findIdx(['biaya materai']);
        const iPenyesuaianSistem = findIdx(['penyesuaian sistem']);

        let finalData: any[] = [];

        for (let i = headerIdx + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[iID]) continue;

          let cleanID = String(row[iID]).trim(); 
          if (cleanID.length < 5) continue;

          const cleanNum = (val: any) => {
            if (!val) return 0;
            let s = String(val).replace(/[^0-9.-]+/g, "");
            const num = parseFloat(s);
            return isNaN(num) ? 0 : Math.round(num);
          };

          // TARIK DATA PRODUK DARI SALES
          const matchingSales = salesOrders.find((s: any) => String(s.orderId || s.order_id).trim() === cleanID);
          let qty = matchingSales?.quantity || matchingSales?.qty || 1;
          let sku = matchingSales?.sku || matchingSales?.sku_produk || null;
          let productName = matchingSales?.productName || matchingSales?.nama_produk || "Produk Shopee";

          // TARIK HPP DARI MASTER PRODUK
          let hppPerItem = 0;
          if (sku) {
            const matchProd = products.find(p => String(p.sku).toLowerCase() === String(sku).toLowerCase());
            if (matchProd) hppPerItem = cleanNum(matchProd.hargaModal || matchProd.hpp);
          }
          if (hppPerItem === 0 && productName) {
            const matchProdName = products.find(p => String(p.name || p.nama).toLowerCase() === String(productName).toLowerCase());
            if (matchProdName) hppPerItem = cleanNum(matchProdName.hargaModal || matchProdName.hpp);
          }

          // PEMASUKAN
          const hargaProduk = cleanNum(row[iHargaAsli]);
          const ongkirPembeli = cleanNum(row[iOngkirPembeli]);
          const subsidiOngkir = cleanNum(row[iSubsidiOngkir]);
          const voucherShopee = cleanNum(row[iVoucherShopee]);
          const cashbackShopee = cleanNum(row[iCashbackShopee]);
          const penyesuaianSaldo = cleanNum(row[iPenyesuaianSaldo]);
          const codPembeli = cleanNum(row[iCodPembeli]);
          const kompensasi = cleanNum(row[iKompensasi]);
          const danaDiterima = cleanNum(row[iDanaDiterima]); // Ini NETT

          // POTONGAN
          const admin = Math.abs(cleanNum(row[iAdmin]));
          const layanan = Math.abs(cleanNum(row[iLayanan]));
          const ongkirXtra = Math.abs(cleanNum(row[iOngkirXtra]));
          const cashbackXtra = Math.abs(cleanNum(row[iCashbackXtra]));
          const ams = Math.abs(cleanNum(row[iAms]));
          const komisiAffiliate = Math.abs(cleanNum(row[iKomisiAffiliate]));
          const pajak = Math.abs(cleanNum(row[iPajak]));
          const biayaCod = Math.abs(cleanNum(row[iBiayaCod]));
          const voucherPenjual = Math.abs(cleanNum(row[iVoucherPenjual]));
          const cashbackPenjual = Math.abs(cleanNum(row[iCashbackPenjual]));
          const shopeeAds = Math.abs(cleanNum(row[iShopeeAds]));
          const penalti = Math.abs(cleanNum(row[iPenalti]));
          const refund = Math.abs(cleanNum(row[iRefund]));
          const retur = Math.abs(cleanNum(row[iRetur]));
          const transfer = Math.abs(cleanNum(row[iTransfer]));
          const materai = Math.abs(cleanNum(row[iMaterai]));
          const penyesuaianSistem = Math.abs(cleanNum(row[iPenyesuaianSistem]));

          const totalPotongan = admin + layanan + ongkirXtra + cashbackXtra + ams + komisiAffiliate + pajak + biayaCod + voucherPenjual + cashbackPenjual + shopeeAds + penalti + refund + retur + transfer + materai + penyesuaianSistem;
          
          let statusPesanan = String(row[iStatus] || matchingSales?.status || "Selesai");
          if (refund > 0 || retur > 0) statusPesanan = "Retur / Refund";

          const isCancelled = statusPesanan.toLowerCase().includes("batal");
          const totalHpp = isCancelled ? 0 : (qty * hppPerItem);
          const labaBersih = isCancelled ? 0 : (danaDiterima - totalHpp);

          finalData.push({
            orderId: cleanID, orderStatus: statusPesanan, 
            createdDate: String(row[iCreatedDate] || "-"), date: String(row[iDate] || "-"), 
            qty, sku, productName, hppPerItem, totalHpp, 
            net: danaDiterima, labaBersih,
            
            // Simpan Pemasukan
            hargaProduk, ongkirPembeli, subsidiOngkir, voucherShopee, cashbackShopee, 
            penyesuaianSaldo, codPembeli, kompensasi,
            
            // Simpan Potongan
            admin, layanan, ongkirXtra, cashbackXtra, ams, komisiAffiliate, pajak, biayaCod,
            voucherPenjual, cashbackPenjual, shopeeAds, penalti, refund, retur, transfer, materai, penyesuaianSistem,
            fees: totalPotongan
          });
        }

        if (finalData.length === 0) alert("Data kosong / Format Excel tidak sesuai.");
        else setFinances(finalData);

        setIsUploading(false);
      } catch (err) {
        console.error(err);
        alert("Gagal membaca file.");
        setIsUploading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSaveToDatabase = async () => {
    if (finances.length === 0) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/finance-shopee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finances),
      });
      if (response.ok) alert("Data berhasil disimpan ke Database!");
    } catch (error) { alert("Gagal menyimpan data."); }
    finally { setIsSaving(false); }
  };

  // --- LOGIKA FILTERING & SORTING SAMA PERSIS TIKTOK ---
  const filteredFinances = useMemo(() => {
    return finances.filter(item => {
      const matchesSearch = globalSearch === "" || String(item.orderId).toLowerCase().includes(globalSearch.toLowerCase());
      const matchesStatus = statusFilter === "Semua Status" || item.orderStatus === statusFilter;
      let matchesDate = true;
      if (dateRange.start && dateRange.end && item.date && item.date !== "-") {
        const datePart = String(item.date).split(" ")[0].replace(/\//g, "-"); 
        matchesDate = datePart >= dateRange.start && datePart <= dateRange.end;
      }
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [finances, globalSearch, statusFilter, dateRange]);

  const summaryMetrics = useMemo(() => {
    let omzet = 0, produkTerjual = 0, totalFee = 0, iklan = 0, affiliate = 0, gratisOngkir = 0;
    let modal = 0, profitBersih = 0, saldo = 0, danaCair = 0, danaDitahan = 0;

    filteredFinances.forEach(item => {
      omzet += (item.hargaProduk || 0);
      produkTerjual += (item.qty || 0);
      totalFee += (item.fees || 0);
      iklan += (item.shopeeAds || 0);
      affiliate += ((item.komisiAffiliate || 0) + (item.ams || 0));
      gratisOngkir += (item.ongkirXtra || 0);
      modal += (item.totalHpp || 0);
      profitBersih += (item.labaBersih || 0);
      saldo += (item.net || 0);

      // Logika Dana Cair (Hanya yang statusnya selesai)
      if (item.orderStatus === "Selesai") {
        danaCair += (item.net || 0);
      } else {
        danaDitahan += (item.net || 0);
      }
    });

    const totalOrder = filteredFinances.length;
    const aov = totalOrder > 0 ? omzet / totalOrder : 0;
    const profitKotor = omzet - modal;
    const margin = omzet > 0 ? (profitBersih / omzet) * 100 : 0;

    return {
      omzet, totalOrder, produkTerjual, aov,
      totalFee, iklan, affiliate, gratisOngkir,
      modal, profitKotor, profitBersih, margin,
      saldo, danaCair, danaDitahan, settlement: saldo
    };
  }, [filteredFinances]);

  const sortedFinances = useMemo(() => {
    let sortableItems = [...filteredFinances];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // KHUSUS UNTUK TANGGAL: Ubah teks menjadi angka waktu agar urutannya 100% akurat
        if (sortConfig.key === 'date' || sortConfig.key === 'createdDate') {
          const parseDate = (d: string) => {
            if (!d || d === "-") return 0;
            const dateOnly = d.split(" ")[0]; // Buang jam jika ada
            // Jika format YYYY-MM-DD
            if (dateOnly.includes("-")) return new Date(dateOnly).getTime();
            // Jika format DD/MM/YYYY
            if (dateOnly.includes("/")) {
              const parts = dateOnly.split("/");
              if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
            }
            return 0;
          };
          aValue = parseDate(String(aValue));
          bValue = parseDate(String(bValue));
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredFinances, sortConfig]);

  const requestSort = (key: string) => setSortConfig({ key, direction: sortConfig?.direction === 'asc' ? 'desc' : 'asc' });

  // PAGINATION
  const indexOfLastItem = currentPage * itemsPerPage;
  const currentItems = sortedFinances.slice(indexOfLastItem - itemsPerPage, indexOfLastItem);
  const totalPages = Math.ceil(sortedFinances.length / (itemsPerPage || 1));

  const formatRupiah = (angka: any) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(angka) || 0);

  return (
    <>
      <main className="flex-1 p-8 h-screen overflow-hidden flex flex-col bg-slate-50/50">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Laba Rugi & Pencairan Shopee</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <CheckCircle2 size={10} className="text-[#EE4D2D]" />
              <span className="text-slate-500 font-medium text-sm">Kelola &quot;Data Keuangan&quot; Shopee Seller</span>
            </div>
          </div>
          
          <div className="flex gap-3">
            {user?.role === 'admin' && (
              <>
                <button onClick={handleSaveToDatabase} disabled={isSaving || finances.length === 0} className="bg-[#EE4D2D] text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-[#d73211] disabled:opacity-50 flex items-center gap-2 text-sm font-bold transition-all shadow-sm">
                  <Save size={16} /> {isSaving ? "Menyimpan..." : "Simpan ke Database"}
                </button>
                <label className="bg-slate-900 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-slate-800 flex items-center gap-2 text-sm font-bold shadow-sm">
                  <Upload size={16} /> {isUploading ? "Memproses..." : "Upload Excel Laporan"}
                  <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />
                </label>
              </>
            )}
          </div>
        </header>

        {/* SUMMARY CARDS KEUANGAN (4 KOTAK UTAMA) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
            <div className="absolute right-4 top-4 bg-blue-50 p-2 rounded-xl"><CircleDollarSign size={20} className="text-blue-500" /></div>
            <p className="text-sm font-bold text-slate-500 mb-1">Total Penjualan</p>
            <h3 className="text-2xl font-black text-slate-900">{formatRupiah(summaryMetrics.omzet)}</h3>
            <p className="text-xs text-slate-400 mt-1 font-medium">Harga barang asli sebelum dipotong</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm flex flex-col justify-center relative overflow-hidden">
            <div className="absolute right-4 top-4 bg-red-50 p-2 rounded-xl"><TrendingDown size={20} className="text-red-500" /></div>
            <p className="text-sm font-bold text-red-500 mb-1">Total Potongan</p>
            <h3 className="text-2xl font-black text-red-600">-{formatRupiah(summaryMetrics.totalFee)}</h3>
            <p className="text-xs text-red-400 mt-1 font-medium">Biaya platform, admin, iklan, dll</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-orange-100 shadow-sm flex flex-col justify-center relative overflow-hidden">
            <div className="absolute right-4 top-4 bg-orange-50 p-2 rounded-xl"><ShoppingBag size={20} className="text-[#EE4D2D]" /></div>
            <p className="text-sm font-bold text-slate-500 mb-1">Total HPP Produk</p>
            <h3 className="text-2xl font-black text-slate-900">{formatRupiah(summaryMetrics.modal)}</h3>
            <p className="text-xs text-slate-400 mt-1 font-medium">Akumulasi modal barang terjual</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-2xl border border-emerald-600 shadow-md flex flex-col justify-center relative overflow-hidden text-white">
            <div className="absolute right-4 top-4 bg-white/20 p-2 rounded-xl"><BarChart3 size={20} className="text-white" /></div>
            <p className="text-sm font-bold text-emerald-100 mb-1">Profit Bersih</p>
            <h3 className="text-2xl font-black text-white">{formatRupiah(summaryMetrics.profitBersih)}</h3>
            <p className="text-xs text-emerald-100 mt-1 font-medium">Pencairan (Settlement) - Total HPP</p>
          </div>

        </div>

        {/* FILTER BAR */}
        <div className="mb-4 flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex-1 min-w-[300px] relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Cari Order ID..." value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 rounded-lg outline-none focus:ring-1 focus:ring-[#EE4D2D]" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="py-2 pl-4 pr-8 bg-white border border-slate-200 rounded-lg text-sm outline-none cursor-pointer">
            <option value="Semua Status">Semua Status</option>
            <option value="Selesai">Selesai</option>
            <option value="Retur / Refund">Retur / Refund</option>
            <option value="Batal">Batal</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm hover:bg-slate-50"><Calendar size={16} className="text-[#EE4D2D]"/> Filter Tanggal</button>
          <button className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-[#EE4D2D] border border-orange-200 rounded-lg text-sm font-medium hover:bg-orange-100 ml-auto"><Download size={16}/> Export Data</button>
        </div>

        {/* TABEL DATA */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
{/* --- AREA SCROLL ISI TABEL --- */}
          {/* Tambahan w-full dan perbaikan agar bisa digeser horizontal di HP */}
          <div className="overflow-x-auto overflow-y-auto flex-1 relative w-full">
            <table className="w-full min-w-[800px] text-left border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10 outline outline-1 outline-slate-200">
                <tr>
                  <th onClick={()=>requestSort('orderId')} className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase cursor-pointer hover:bg-slate-100">Order ID</th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase">Tgl Selesai</th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase text-center">QTY</th>
                  <th onClick={()=>requestSort('hargaProduk')} className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase cursor-pointer text-right">Harga Jual</th>
                  <th onClick={()=>requestSort('hppPerItem')} className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase bg-slate-100/50 text-right">Harga Modal</th>
                  <th onClick={()=>requestSort('totalHpp')} className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase bg-slate-100/50 text-right">Total HPP</th>
                  <th onClick={()=>requestSort('fees')} className="px-6 py-3.5 text-[11px] font-semibold text-red-500 uppercase text-right">Potongan</th>
                  <th onClick={()=>requestSort('labaBersih')} className="px-6 py-3.5 text-[11px] font-bold text-emerald-600 uppercase text-right">Laba Bersih</th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase text-center">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentItems.map((item, i) => (
                  <tr key={i} className="hover:bg-orange-50/30">
                    <td className="px-6 py-4 text-sm font-mono font-bold text-slate-900">{item.orderId}</td>
                    <td className="px-6 py-4"><span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md ${item.orderStatus.includes('Retur')?'bg-red-100 text-red-600':item.orderStatus.includes('Batal')?'bg-slate-100 text-slate-600':'bg-emerald-100 text-emerald-600'}`}>{item.orderStatus}</span></td>
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{item.date?.split(" ")[0]}</td>
                    <td className="px-6 py-4 text-sm text-center font-bold">{item.qty}</td>
                    <td className="px-6 py-4 text-sm text-right text-slate-600">{formatRupiah(item.hargaProduk)}</td>
                    <td className="px-6 py-4 text-sm text-right text-slate-500">{formatRupiah(item.hppPerItem)}</td>
                    <td className="px-6 py-4 text-sm text-right bg-slate-50 font-bold text-slate-700">{formatRupiah(item.totalHpp)}</td>
                    <td className="px-6 py-4 text-sm text-right text-red-500">-{formatRupiah(item.fees)}</td>
                    <td className={`px-6 py-4 text-sm text-right font-bold ${item.labaBersih < 0 ? 'text-red-500' : 'text-emerald-600'}`}>{formatRupiah(item.labaBersih)}</td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => setSelectedOrder(item)} className="p-1.5 text-slate-400 hover:text-[#EE4D2D] hover:bg-orange-50 rounded-md"><Eye size={18}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* PAGINATION FOOTER */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm text-slate-500">
             <span>Menampilkan {filteredFinances.length === 0 ? 0 : indexOfLastItem - itemsPerPage + 1} - {Math.min(indexOfLastItem, filteredFinances.length)} dari {filteredFinances.length} data</span>
             <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p=>p-1)} disabled={currentPage===1} className="px-3 py-1 bg-white border rounded hover:bg-slate-50 disabled:opacity-50">Prev</button>
                <button onClick={() => setCurrentPage(p=>p+1)} disabled={currentPage===totalPages} className="px-3 py-1 bg-white border rounded hover:bg-slate-50 disabled:opacity-50">Next</button>
             </div>
          </div>
        </div>

        {/* MODAL DETAIL KEUANGAN (NEW DESIGN - TIKTOK STYLE WITH SHOPEE DATA) */}
        {selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl relative flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-300">
              
              {/* HEADER */}
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                    <Calendar className="text-blue-500" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Detail Penyelesaian Transaksi</h2>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-100">
                        <CheckCircle2 size={12} />
                        Telah diselesaikan
                      </div>
                      <span className="text-slate-500 text-sm">{selectedOrder.date?.split(" ")[0] || "-"}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 bg-slate-50 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                >
                  <X size={20} />
                </button>
              </div>

              {/* BODY (Scrollable) */}
              <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
                
                {/* INFO ROW */}
                <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
                  <div>
                    <p className="text-slate-500 mb-1">ID Pesanan</p>
                    <p className="font-semibold text-slate-900 flex items-center gap-2">
                      {selectedOrder.orderId}
                      <button className="text-indigo-500 hover:text-indigo-700"><Search size={14} /></button>
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-slate-500 mb-1">Nama Produk</p>
                    <p className="font-semibold text-slate-900 truncate" title={selectedOrder.productName || "Tidak Diketahui"}>
                      {selectedOrder.productName || "Tidak Diketahui"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-slate-500 mb-1">SKU / Variasi</p>
                    <p className="font-semibold text-slate-900 truncate" title={selectedOrder.sku || "-"}>
                      {selectedOrder.sku || "-"}
                    </p>
                  </div>
                </div>

                {/* HIGHLIGHT CARDS */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-6 mb-6 shadow-sm">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-500 mb-1">Dana diselesaikan</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatRupiah(selectedOrder.net)}</p>
                  </div>
                  <div className="w-px h-12 bg-slate-200"></div>
                  <div className="flex-1 flex items-center gap-3">
                    <div className="bg-emerald-50 p-2 rounded-lg">
                       <ArrowUp className="text-emerald-500" size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Total Pendapatan</p>
                      <p className="text-base font-bold text-slate-900">{formatRupiah((selectedOrder.hargaProduk || 0) + (selectedOrder.ongkirPembeli || 0) + (selectedOrder.subsidiOngkir || 0) + (selectedOrder.voucherShopee || 0) + (selectedOrder.cashbackShopee || 0) + (selectedOrder.penyesuaianSaldo || 0) + (selectedOrder.codPembeli || 0) + (selectedOrder.kompensasi || 0))}</p>
                    </div>
                  </div>
                  <div className="w-px h-12 bg-slate-200"></div>
                  <div className="flex-1 flex items-center gap-3">
                    <div className="bg-red-50 p-2 rounded-lg">
                       <TrendingDown className="text-red-500" size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Total Potongan</p>
                      <p className="text-base font-bold text-red-600">-{formatRupiah(selectedOrder.fees)}</p>
                    </div>
                  </div>
                </div>

                {/* --- MAIN CONTENT LAYOUT (FLEX COLUMNS) --- */}
                <div className="flex flex-col md:flex-row gap-4 mb-2 items-start">
                  
                  {/* KOLOM KIRI */}
                  <div className="flex flex-col gap-4 flex-1 w-full">
                    
                    {/* Pendapatan dari Pesanan */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <CircleDollarSign className="text-emerald-500" size={16} />
                        <h3 className="font-bold text-slate-900 text-sm">Pendapatan dari Pesanan</h3>
                      </div>
                      <div className="space-y-2 text-xs">
                        <DetailRow label="Harga Produk" value={selectedOrder.hargaProduk} />
                        <DetailRow label="Ongkir Dibayar Pembeli" value={selectedOrder.ongkirPembeli} />
                        <DetailRow label="Subsidi Ongkir Shopee" value={selectedOrder.subsidiOngkir} />
                        <DetailRow label="Voucher Ditanggung Shopee" value={selectedOrder.voucherShopee} />
                        <DetailRow label="Cashback Shopee" value={selectedOrder.cashbackShopee} />
                        <DetailRow label="Pendapatan Penjualan" value={(selectedOrder.hargaProduk || 0) + (selectedOrder.ongkirPembeli || 0) + (selectedOrder.subsidiOngkir || 0) + (selectedOrder.voucherShopee || 0) + (selectedOrder.cashbackShopee || 0) - (selectedOrder.voucherPenjual || 0)} />
                        <DetailRow label="Dana Diterima" value={selectedOrder.net} />
                        <DetailRow label="Penyesuaian Saldo" value={selectedOrder.penyesuaianSaldo} />
                        <DetailRow label="Biaya COD Dibayar Pembeli" value={selectedOrder.codPembeli} />
                        <DetailRow label="Kompensasi Shopee" value={selectedOrder.kompensasi} />
                        
                        <div className="border-t border-slate-100 pt-2 mt-2 flex justify-between font-bold text-slate-900 text-[13px]">
                          <span>Total Pemasukan Shopee</span>
                          <span className="text-emerald-600">{formatRupiah((selectedOrder.hargaProduk || 0) + (selectedOrder.ongkirPembeli || 0) + (selectedOrder.subsidiOngkir || 0) + (selectedOrder.voucherShopee || 0) + (selectedOrder.cashbackShopee || 0) + (selectedOrder.penyesuaianSaldo || 0) + (selectedOrder.codPembeli || 0) + (selectedOrder.kompensasi || 0))}</span>
                        </div>
                      </div>
                    </div>

                    {/* Informasi Transaksi */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="text-indigo-500" size={16} />
                        <h3 className="font-bold text-slate-900 text-sm">Informasi Transaksi</h3>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Order Created Time</span>
                          <span className="text-slate-900 text-right">{selectedOrder.createdDate}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Order Settled Time</span>
                          <span className="text-slate-900 text-right">{selectedOrder.date}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Sumber Order</span>
                          <span className="text-slate-900 text-right">Shopee</span>
                        </div>
                      </div>
                    </div>

                    {/* BOTTOM CARD: Analisis Profit Internal */}
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <BarChart3 className="text-emerald-600" size={16} />
                        <h3 className="font-bold text-emerald-900 text-sm">Analisis Profit Internal</h3>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Total HPP ({selectedOrder.qty} item)</span>
                          <span className="text-red-500">-{formatRupiah(selectedOrder.totalHpp)}</span>
                        </div>
                        <div className="border-t border-emerald-200 pt-2 mt-2 flex justify-between items-center font-bold">
                          <span className="text-[13px] text-emerald-900">Laba Bersih</span>
                          <span className={`text-lg ${selectedOrder.labaBersih < 0 ? 'text-red-500' : 'text-emerald-600'}`}>{formatRupiah(selectedOrder.labaBersih)}</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* KOLOM KANAN (Rincian Potongan Lengkap) */}
                  <div className="flex flex-col flex-1 w-full">
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm h-full">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingDown className="text-red-500" size={16} />
                        <h3 className="font-bold text-slate-900 text-sm">Rincian Potongan</h3>
                      </div>
                      <div className="space-y-2 text-xs">
                        <DetailRow label="Biaya Administrasi" value={selectedOrder.admin} isMinus />
                        <DetailRow label="Biaya Layanan" value={selectedOrder.layanan} isMinus />
                        <DetailRow label="Biaya Program Gratis Ongkir XTRA" value={selectedOrder.ongkirXtra} isMinus />
                        <DetailRow label="Biaya Cashback XTRA" value={selectedOrder.cashbackXtra} isMinus />
                        <DetailRow label="Biaya Affiliate Marketing Solution (AMS)" value={selectedOrder.ams} isMinus />
                        <DetailRow label="Komisi Shopee Affiliate" value={selectedOrder.komisiAffiliate} isMinus />
                        <DetailRow label="Pajak (PPN/PPh)" value={selectedOrder.pajak} isMinus />
                        <DetailRow label="Biaya COD" value={selectedOrder.biayaCod} isMinus />
                        <DetailRow label="Voucher Ditanggung Penjual" value={selectedOrder.voucherPenjual} isMinus />
                        <DetailRow label="Cashback Ditanggung Penjual" value={selectedOrder.cashbackPenjual} isMinus />
                        <DetailRow label="Biaya Iklan Shopee Ads" value={selectedOrder.shopeeAds} isMinus />
                        <DetailRow label="Penalti/Denda" value={selectedOrder.penalti} isMinus />
                        <DetailRow label="Refund Pembeli" value={selectedOrder.refund} isMinus />
                        <DetailRow label="Retur Barang" value={selectedOrder.retur} isMinus />
                        <DetailRow label="Biaya Transfer Bank" value={selectedOrder.transfer} isMinus />
                        <DetailRow label="Biaya Materai" value={selectedOrder.materai} isMinus />
                        <DetailRow label="Penyesuaian Sistem" value={selectedOrder.penyesuaianSistem} isMinus />
                        
                        <div className="border-t border-slate-100 pt-2 mt-2 flex justify-between font-bold text-slate-900 text-[13px]">
                          <span>Total Semua Potongan</span>
                          <span className="text-red-600">-{formatRupiah(selectedOrder.fees)}</span>
                        </div>
                      </div>
                    </div>
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

// Komponen Pembantu Summary Card
function SummaryCard({ label, value, color = "text-slate-900" }: { label: string, value: string | number, color?: string }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center hover:border-slate-300 transition-colors">
      <p className="text-[11px] font-semibold text-slate-500 mb-1">{label}</p>
      <h3 className={`text-lg font-bold ${color}`}>{value}</h3>
    </div>
  );
}

// Komponen Pembantu Baris Rincian Modal
function DetailRow({ label, value, isMinus = false }: any) {
  if (!value || Math.abs(Number(value)) === 0) return null;
  const formatRupiah = (angka: any) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Math.abs(Number(angka)));
  return (
    <div className="flex justify-between text-[13px] font-medium text-slate-600">
      <span>{label}</span>
      <span className={isMinus ? "text-red-500" : "text-slate-900"}>{isMinus ? "-" : ""}{formatRupiah(value)}</span>
    </div>
  );
}