"use client";

import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { 
  LayoutDashboard, Upload, BarChart3, Settings, 
  Table as TableIcon, ChevronLeft, ChevronRight, CheckCircle2,
  WalletCards, TrendingDown, CircleDollarSign, ArrowUpDown, ArrowUp, ArrowDown,
  Eye, X, Search, Calendar, Save, Check
} from "lucide-react";
import Link from "next/link";

export default function FinanceTikTokPage() {
const [finances, setFinances] = useState<any[]>([]);
const [isUploading, setIsUploading] = useState(false);
const [isSaving, setIsSaving] = useState(false); // State untuk loading simpan DB

  // STATE UNTUK MENAMPUNG DATA TIKTOK SALES (Untuk tarik QTY & SKU)
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  // STATE UNTUK MENAMPUNG DATA MASTER PRODUK (Untuk tarik Harga Modal)
  const [products, setProducts] = useState<any[]>([]);

  // --- HITUNG RINGKASAN DATA (Otomatis update saat data berubah) ---
  const totals = useMemo(() => {
    return finances.reduce((acc, curr) => ({
      totalNet: acc.totalNet + (Number(curr.net) || 0),
      totalProfit: acc.totalProfit + (Number(curr.labaBersih) || 0)
    }), { totalNet: 0, totalProfit: 0 });
  }, [finances]);

  useEffect(() => {
const fetchData = async () => {
      try {
        // 1. Tarik data Sales untuk QTY & SKU
        const resSales = await fetch('/api/tiktok');
        if (resSales.ok) {
          try {
            const dataSales = await resSales.json();
            setSalesOrders(Array.isArray(dataSales) ? dataSales : []);
          } catch(e) {
            console.error("Gagal parse data Sales", e);
          }
        }

        // 2. Tarik data Finance dari Database Neon
        const resFinance = await fetch('/api/finance-tiktok');
        if (resFinance.ok) {
          try {
            const dataFinance = await resFinance.json();
            setFinances(Array.isArray(dataFinance) ? dataFinance : []);
          } catch(e) {
            console.error("Gagal parse data Finance", e);
          }
        }

        // 3. Tarik data Master Produk untuk Harga Modal
        const resProducts = await fetch('/api/products');
        if (resProducts.ok) {
          try {
            const dataProducts = await resProducts.json();
            setProducts(Array.isArray(dataProducts) ? dataProducts : []);
          } catch(e) {
            console.error("Gagal parse data Products", e);
          }
        }
      } catch (error) {
        console.error("Gagal menarik data");
      }
    };
    fetchData();
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  // STATE FILTER
  const [globalSearch, setGlobalSearch] = useState("");
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState({ start: '', end: '' });
  
  // STATE UNTUK MODAL DETAIL
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

// ==========================================
  // FUNGSI UPLOAD TIKTOK FINAL (ANTI-ERROR & ANTI-SHIFT)
  // ==========================================
  const handleFileUpload = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const isCSV = file.name.toLowerCase().endsWith('.csv');
    const reader = new FileReader();

    reader.onload = (evt: any) => {
      try {
        let rows: any[][] = [];

        if (isCSV) {
          const text = evt.target.result as string;
          // 1. PECAH PER BARIS DULU: Mencegah kutip ("inch") yang rusak menelan seluruh file!
          const lines = text.split(/\r?\n/);
          if (lines.length < 1) {
            setIsUploading(false); return;
          }
          
          const delimiter = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
          
          for (let line of lines) {
            if (!line.trim()) continue;
            let row = [];
            let cur = '';
            let inQuote = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                if (!inQuote && (i === 0 || line[i-1] === delimiter)) {
                  inQuote = true;
                } else if (inQuote && (i === line.length-1 || line[i+1] === delimiter)) {
                  inQuote = false;
                } else if (inQuote && line[i+1] === '"') {
                  cur += '"'; i++; 
                } else {
                  cur += '"';
                }
              } else if (char === delimiter && !inQuote) {
                row.push(cur.trim());
                cur = '';
              } else {
                cur += char;
              }
            }
            row.push(cur.trim());
            rows.push(row);
          }
        } else {
          const data = new Uint8Array(evt.target.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: "array" });
          wb.SheetNames.forEach(sheetName => {
            const ws = wb.Sheets[sheetName];
            const sheetRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: false, defval: "" });
            rows = rows.concat(sheetRows);
          });
        }

        if (rows.length < 2) {
          alert("Data kosong atau format tidak didukung.");
          setIsUploading(false); return;
        }

        let headerIdx = -1;
        for (let i = 0; i < Math.min(30, rows.length); i++) {
          const rowStr = rows[i].join("|").toLowerCase();
          if (rowStr.includes("order id") || rowStr.includes("order/adjustment id") || rowStr.includes("id pesanan")) {
            headerIdx = i; break;
          }
        }

        if (headerIdx === -1) {
           alert("Gagal membaca header! Pastikan ini file 'Order Details' TikTok.");
           setIsUploading(false); return; 
        }

        const headers = Array.from(rows[headerIdx] || []).map(h => String(h || "").trim().toLowerCase());
        
        // 2. PENCARIAN KOLOM SUPER KETAT (Harus 100% Cocok, Mencegah kolom tertukar dengan Berat Paket)
        const findIdx = (keys: string[]) => headers.findIndex(h => keys.includes(h));

        const iID = findIdx(['pesanan / id penyesuaian', 'order/adjustment id', 'order id', 'id pesanan']);
        const iType = findIdx(['type', 'tipe', 'jenis']);
        const iRev = findIdx(['total nilai pesanan', 'total revenue', 'pendapatan']);
        const iNet = findIdx(['jumlah penyelesaian', 'total settlement amount', 'total settlement', 'dana diselesaikan']);
        const iFee = findIdx(['total biaya', 'total fees', 'biaya platform']);
        const iDate = findIdx(['waktu penyelesaian', 'order settled time', 'settlement time']);
        const iCreatedDate = findIdx(['waktu pesanan dibuat', 'order created time']);
        const iSubtotal = findIdx(['subtotal produk', 'product subtotal', 'subtotal before discounts']);
        const iShippingBuyer = findIdx(['ongkos kirim dibayar oleh pembeli', 'shipping cost paid by the customer', 'customer shipping fee']);
        const iShippingSubsidy = findIdx(['subsidi ongkos kirim tiktok', 'shipping cost subsidy', 'tiktok shipping subsidy']);
        const iAdjustment = findIdx(['penyesuaian', 'ajustment amount', 'adjustment amount', 'adjustment']);
        const iSellerDiscount = findIdx(['diskon dari penjual', 'seller discounts', 'seller discount']);
        const iPlatformFee = findIdx(['biaya komisi', 'platform commission fee', 'platform commission']);
        const iPaymentFee = findIdx(['biaya layanan pesanan', 'payment fee']);
        const iAffiliateFee = findIdx(['komisi afiliasi', 'affiliate commission']);
        const iFreeShippingFee = findIdx(['biaya program gratis ongkir', 'shipping fee program service fee', 'dynamic commission', 'free shipping fee']);
        const iTax = findIdx(['pajak', 'tax']);
        const iCodFee = findIdx(['biaya cod', 'cod fee']);
        
        // TAMBAHAN: Coba cari kolom SKU, QTY, dan NAMA PRODUK di CSV Finance
        const iSku = findIdx(['sku id', 'seller sku', 'sku penjual', 'id sku', 'sku']);
        const iQtyCSV = findIdx(['jumlah', 'quantity', 'qty']);
        const iName = findIdx(['nama produk', 'product name', 'item name', 'nama barang']);

        if (iID === -1) {
          alert("Gagal menemukan kolom ID Pesanan yang valid.");
          setIsUploading(false); return;
        }

        let finalData: any[] = [];

        for (let i = headerIdx + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[iID]) continue;

          let orderIdRaw = String(row[iID]).trim();
          if (orderIdRaw.includes('E') || orderIdRaw.includes('e+') || orderIdRaw.includes('e')) {
             orderIdRaw = Number(row[iID]).toLocaleString('fullwide', {useGrouping:false});
          }
          orderIdRaw = orderIdRaw.split('.')[0]; 
          const cleanID = orderIdRaw.replace(/\D/g, ''); 

          if (cleanID.length >= 10) {
            const cleanNum = (val: any) => {
              if (!val) return 0;
              let s = String(val).trim().replace(/Rp/gi, '').replace(/\s/g, '');
              if (s.includes(',') && s.includes('.')) {
                if (s.indexOf(',') < s.indexOf('.')) s = s.replace(/,/g, ''); 
                else s = s.replace(/\./g, '').replace(/,/g, '.'); 
              } else if (s.includes(',')) {
                const parts = s.split(',');
                if (parts[parts.length-1].length === 2) s = s.replace(/,/g, '.');
                else s = s.replace(/,/g, '');
              } else if (s.includes('.')) {
                const parts = s.split('.');
                if (parts[parts.length-1].length !== 2) s = s.replace(/\./g, '');
              }
              const num = parseFloat(s);
              return isNaN(num) ? 0 : Math.round(num);
            };

            const revenue = cleanNum(row[iRev]);
            const net = cleanNum(row[iNet]);
            const fees = Math.abs(cleanNum(row[iFee]));
            
            const date = String(row[iDate] || "-").trim();
            const createdDate = String(row[iCreatedDate] || "-").trim();
            const subtotal = cleanNum(row[iSubtotal]);
            const shippingBuyer = cleanNum(row[iShippingBuyer]);
            const shippingSubsidy = cleanNum(row[iShippingSubsidy]);
            const adjustment = cleanNum(row[iAdjustment]);
            const sellerDiscount = cleanNum(row[iSellerDiscount]);
            const platformFee = Math.abs(cleanNum(row[iPlatformFee]));
            const paymentFee = Math.abs(cleanNum(row[iPaymentFee]));
            const affiliateFee = Math.abs(cleanNum(row[iAffiliateFee]));
            const freeShippingFee = Math.abs(cleanNum(row[iFreeShippingFee]));
            const tax = Math.abs(cleanNum(row[iTax]));
            const codFee = Math.abs(cleanNum(row[iCodFee]));

            // 1. CARI QTY, SKU, & NAMA PRODUK dari CSV Finance (Prioritas)
            let qty = (iQtyCSV !== -1 && row[iQtyCSV]) ? Number(row[iQtyCSV]) : null;
            let sku = (iSku !== -1 && row[iSku]) ? String(row[iSku]).trim() : null;
            let productName = (iName !== -1 && row[iName]) ? String(row[iName]).trim() : null;

            // Jika CSV Finance tidak punya informasi produk, tarik dari Data Penjualan (Orders) di Database
            const matchingSales = salesOrders.find((s: any) => {
              // Mencegah error mapping ID (Cover segala kemungkinan properti dari database)
              const salesId = String(s.orderId || s.order_id || s.idPesanan || s.id_pesanan || "").trim().replace(/\D/g, '');
              return salesId === cleanID;
            });

            if (matchingSales) {
              if (!qty) qty = Number(matchingSales.qty || matchingSales.quantity || 1);
              if (!sku) sku = matchingSales.sku || matchingSales.skuId || matchingSales.sku_produk || matchingSales.sellerSku;
              if (!productName) productName = matchingSales.namaProduk || matchingSales.nama_produk || matchingSales.productName || matchingSales.name;
            }

            // 2. PENCARIAN SUPER JITU KE MASTER PRODUK
            let hppPerItem = 0;
            let matchingProduct = null;

            // STRATEGI A: Cocokkan SKU persis
            if (sku) {
              const cleanSku = String(sku).trim().toLowerCase();
              matchingProduct = products.find((p: any) => 
                String(p.sku || p.sku_produk || p.skuProduk || "").trim().toLowerCase() === cleanSku
              );
            }

            // STRATEGI B: Jika SKU gagal / kosong, tembak pakai Nama Produk
            if (!matchingProduct && productName) {
              const cleanOrderName = String(productName).trim().toLowerCase();
              
              // Exact Name
              matchingProduct = products.find((p: any) => {
                const masterName = String(p.name || p.nama || p.namaProduk || p.nama_produk || "").trim().toLowerCase();
                return masterName === cleanOrderName;
              });

              // Fuzzy Name Jitu (Hanya ambil huruf dan angka, potong jadi kata)
              if (!matchingProduct) {
                const orderWords = cleanOrderName.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 2);
                let bestMatch = null;
                let highestScore = 0;

                products.forEach((p: any) => {
                  const masterName = String(p.name || p.nama || p.namaProduk || p.nama_produk || "").trim().toLowerCase();
                  const masterWords = masterName.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 2);

                  let score = 0;
                  orderWords.forEach(w => {
                    if (masterWords.includes(w)) score++;
                  });

                  if (score >= 2 && score > highestScore) {
                    highestScore = score;
                    bestMatch = p;
                  }
                });

                if (bestMatch) matchingProduct = bestMatch;
              }
            }

            // STRATEGI C: Ambil Harga Modal (Pastikan penulisan prop API tercover semua)
            if (matchingProduct) {
              // Dari file Master Produkmu, prop-nya biasanya bernama 'hargaModal'
              const rawHpp = matchingProduct.hargaModal || matchingProduct.harga_modal || matchingProduct.hpp || 0;
              hppPerItem = cleanNum(rawHpp); // Ubah jadi angka bersih
            }

            // --- DETEKSI STATUS PESANAN ---
            let statusPesanan = "Selesai";
            const rowType = String(row[iType] || "").toLowerCase();
            
            if (rowType.includes('refund') || rowType.includes('retur')) {
              statusPesanan = "Retur";
            } else if (rowType.includes('ads') || rowType.includes('deduction')) {
              statusPesanan = "Tagihan Iklan";
            } else if (net === 0 && revenue === 0 && fees === 0 && rowType.includes('order')) {
              statusPesanan = "Batal";
            } else if (matchingSales && matchingSales.status) {
              statusPesanan = matchingSales.status; // Jika ada data dari tabel sales
            }

            // 3. KALKULASI TOTAL HPP AKHIR (Mencegah Minus Palsu)
            qty = qty || 1; // Default 1
            
            // Jika pesanan Batal atau Retur, Harga Modal (HPP) tidak dihitung sebagai kerugian.
            const isCancelled = statusPesanan === "Batal" || statusPesanan === "Retur";
            const totalHpp = isCancelled ? 0 : (qty * hppPerItem);
            
            // Jika pesanan Batal, biaya admin juga dianggap 0 karena TikTok tidak jadi memotong
            const finalFees = isCancelled ? 0 : fees;
            const finalLabaBersih = isCancelled ? 0 : (net - totalHpp);

            finalData.push({
              orderId: cleanID, orderStatus: statusPesanan, createdDate, date, qty, subtotal,
              shippingBuyer, shippingSubsidy, adjustment, sellerDiscount,
              platformFee, paymentFee, affiliateFee, freeShippingFee, tax, codFee,
              fees: finalFees, net, revenue, hppPerItem, totalHpp, labaBersih: finalLabaBersih
            });
          }
        }

        if (finalData.length === 0) {
          alert("Data tidak ditemukan! Pastikan file CSV tidak kosong.");
        } else {
          setFinances(finalData);
        }

        setIsUploading(false);
        setCurrentPage(1);
      } catch (err) {
        console.error("Gagal total baca file:", err);
        alert("Terjadi kesalahan fatal saat membaca file.");
        setIsUploading(false);
      }
    };

    if (isCSV) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  // FUNGSI SIMPAN KE DATABASE NEON
  const handleSaveToDatabase = async () => {
    if (finances.length === 0) return alert("Belum ada data untuk disimpan!");
    setIsSaving(true);
    
    try {
      const response = await fetch('/api/finance-tiktok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finances), // Kirim data state ke backend
      });

      const result = await response.json();
      if (response.ok) {
        alert("Berhasil! " + result.message);
      } else {
        alert("Gagal: " + result.error);
      }
    } catch (error) {
      alert("Terjadi kesalahan sistem saat menghubungi database.");
    } finally {
      setIsSaving(false);
    }
  };

  // 2. LOGIKA FILTERING DATA
  const filteredFinances = useMemo(() => {
    if (!finances || !Array.isArray(finances)) return [];

    return finances.filter(item => {
      if (!item) return false;

      const safeOrderId = String(item.orderId || "");
      const safeSearch = String(globalSearch || "").toLowerCase();
      const matchesSearch = safeSearch === "" || safeOrderId.toLowerCase().includes(safeSearch);

      let matchesDate = true;
      if (dateRange.start && dateRange.end && item.date && item.date !== "-") {
        const safeDate = String(item.date);
        const datePart = safeDate.split(" ")[0].replace(/\//g, "-"); 
        matchesDate = datePart >= dateRange.start && datePart <= dateRange.end;
      }

      return matchesSearch && matchesDate;
    });
  }, [finances, globalSearch, dateRange]);

  // PRESET TANGGAL UNTUK POPUP
  const handlePresetDate = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    setTempDateRange({ start: formatDate(start), end: formatDate(end) });
  };

  // 3. KALKULASI SUMMARY METRICS KEUANGAN
  const summaryMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalFees = 0;
    let totalNet = 0;
    let totalProfit = 0; // Tambahan untuk profit internal

    filteredFinances.forEach(item => {
      totalRevenue += item.revenue;
      totalFees += item.fees; 
      totalNet += item.net;
      totalProfit += (item.labaBersih || 0); // Menjumlahkan laba bersih
    });

    return { totalRevenue, totalFees, totalNet, totalProfit };
  }, [filteredFinances]);

  // 4. LOGIKA SORTING
  const sortedFinances = useMemo(() => {
    let sortableItems = [...filteredFinances];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredFinances, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown size={14} className="ml-1 opacity-40 group-hover:opacity-100 transition-opacity" />;
    if (sortConfig.direction === 'asc') return <ArrowUp size={14} className="ml-1 text-indigo-600" />;
    return <ArrowDown size={14} className="ml-1 text-indigo-600" />;
  };

  // 5. LOGIKA PAGINATION
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedFinances.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedFinances.length / (itemsPerPage || 1));

  const generatePagination = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  // FORMAT TANGGAL
  const formatDisplayDate = (dateVal: any) => {
    if (!dateVal || dateVal === "-" || dateVal === "undefined") return "-";
    try {
      // 1. Cek jika Excel membaca tanggal sebagai Angka Seri (misal: 45318)
      if (!isNaN(Number(dateVal)) && Number(dateVal) > 20000) {
        const jsDate = new Date(Math.round((Number(dateVal) - 25569) * 86400 * 1000));
        const d = String(jsDate.getDate()).padStart(2, '0');
        const m = String(jsDate.getMonth() + 1).padStart(2, '0');
        const y = jsDate.getFullYear();
        return `${d}/${m}/${y}`;
      }

      // 2. Cek jika format Text biasa (buang jamnya jika ada)
      const dateStr = String(dateVal).split(" ")[0];
      const separator = dateStr.includes("/") ? "/" : "-";
      const parts = dateStr.split(separator);

      if (parts.length === 3) {
        // Jika YYYY/MM/DD
        if (parts[0].length === 4) {
          return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
        }
        // Pastikan DD/MM/YYYY jadi 2 digit agar konsisten
        return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
      }
      
      return dateStr;
    } catch (e) {
      return String(dateVal);
    }
  };

const formatRupiah = (angka: any) => {
    // Memastikan angka yang masuk valid, jika kosong anggap 0
    const val = Number(angka) || 0;
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <>
      {/* MAIN CONTENT */}
      {/* --- KUNCI SCROLL LAYAR LUAR --- */}
      <main className="flex-1 p-8 h-screen overflow-hidden flex flex-col">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Laba Rugi & Pencairan TikTok</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <CheckCircle2 size={10} className="text-emerald-500" />
              <span className="text-slate-500 font-medium text-sm">Kelola &quot;Data Keuangan&quot; Tiktok Seller</span>
            </div>
          </div>
          
                <div className="flex gap-3">
            <button 
              onClick={handleSaveToDatabase} 
              disabled={isSaving || finances.length === 0}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-bold transition-all shadow-sm shadow-emerald-200"
            >
              <Save size={16} /> {isSaving ? "Menyimpan..." : "Simpan ke Database"}
            </button>
            <label className="bg-slate-900 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-slate-800 flex items-center gap-2 text-sm font-bold shadow-sm">
              <Upload size={16} /> {isUploading ? "Memproses..." : "Upload Excel / CSV"}
              <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </header>

        {/* SUMMARY CARDS KEUANGAN */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
            <div className="absolute right-3 top-3 bg-blue-50 p-1.5 rounded-full">
              <CircleDollarSign size={16} className="text-blue-500" />
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mb-0.5">Pendapatan Kotor</p>
            <h3 className="text-lg font-bold text-slate-900">{formatRupiah(summaryMetrics.totalRevenue)}</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">Harga barang sebelum dipotong</p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-red-100 shadow-sm flex flex-col justify-center relative overflow-hidden">
            <div className="absolute right-3 top-3 bg-red-50 p-1.5 rounded-full">
              <TrendingDown size={16} className="text-red-500" />
            </div>
            <p className="text-[11px] font-semibold text-red-500 mb-0.5">Total Potongan (Fees)</p>
            <h3 className="text-lg font-bold text-red-600">{formatRupiah(summaryMetrics.totalFees)}</h3>
            <p className="text-[9px] text-red-400 mt-0.5">Komisi, layanan & ongkir</p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-sm flex flex-col justify-center relative overflow-hidden border-b-4 border-b-emerald-500">
            <div className="absolute right-3 top-3 bg-emerald-50 p-1.5 rounded-full">
              <WalletCards size={16} className="text-emerald-600" />
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mb-0.5">Pencairan (Settlement)</p>
            <h3 className="text-lg font-bold text-emerald-600">{formatRupiah(summaryMetrics.totalNet)}</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">Uang bersih cair dari TikTok</p>
          </div>

          <div className="bg-emerald-600 p-3 rounded-xl border border-emerald-700 shadow-md flex flex-col justify-center relative overflow-hidden text-white">
            <div className="absolute right-3 top-3 bg-white/20 p-1.5 rounded-full">
              <BarChart3 size={16} className="text-white" />
            </div>
            <p className="text-[11px] font-semibold text-emerald-100 mb-0.5">Total Profit Internal</p>
            <h3 className="text-lg font-bold text-white">{formatRupiah(summaryMetrics.totalProfit)}</h3>
            <p className="text-[9px] text-emerald-100 mt-0.5">Pencairan dikurangi modal</p>
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="mb-4 flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex-1 min-w-[300px] relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari Order ID..." 
              value={globalSearch}
              onChange={(e) => { setGlobalSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 text-sm text-slate-900 bg-slate-50 border border-transparent rounded-lg focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="relative">
            <button 
              onClick={() => { setTempDateRange(dateRange); setIsDatePickerOpen(!isDatePickerOpen); }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
            >
              <Calendar size={16} className="text-indigo-500" />
              {dateRange.start && dateRange.end ? `${dateRange.start} - ${dateRange.end}` : "Filter Tanggal Laporan"}
            </button>

            {isDatePickerOpen && (
              <div className="absolute right-0 top-full mt-2 w-[500px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 flex flex-col overflow-hidden">
                <div className="flex flex-row h-[280px]">
                  <div className="w-40 border-r border-slate-100 bg-slate-50/50 p-2 flex flex-col gap-1 overflow-y-auto">
                    <button onClick={() => handlePresetDate(0)} className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 rounded-md">Hari ini</button>
                    <button onClick={() => handlePresetDate(7)} className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 rounded-md">7 hari terakhir</button>
                    <button onClick={() => handlePresetDate(30)} className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 rounded-md">30 hari terakhir</button>
                    <button onClick={() => setTempDateRange({start: '', end: ''})} className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 rounded-md">Semua waktu</button>
                  </div>
                  <div className="flex-1 p-5 flex flex-col">
                    <h4 className="font-medium text-slate-900 mb-4 text-sm">Rentang Tanggal Custom</h4>
                    <div className="flex items-center gap-4 mb-auto">
                      <input type="date" value={tempDateRange.start} onChange={(e) => setTempDateRange(prev => ({...prev, start: e.target.value}))} className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none" />
                      <input type="date" value={tempDateRange.end} onChange={(e) => setTempDateRange(prev => ({...prev, end: e.target.value}))} className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t">
                      <button onClick={() => { setDateRange({start:'', end:''}); setIsDatePickerOpen(false); }} className="text-xs font-bold text-red-600 uppercase">Reset</button>
                      <div className="flex gap-2">
                        <button onClick={() => setIsDatePickerOpen(false)} className="px-3 py-1.5 text-sm text-slate-600">Cancel</button>
                        <button onClick={() => { setDateRange(tempDateRange); setIsDatePickerOpen(false); setCurrentPage(1); }} className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg">Apply</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

{/* DATA TABLE */}
{/* --- WADAH TABEL (Mengisi sisa ruang & memiliki flex-col) --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
          
          {/* --- AREA SCROLL ISI TABEL --- */}
          <div className="overflow-auto flex-1 relative">
            <table className="w-full text-left border-collapse">
              {/* Tambahkan sticky, top-0, dan z-10 agar menempel di atas */}
              <thead className="bg-slate-50 sticky top-0 z-10 outline outline-1 outline-slate-200 shadow-sm">
                <tr>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tgl Dibuat</th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tgl Selesai</th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">QTY</th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Harga Jual</th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right font-bold bg-slate-100/50">Harga Modal</th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right font-bold bg-slate-100/50">Total HPP</th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-red-500 uppercase tracking-wider text-right">Biaya Admin</th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-emerald-600 uppercase tracking-wider text-right font-bold">Laba Bersih</th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentItems.length > 0 ? (
                  currentItems.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 text-sm font-mono font-medium text-slate-800">{item.orderId}</td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <span className={`px-2.5 py-1 rounded-md font-bold text-[11px] uppercase tracking-wider ${
                          (item.orderStatus || '').toLowerCase().includes('retur') ? 'bg-red-100 text-red-600' :
                          (item.orderStatus || '').toLowerCase().includes('batal') ? 'bg-slate-200 text-slate-600' :
                          (item.orderStatus || '').toLowerCase().includes('iklan') ? 'bg-orange-100 text-orange-600' :
                          'bg-emerald-100 text-emerald-600'
                        }`}>
                          {item.orderStatus || 'Selesai'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700 whitespace-nowrap">{formatDisplayDate(item.createdDate)}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700 whitespace-nowrap">{formatDisplayDate(item.date)}</td>
                      <td className="px-6 py-4 text-sm text-center text-slate-600">{item.qty}</td>
                      <td className="px-6 py-4 text-sm text-right text-slate-600">{formatRupiah(item.subtotal / (item.qty || 1))}</td>
                      <td className="px-6 py-4 text-sm text-right text-slate-500 font-medium">{formatRupiah(item.hppPerItem)}</td>
                      <td className="px-6 py-4 text-sm text-right text-slate-700 font-bold bg-slate-50">{formatRupiah(item.totalHpp)}</td>
                      <td className="px-6 py-4 text-sm text-right text-red-500 font-medium">{formatRupiah(item.fees)}</td>
                      <td className={`px-6 py-4 text-sm text-right font-bold ${item.labaBersih < 0 ? 'text-red-500' : 'text-emerald-600'}`}>{formatRupiah(item.labaBersih)}</td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => setSelectedOrder(item)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
                          title="Lihat Rincian"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="py-24 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <WalletCards size={32} className="mb-3 opacity-20" />
                        <p className="text-sm font-medium text-slate-500">Belum ada data keuangan. Silakan upload CSV Order Details.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION FOOTER */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-500">
              Menampilkan <span className="font-medium text-slate-900">{filteredFinances.length === 0 ? 0 : indexOfFirstItem + 1}</span> hingga <span className="font-medium text-slate-900">{Math.min(indexOfLastItem, filteredFinances.length)}</span> dari <span className="font-medium text-slate-900">{filteredFinances.length}</span> data
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Baris per halaman:</span>
                <select 
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="text-sm border border-slate-200 rounded-md bg-white text-slate-700 py-1 pl-2 pr-6 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm font-medium text-slate-500 hover:text-slate-800 disabled:opacity-40 transition-colors"
                >
                  Prev
                </button>
                
                <div className="flex items-center gap-1">
                  {generatePagination().map((page, idx) => (
                    <button
                      key={idx}
                      onClick={() => typeof page === 'number' && setCurrentPage(page)}
                      disabled={page === '...'}
                      className={`min-w-[28px] h-[28px] flex items-center justify-center text-sm rounded transition-all ${
                        currentPage === page 
                          ? 'bg-[#000000] text-white font-medium shadow-sm' 
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
                  className="px-3 py-1 text-sm font-medium text-slate-500 hover:text-slate-800 disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

{/* MODAL DETAIL KEUANGAN (NEW DESIGN) */}
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
                      <span className="text-slate-500 text-sm">{formatDisplayDate(selectedOrder.date)}</span>
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
                  <div>
                    <p className="text-slate-500 mb-1">Tipe</p>
                    <p className="font-semibold text-slate-900">Pesanan TikTok</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1">Mata Uang</p>
                    <p className="font-semibold text-slate-900">IDR</p>
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
                      <p className="text-base font-bold text-slate-900">{formatRupiah(selectedOrder.revenue)}</p>
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
                  
                  {/* KOLOM KIRI (Info, Pendapatan, Profit) */}
                  <div className="flex flex-col gap-4 flex-1 w-full">
                    
                    {/* Pendapatan dari Pesanan */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <CircleDollarSign className="text-emerald-500" size={16} />
                        <h3 className="font-bold text-slate-900 text-sm">Pendapatan dari Pesanan</h3>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Subtotal pesanan</span>
                          <span>{formatRupiah(selectedOrder.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Diskon dari penjual</span>
                          <span className="text-red-500">-{formatRupiah(selectedOrder.sellerDiscount)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Penyesuaian</span>
                          <span>{formatRupiah(selectedOrder.adjustment)}</span>
                        </div>
                        <div className="border-t border-slate-100 pt-2 mt-2 flex justify-between font-bold text-slate-900 text-[13px]">
                          <span>Total Pendapatan</span>
                          <span className="text-emerald-600">{formatRupiah(selectedOrder.revenue)}</span>
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
                          <span className="text-slate-900 text-right">{formatDisplayDate(selectedOrder.createdDate)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Order Settled Time</span>
                          <span className="text-slate-900 text-right">{formatDisplayDate(selectedOrder.date)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Sumber Order</span>
                          <span className="text-slate-900 text-right">TikTok Shop</span>
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
<div className="flex justify-between text-slate-600">
                        <span>Biaya Platform</span>
                        <span className="text-red-500">-{formatRupiah(selectedOrder.platformFee)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Biaya Administrasi</span>
                        <span className="text-red-500">-Rp0</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Biaya Komisi Affiliate</span>
                        <span className="text-red-500">-{formatRupiah(selectedOrder.affiliateFee)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Biaya Ongkir Penjual</span>
                        <span className="text-red-500">-{formatRupiah(Math.max(0, selectedOrder.fees - (selectedOrder.platformFee + selectedOrder.paymentFee + selectedOrder.affiliateFee + selectedOrder.freeShippingFee + selectedOrder.tax + selectedOrder.codFee + (selectedOrder.adjustment < 0 ? Math.abs(selectedOrder.adjustment) : 0))))}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Biaya Program Gratis Ongkir</span>
                        <span className="text-red-500">-{formatRupiah(selectedOrder.freeShippingFee)}</span>
                      </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Biaya Pembayaran / Payment Fee</span>
                          <span className="text-red-500">-{formatRupiah(selectedOrder.paymentFee)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Pajak (PPN/PPh)</span>
                          <span className="text-red-500">-{formatRupiah(selectedOrder.tax)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Biaya COD</span>
                          <span className="text-red-500">-{formatRupiah(selectedOrder.codFee)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Biaya Retur / Refund</span>
                          <span className="text-red-500">-Rp0</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Penalti / Denda</span>
                          <span className="text-red-500">-{formatRupiah(selectedOrder.adjustment < 0 ? Math.abs(selectedOrder.adjustment) : 0)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Biaya Affiliate Extra</span>
                          <span className="text-red-500">-Rp0</span>
                        </div>
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