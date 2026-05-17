"use client";

import { useAuth } from "@/app/context/AuthContext";
import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { 
  LayoutDashboard, Upload, BarChart3, Settings, 
  Table as TableIcon, ChevronLeft, ChevronRight, CheckCircle2,
  WalletCards, TrendingDown, CircleDollarSign, ArrowUpDown, ArrowUp, ArrowDown,
  Eye, X, Search, Calendar, Save, Check, ShoppingBag, Download, Package
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function FinanceTikTokPage() {
  const { user } = useAuth();
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
  const [statusFilter, setStatusFilter] = useState("Semua Status");
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
          // 1. PECAH PER BARIS DULU
          const lines = text.split(/\r?\n/);
          if (lines.length < 1) {
            setIsUploading(false); return;
          }
          
          // Cari baris valid pertama untuk deteksi delimiter (karena kadang baris 1 kosong di CSV TikTok)
          const sampleLine = lines.find(l => l.includes(',') || l.includes(';')) || lines[0];
          const delimiter = (sampleLine.match(/;/g) || []).length > (sampleLine.match(/,/g) || []).length ? ';' : ',';
          
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
          toast.error("Data kosong atau format tidak didukung.");
          setIsUploading(false); return;
        }

        // 1. CARI HEADER ROW (ANTI GAGAL: Bersihkan karakter dan spasi)
        let headerIdx = -1;
        for (let i = 0; i < Math.min(30, rows.length); i++) {
          const rowStr = rows[i].join("").toLowerCase().replace(/[^a-z0-9]/g, '');
          // Cari keyword dasar tanpa spasi
          if (rowStr.includes("orderid") || rowStr.includes("idpesanan") || rowStr.includes("adjustmentid")) {
            headerIdx = i; break;
          }
        }

        if (headerIdx === -1) {
           toast.error("Gagal membaca header! Pastikan ini file 'Order Details' atau Settlement TikTok.");
           setIsUploading(false); return; 
        }

        const headers = Array.from(rows[headerIdx] || []).map(h => String(h || "").trim());
        
const findIdx = (keys: string[]) => headers.findIndex(h => {
          const cleanH = String(h).toLowerCase().replace(/[^a-z0-9]/g, '');
          return keys.some(k => String(k).toLowerCase().replace(/[^a-z0-9]/g, '') === cleanH);
        });

        const iID = findIdx(['id pesanan/penyesuaian', 'pesanan / id penyesuaian', 'order/adjustment id', 'order id', 'id pesanan']);
        const iType = findIdx(['jenis transaksi', 'type', 'tipe', 'jenis']);
        const iRev = findIdx(['total pendapatan', 'total nilai pesanan', 'total revenue', 'pendapatan']);
        const iNet = findIdx(['jumlah penyelesaian pembayaran', 'jumlah penyelesaian', 'total settlement amount', 'total settlement', 'dana diselesaikan']);
        const iFee = findIdx(['total biaya', 'total fees', 'biaya platform']);
        const iDate = findIdx(['waktu pembayaran pesanan', 'waktu penyelesaian', 'order settled time', 'settlement time']);
        const iCreatedDate = findIdx(['waktu pemesanan', 'waktu pesanan dibuat', 'order created time']);
        const iSubtotal = findIdx(['subtotal sebelum diskon', 'subtotal produk', 'product subtotal', 'subtotal before discounts']);
        const iShippingBuyer = findIdx(['ongkir yang ditanggung pembeli', 'ongkos kirim dibayar oleh pembeli', 'shipping cost paid by the customer', 'customer shipping fee']);
        const iShippingSubsidy = findIdx(['subsidi ongkir', 'subsidi ongkos kirim tiktok', 'shipping cost subsidy', 'tiktok shipping subsidy']);
        const iAdjustment = findIdx(['jumlah penyesuaian', 'penyesuaian', 'ajustment amount', 'adjustment amount', 'adjustment']);
        const iSellerDiscount = findIdx(['diskon penjual', 'diskon dari penjual', 'seller discounts', 'seller discount']);
        const iPlatformFee = findIdx(['biaya komisi platform', 'biaya komisi', 'platform commission fee', 'platform commission']);
        const iPaymentFee = findIdx(['biaya pembayaran', 'biaya layanan pesanan', 'payment fee']);
        const iAffiliateFee = findIdx(['komisi afiliasi', 'affiliate commission']);
        const iFreeShippingFee = findIdx(['biaya layanan program bebas ongkir', 'biaya program gratis ongkir', 'shipping fee program service fee', 'dynamic commission', 'free shipping fee']);
        const iTax = findIdx(['pph pasal 22 dipungut', 'pajak', 'tax']);
        const iCodFee = findIdx(['biaya penanganan cod', 'biaya cod', 'cod fee']);
        
        const iSku = findIdx(['sku id', 'seller sku', 'sku penjual', 'id sku', 'sku']);
        const iQtyCSV = findIdx(['jumlah', 'quantity', 'qty']);
        const iName = findIdx(['detail produk terjual', 'nama produk', 'product name', 'item name', 'nama barang']);

        // PENGECEKAN KEAMANAN FILE (Mencegah Salah Upload File Pesanan)
        if (iID === -1) {
          toast.error("Gagal menemukan kolom ID Pesanan. Format mungkin tidak valid.");
          setIsUploading(false); return;
        }

        if (iNet === -1 && iFee === -1) {
          toast.error("File berhasil dibaca, tapi kolom Nilai Pencairan (Settlement) TIDAK DITEMUKAN!\n\nSepertinya Anda mengupload file 'Data Pesanan'. Pastikan Anda mendownload file dari menu 'Keuangan / Finance' di TikTok Seller Center.");
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
              if (val === undefined || val === null || val === '') return 0;
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

            if (sku) {
              const cleanSku = String(sku).trim().toLowerCase();
              matchingProduct = products.find((p: any) => 
                String(p.sku || p.sku_produk || p.skuProduk || "").trim().toLowerCase() === cleanSku
              );
            }

            if (!matchingProduct && productName) {
              const cleanOrderName = String(productName).trim().toLowerCase();
              matchingProduct = products.find((p: any) => {
                const masterName = String(p.name || p.nama || p.namaProduk || p.nama_produk || "").trim().toLowerCase();
                return masterName === cleanOrderName;
              });

              if (!matchingProduct) {
                const orderWords = cleanOrderName.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 2);
                let bestMatch = null;
                let highestScore = 0;

                products.forEach((p: any) => {
                  const masterName = String(p.name || p.nama || p.namaProduk || p.nama_produk || "").trim().toLowerCase();
                  const masterWords = masterName.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 2);

                  let score = 0;
                  orderWords.forEach(w => { if (masterWords.includes(w)) score++; });

                  if (score >= 2 && score > highestScore) {
                    highestScore = score; bestMatch = p;
                  }
                });
                if (bestMatch) matchingProduct = bestMatch;
              }
            }

            if (matchingProduct) {
              const rawHpp = matchingProduct.hargaModal || matchingProduct.harga_modal || matchingProduct.hpp || 0;
              hppPerItem = cleanNum(rawHpp); 
            }

            // --- DETEKSI STATUS PESANAN ---
            let statusPesanan = "Selesai";
            const rowType = String(row[iType] || "").toLowerCase();
            const isNIL = net === 0 && fees === 0; // Pindahkan ke atas untuk deteksi awal
            
            if (rowType.includes('refund') || rowType.includes('retur')) {
              statusPesanan = "Retur";
            } else if (rowType.includes('ads') || rowType.includes('deduction')) {
              statusPesanan = "Tagihan Iklan";
            } else if (isNIL) {
              // OVERRIDE OTOMATIS: Jika pencairan 0 & potongan 0, paksa status jadi Batal
              // Abaikan status "Dikirim" dari database lama karena nyatanya transaksi ini gagal.
              statusPesanan = "Batal";
            } else if (matchingSales && matchingSales.status) {
              statusPesanan = matchingSales.status; 
            }

            // 3. KALKULASI TOTAL HPP AKHIR
            qty = qty || 1; 
            
            // Artinya barang kembali/batal, jadi Modal (HPP) tidak hangus.
            const isCancelled = statusPesanan === "Batal" || statusPesanan === "Retur";
            
            const totalHpp = isCancelled ? 0 : (qty * hppPerItem);
            
            // GUNAKAN POTONGAN NYATA (Pendapatan - Cair) agar tabel selaras dengan Laba Bersih
            const trueFees = revenue - net;
            const finalFees = isCancelled ? 0 : trueFees;
            const finalLabaBersih = isCancelled ? 0 : (net - totalHpp);

            finalData.push({
              orderId: cleanID, orderStatus: statusPesanan, createdDate, date, qty, subtotal,
              shippingBuyer, shippingSubsidy, adjustment, sellerDiscount,
              platformFee, paymentFee, affiliateFee, freeShippingFee, tax, codFee,
              fees: finalFees, net, revenue, hppPerItem, totalHpp, labaBersih: finalLabaBersih,
              productName: productName, sku: sku
            });
          }
        }

        if (finalData.length === 0) {
          toast.error("Data tidak ditemukan! Pastikan file CSV tidak kosong.");
        } else {
          setFinances(prev => {
            const combined = [...prev, ...finalData];
            const uniqueMap = new Map();
            combined.forEach(item => {
              uniqueMap.set(item.orderId, item);
            });
            return Array.from(uniqueMap.values());
          });
          toast.success("File Excel berhasil dibaca, silakan Simpan ke Database!");
        }

        setIsUploading(false);
        setCurrentPage(1);
      } catch (err) {
        console.error("Gagal total baca file:", err);
        toast.error("Terjadi kesalahan fatal saat membaca file.");
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
    if (finances.length === 0) {
      toast.error("Belum ada data untuk disimpan!");
      return;
    }
    setIsSaving(true);
    
    try {
      const response = await fetch('/api/finance-tiktok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finances), // Kirim data state ke backend
      });

      const result = await response.json();
      if (response.ok) {
        toast.success("Data berhasil disimpan!");
      } else {
        toast.error("Gagal: " + result.error);
      }
    } catch (error) {
      toast.error("Terjadi kesalahan sistem saat menghubungi database.");
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

      let matchesStatus = true;
      if (statusFilter !== "Semua Status") {
        matchesStatus = (item.orderStatus || "Selesai") === statusFilter;
      }

      return matchesSearch && matchesDate && matchesStatus;
    });
  }, [finances, globalSearch, dateRange, statusFilter]);

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
    let totalNet = 0;
    let totalHpp = 0; 
    let totalProfit = 0;
    
    // Tambahan metrik barang
    let totalQtyTerjual = 0;
    let totalPesanan = filteredFinances.length;
    let totalPesananGagal = 0;

    filteredFinances.forEach(item => {
      totalRevenue += item.revenue;
      totalNet += item.net;
      totalHpp += (item.totalHpp || 0); 
      totalProfit += (item.labaBersih || 0);
      
      if (item.orderStatus === "Batal" || item.orderStatus === "Retur") {
        totalPesananGagal += 1;
      } else {
        totalQtyTerjual += (item.qty || 1);
      }
    });

    // MENGHITUNG BIAYA / POTONGAN NYATA AGAR (A - B = C) 100% AKURAT
    // Termasuk potongan diskon penjual, penalti, dll yang disembunyikan TikTok
    const totalFees = totalRevenue - totalNet;

    const rasioRetur = totalPesanan === 0 ? 0 : ((totalPesananGagal / totalPesanan) * 100).toFixed(1);

    return { totalRevenue, totalFees, totalNet, totalHpp, totalProfit, totalQtyTerjual, rasioRetur, totalPesananGagal };
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

  // FUNGSI EXPORT DATA KE EXCEL
  const handleExportData = () => {
    if (filteredFinances.length === 0) {
      toast.error("Tidak ada data untuk diekspor!");
      return;
    }

    // Mapping data agar rapi di Excel
    const dataToExport = filteredFinances.map((item, index) => {
      const matchSales = salesOrders.find((s: any) => String(s.orderId).replace(/\D/g, '') === String(item.orderId).replace(/\D/g, ''));
      return {
        "No": index + 1,
        "Order ID": item.orderId,
        "Status": item.orderStatus || "Selesai",
        "Tanggal Dibuat": formatDisplayDate(item.createdDate),
        "Tanggal Selesai": formatDisplayDate(item.date),
        "Nama Produk": matchSales?.productName || item.productName || "-",
        "SKU / Variasi": matchSales?.sku || item.sku || "-",
        "QTY": item.qty || 1,
        "Harga Jual": item.subtotal / (item.qty || 1),
        "Harga Modal": item.hppPerItem,
        "Total HPP": item.totalHpp,
        "Biaya Admin": item.fees,
        "Laba Bersih": item.labaBersih
      };
    });

    // Menambahkan Baris Total di Paling Bawah Excel
    dataToExport.push({
      "No": "", "Order ID": "", "Status": "", "Tanggal Dibuat": "", "Tanggal Selesai": "", "Nama Produk": "", 
      "SKU / Variasi": "TOTAL KESELURUHAN",
      "QTY": dataToExport.reduce((acc, curr) => acc + (Number(curr["QTY"]) || 0), 0),
      "Harga Jual": "", 
      "Harga Modal": "",
      "Total HPP": dataToExport.reduce((acc, curr) => acc + (Number(curr["Total HPP"]) || 0), 0),
      "Biaya Admin": dataToExport.reduce((acc, curr) => acc + (Number(curr["Biaya Admin"]) || 0), 0),
      "Laba Bersih": dataToExport.reduce((acc, curr) => acc + (Number(curr["Laba Bersih"]) || 0), 0)
    } as any);

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Keuangan");
    
    // Download file dengan format nama dinamis
    XLSX.writeFile(workbook, `Keuangan_TikTok_${new Date().toISOString().split('T')[0]}.xlsx`);
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
            {user?.role === 'admin' && (
              <>
                {finances.length > 0 && (
                  <button 
                    onClick={() => {
                      if(window.confirm("Batalkan semua data di layar dan kembali ke data awal?")) {
                        window.location.reload();
                      }
                    }}
                    className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg cursor-pointer hover:bg-red-100 flex items-center gap-2 text-sm font-bold transition-all shadow-sm"
                  >
                    <X size={16} /> Reset Upload
                  </button>
                )}
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
              </>
            )}
          </div>
        </header>

{/* SUMMARY CARDS KEUANGAN */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4 mb-4">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
            <div className="absolute right-3 top-3 bg-blue-50 p-1.5 rounded-full hidden sm:block">
              <CircleDollarSign size={16} className="text-blue-500" />
            </div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 mb-0.5">Pendapatan Kotor</p>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">{formatRupiah(summaryMetrics.totalRevenue)}</h3>
            <p className="text-[8px] sm:text-[9px] text-slate-400 mt-0.5">Harga sblm dipotong</p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-red-100 shadow-sm flex flex-col justify-center relative overflow-hidden">
            <div className="absolute right-3 top-3 bg-red-50 p-1.5 rounded-full hidden sm:block">
              <TrendingDown size={16} className="text-red-500" />
            </div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-red-500 mb-0.5">Total Potongan</p>
            <h3 className="text-base sm:text-lg font-bold text-red-600 truncate">{formatRupiah(summaryMetrics.totalFees)}</h3>
            <p className="text-[8px] sm:text-[9px] text-red-400 mt-0.5">Komisi & ongkir</p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-sm flex flex-col justify-center relative overflow-hidden border-b-4 border-b-emerald-500">
            <div className="absolute right-3 top-3 bg-emerald-50 p-1.5 rounded-full hidden sm:block">
              <WalletCards size={16} className="text-emerald-600" />
            </div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 mb-0.5">Pencairan (Cair)</p>
            <h3 className="text-base sm:text-lg font-bold text-emerald-600 truncate">{formatRupiah(summaryMetrics.totalNet)}</h3>
            <p className="text-[8px] sm:text-[9px] text-slate-400 mt-0.5">Uang bersih diterima</p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-orange-100 shadow-sm flex flex-col justify-center relative overflow-hidden">
            <div className="absolute right-3 top-3 bg-orange-50 p-1.5 rounded-full hidden sm:block">
              <ShoppingBag size={16} className="text-orange-500" />
            </div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-orange-500 mb-0.5">Total Modal (HPP)</p>
            <h3 className="text-base sm:text-lg font-bold text-orange-600 truncate">{formatRupiah(summaryMetrics.totalHpp)}</h3>
            <p className="text-[8px] sm:text-[9px] text-orange-400 mt-0.5">Akumulasi modal</p>
          </div>

          <div className={`${summaryMetrics.totalProfit < 0 ? 'bg-rose-600 border-rose-700' : 'bg-emerald-600 border-emerald-700'} p-3 rounded-xl border shadow-md flex flex-col justify-center relative overflow-hidden text-white transition-colors duration-300`}>
            <div className="absolute right-3 top-3 bg-white/20 p-1.5 rounded-full hidden sm:block">
              <BarChart3 size={16} className="text-white" />
            </div>
            <p className={`text-[10px] sm:text-[11px] font-semibold mb-0.5 ${summaryMetrics.totalProfit < 0 ? 'text-rose-100' : 'text-emerald-100'}`}>Profit Internal</p>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-base sm:text-lg font-bold text-white truncate">{formatRupiah(summaryMetrics.totalProfit)}</h3>
              {summaryMetrics.totalRevenue > 0 && (
                <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${summaryMetrics.totalProfit < 0 ? 'bg-rose-700/50 text-rose-100' : 'bg-emerald-700/50 text-emerald-100'}`}>
                  {((summaryMetrics.totalProfit / summaryMetrics.totalRevenue) * 100).toFixed(1)}%
                </span>
              )}
            </div>
            <p className={`text-[8px] sm:text-[9px] mt-0.5 ${summaryMetrics.totalProfit < 0 ? 'text-rose-200' : 'text-emerald-100'}`}>Pencairan dikurangi modal</p>
          </div>

          <div className="bg-slate-800 p-3 rounded-xl border border-slate-900 shadow-md flex flex-col justify-center relative overflow-hidden text-white">
            <div className="absolute right-3 top-3 bg-white/10 p-1.5 rounded-full hidden sm:block">
              <Package size={16} className="text-white" />
            </div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-slate-300 mb-0.5">Performa Produk</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white">{summaryMetrics.totalQtyTerjual} <span className="text-[11px] font-normal text-slate-300">Pcs</span></h3>
              {Number(summaryMetrics.rasioRetur) > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${Number(summaryMetrics.rasioRetur) > 10 ? 'bg-red-500/80 text-white' : 'bg-yellow-500/80 text-white'}`} title={`${summaryMetrics.totalPesananGagal} Pesanan Batal/Retur`}>
                  {summaryMetrics.rasioRetur}% Retur
                </span>
              )}
            </div>
            <p className="text-[8px] sm:text-[9px] text-slate-400 mt-0.5">Total barang sukses terjual</p>
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

          {/* Filter Status Dropdown */}
          <div className="relative min-w-[160px]">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-medium shadow-sm transition-all cursor-pointer"
            >
              <option value="Semua Status">Semua Status</option>
              <option value="Selesai">Selesai</option>
              <option value="Retur">Retur</option>
              <option value="Batal">Batal</option>
              <option value="Tagihan Iklan">Tagihan Iklan</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
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

          {/* Tombol Export Data */}
          <button 
            onClick={handleExportData}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg shadow-sm hover:bg-emerald-100 transition-colors text-sm font-medium ml-auto md:ml-0"
          >
            <Download size={16} />
            Export Data
          </button>
        </div>

{/* DATA TABLE */}
{/* --- WADAH TABEL (Mengisi sisa ruang & memiliki flex-col) --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
          
          {/* --- AREA SCROLL ISI TABEL --- */}
{/* --- AREA SCROLL ISI TABEL --- */}
          {/* Tambahan w-full dan perbaikan agar bisa digeser horizontal di HP */}
          <div className="overflow-x-auto overflow-y-auto flex-1 relative w-full">
            <table className="w-full min-w-[800px] text-left border-collapse">
              {/* Tambahkan sticky, top-0, dan z-10 agar menempel di atas */}
              <thead className="bg-slate-50 sticky top-0 z-10 outline outline-1 outline-slate-200 shadow-sm">
                <tr>
                  <th onClick={() => requestSort('orderId')} className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer group hover:bg-slate-100 transition-colors">
                    <div className="flex items-center">Order ID {getSortIcon('orderId')}</div>
                  </th>
                  <th onClick={() => requestSort('orderStatus')} className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer group hover:bg-slate-100 transition-colors">
                    <div className="flex items-center">Status Pesanan {getSortIcon('orderStatus')}</div>
                  </th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">
                    Status Dana
                  </th>
                  <th onClick={() => requestSort('createdDate')} className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer group hover:bg-slate-100 transition-colors">
                    <div className="flex items-center">Tgl Dibuat {getSortIcon('createdDate')}</div>
                  </th>
                  <th onClick={() => requestSort('date')} className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer group hover:bg-slate-100 transition-colors">
                    <div className="flex items-center">Tgl Selesai {getSortIcon('date')}</div>
                  </th>
                  <th onClick={() => requestSort('qty')} className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer group hover:bg-slate-100 transition-colors text-center">
                    <div className="flex items-center justify-center">QTY {getSortIcon('qty')}</div>
                  </th>
                  <th onClick={() => requestSort('subtotal')} className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer group hover:bg-slate-100 transition-colors text-right">
                    <div className="flex items-center justify-end">Harga Jual {getSortIcon('subtotal')}</div>
                  </th>
                  <th onClick={() => requestSort('hppPerItem')} className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer group hover:bg-slate-200 transition-colors text-right font-bold bg-slate-100/50">
                    <div className="flex items-center justify-end">Harga Modal {getSortIcon('hppPerItem')}</div>
                  </th>
                  <th onClick={() => requestSort('totalHpp')} className="px-6 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer group hover:bg-slate-200 transition-colors text-right font-bold bg-slate-100/50">
                    <div className="flex items-center justify-end">Total HPP {getSortIcon('totalHpp')}</div>
                  </th>
                  <th onClick={() => requestSort('fees')} className="px-6 py-3.5 text-[11px] font-semibold text-red-500 uppercase tracking-wider cursor-pointer group hover:bg-slate-100 transition-colors text-right">
                    <div className="flex items-center justify-end">Total Potongan {getSortIcon('fees')}</div>
                  </th>
                  <th onClick={() => requestSort('labaBersih')} className="px-6 py-3.5 text-[11px] font-semibold text-emerald-600 uppercase tracking-wider cursor-pointer group hover:bg-slate-100 transition-colors text-right font-bold">
                    <div className="flex items-center justify-end">Laba Bersih {getSortIcon('labaBersih')}</div>
                  </th>
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
                      <td className="px-6 py-4 text-center">
                        {item.net > 0 ? (
                          <span className="px-2 py-1 rounded border border-emerald-200 bg-emerald-50 text-emerald-600 text-[10px] font-bold">CAIR</span>
                        ) : item.net < 0 ? (
                          <span className="px-2 py-1 rounded border border-red-200 bg-red-50 text-red-600 text-[10px] font-bold">DIPOTONG</span>
                        ) : (
                          <span className="px-2 py-1 rounded border border-slate-200 bg-slate-100 text-slate-500 text-[10px] font-bold">NIL</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700 whitespace-nowrap">{formatDisplayDate(item.createdDate)}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700 whitespace-nowrap">{formatDisplayDate(item.date)}</td>
                      <td className="px-6 py-4 text-sm text-center text-slate-600">{item.qty}</td>
                      <td className="px-6 py-4 text-sm text-right text-slate-600">{formatRupiah(item.subtotal / (item.qty || 1))}</td>
                      <td className={`px-6 py-4 text-sm text-right font-medium relative ${item.hppPerItem === 0 && item.orderStatus !== 'Batal' && item.orderStatus !== 'Retur' ? 'bg-yellow-50 text-yellow-700' : 'text-slate-500'}`}>
                        {item.hppPerItem === 0 && item.orderStatus !== 'Batal' && item.orderStatus !== 'Retur' && (
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-yellow-500 cursor-help" title="HPP Rp 0! Tambahkan SKU produk ini di Master Produk agar Laba Bersih akurat.">⚠️</span>
                        )}
                        {formatRupiah(item.hppPerItem)}
                      </td>
                      <td className={`px-6 py-4 text-sm text-right font-bold ${item.hppPerItem === 0 && item.orderStatus !== 'Batal' && item.orderStatus !== 'Retur' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-50 text-slate-700'}`}>
                        {formatRupiah(item.totalHpp)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-red-500 font-medium">{formatRupiah(item.fees)}</td>
                      <td className={`px-6 py-4 text-sm text-right font-bold ${item.labaBersih < 0 ? 'text-red-500' : item.labaBersih > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {formatRupiah(item.labaBersih)}
                      </td>
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
                  <div className="min-w-0">
                    <p className="text-slate-500 mb-1">Nama Produk</p>
                    <p className="font-semibold text-slate-900 truncate" title={salesOrders.find(s => String(s.orderId).replace(/\D/g, '') === String(selectedOrder.orderId).replace(/\D/g, ''))?.productName || selectedOrder.productName || "Tidak Diketahui"}>
                      {salesOrders.find(s => String(s.orderId).replace(/\D/g, '') === String(selectedOrder.orderId).replace(/\D/g, ''))?.productName || selectedOrder.productName || "Tidak Diketahui"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-slate-500 mb-1">SKU / Variasi</p>
                    <p className="font-semibold text-slate-900 truncate" title={salesOrders.find(s => String(s.orderId).replace(/\D/g, '') === String(selectedOrder.orderId).replace(/\D/g, ''))?.sku || selectedOrder.sku || "-"}>
                      {salesOrders.find(s => String(s.orderId).replace(/\D/g, '') === String(selectedOrder.orderId).replace(/\D/g, ''))?.sku || selectedOrder.sku || "-"}
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