"use client";

import { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import { 
  Search, Plus, Filter, Edit3, Trash2, 
  Package, Image as ImageIcon, ChevronLeft, ChevronRight,
  Eye, Download, Store, Upload, Save
} from "lucide-react";

export default function MasterProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 2. STATE UNTUK FILTER & PAGINATION
  const [globalSearch, setGlobalSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("Semua");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // FETCH DATA DARI DATABASE SAAT REFRESH
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products');
        if (res.ok) {
          const data = await res.json();
          setProducts(data);
        }
      } catch (error) {
        console.error("Gagal tarik data produk");
      }
    };
    fetchProducts();
  }, []);

  // FUNGSI MEMBACA FILE EXCEL
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
        
        // Auto-detect Header Baris
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(20, rawData.length); i++) {
          const rowStr = String(rawData[i]?.join(" ")).toLowerCase();
          if (rowStr.includes("sku produk") || rowStr.includes("nama produk")) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) throw new Error("Header tidak ditemukan");

        const parsedData = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex }) as any[];
        
        const getVal = (row: any, key: string) => {
          // Mencari kunci dengan menghapus semua spasi dan karakter aneh agar pasti ketemu
          const clean = (s: string) => s.replace(/\s+/g, '').toLowerCase();
          const targetKey = clean(key);
          const actualKey = Object.keys(row).find(k => clean(k) === targetKey);
          return actualKey ? row[actualKey] : undefined;
        };

        const formattedData = parsedData
          .filter(row => getVal(row, "SKU PRODUK") || getVal(row, "Nama Produk"))
          .map((row, index) => {
            // Fungsi pembersih angka biasa (untuk kuantitas stok)
            const parseNum = (val: any) => {
              const n = parseFloat(val);
              return isNaN(n) ? 0 : n;
            };

            // FUNGSI BARU: Pembersih khusus UANG (menghapus "Rp", spasi, dan titik)
            const parseCurrency = (val: any) => {
              if (!val) return 0;
              if (typeof val === 'number') return val;
              return Number(val.toString().replace(/[^0-9]/g, '')) || 0;
            };

            const sAwal = parseNum(getVal(row, "Stock Awal"));
            const terjual = parseNum(getVal(row, "Penjualan"));
            const sTersediaExcel = getVal(row, "Stok Tersedia");
            
            const sTersedia = (sTersediaExcel !== undefined && sTersediaExcel !== "") 
              ? parseNum(sTersediaExcel) 
              : (sAwal - terjual);

            return {
              id: index + 1,
              sku: String(getVal(row, "SKU PRODUK") || `NO-SKU-${index}-${Math.floor(Math.random() * 1000)}`).trim(),
              kategori: String(getVal(row, "Kategori") || "-").trim(),
              name: String(getVal(row, "Nama Produk") || "-").trim(),
              variation: String(getVal(row, "VARIASI PRODAK") || "-").trim(),
              
              // PERUBAHAN DISINI: Menggunakan parseCurrency untuk Harga
              hargaModal: parseCurrency(getVal(row, "Harga Modal")),
              hargaJual: parseCurrency(getVal(row, "Harga Jual")),
              
              stokAwal: sAwal,
              status: String(getVal(row, "Status") || "Aktif").trim(),
              penjualan: terjual,
              stokTersedia: sTersedia,
              platforms: ["Shopee", "TikTok", "Tokopedia"]
            };
          });

        setProducts(formattedData);
        setCurrentPage(1);
      } catch (error) {
        console.error(error);
        alert("Gagal membaca file Excel. Pastikan format kolom sesuai.");
      } finally {
        setIsUploading(false);
        e.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  // FUNGSI SIMPAN KE DATABASE NEON
  const handleSaveToDatabase = async () => {
    if (products.length === 0) return alert("Upload data excel produk terlebih dahulu!");
    setIsSaving(true);
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(products),
      });
      if (response.ok) alert("Data Master Produk Berhasil Disimpan ke Database!");
      else alert("Gagal menyimpan ke database.");
    } catch (error) {
      alert("Error koneksi API Database.");
    } finally { setIsSaving(false); }
  };

  // 3. LOGIKA FILTERING
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(globalSearch.toLowerCase()) || p.sku.toLowerCase().includes(globalSearch.toLowerCase());
      const matchesPlatform = platformFilter === "Semua" ? true : p.platforms.includes(platformFilter);
      return matchesSearch && matchesPlatform;
    });
  }, [products, globalSearch, platformFilter]);

  // 4. LOGIKA PAGINATION
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);

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

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);
  };

  // 5. RENDERER UNTUK LABEL PLATFORM
  const renderPlatformBadges = (platforms: string[]) => {
    return (
      <div className="flex flex-wrap gap-1">
        {platforms.map((plat, idx) => {
          let bgColor = "bg-slate-100 text-slate-600";
          if (plat === "Shopee") bgColor = "bg-orange-50 text-[#EE4D2D] border border-orange-200";
          if (plat === "TikTok") bgColor = "bg-slate-100 text-black border border-slate-300";
          if (plat === "Tokopedia") bgColor = "bg-emerald-50 text-emerald-600 border border-emerald-200";
          
          return (
            <span key={idx} className={`px-2 py-0.5 rounded text-[10px] font-bold ${bgColor}`}>
              {plat}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <main className="flex-1 p-8 bg-slate-50 min-h-screen text-slate-800">
      {/* HEADER */}
      <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package size={24} className="text-indigo-600" /> Master Produk
          </h2>
          <p className="text-slate-500 text-sm mt-1">Kelola stok, harga, dan variasi produk untuk semua platform marketplace.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleSaveToDatabase} disabled={isSaving || products.length === 0} className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 flex items-center gap-2 text-sm font-bold disabled:opacity-50 transition-all shadow-sm">
            <Save size={16} /> {isSaving ? "Menyimpan..." : "Simpan ke Neon"}
          </button>
          <label className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg cursor-pointer hover:bg-indigo-700 flex items-center gap-2 text-sm font-bold shadow-sm transition-all">
            <Upload size={16} /> {isUploading ? "Memproses..." : "Upload Excel Produk"}
            <input type="file" accept=".csv, .xlsx" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </header>

      {/* SEARCH & FILTER BAR */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari Nama Produk atau SKU..." 
            value={globalSearch}
            onChange={(e) => { setGlobalSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-lg focus:bg-white outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all text-sm"
          />
        </div>
        
        <div className="flex gap-3">
          <div className="relative min-w-[160px]">
            <Store size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select 
              value={platformFilter}
              onChange={(e) => { setPlatformFilter(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 appearance-none cursor-pointer"
            >
              <option value="Semua">Semua Platform</option>
              <option value="Shopee">Shopee</option>
              <option value="TikTok">TikTok</option>
              <option value="Tokopedia">Tokopedia</option>
            </select>
          </div>
        </div>
      </div>

      {/* DATA TABLE (STICKY HEADER) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[65vh]">
          <table className="w-full text-left border-collapse relative">
            <thead className="bg-slate-50 sticky top-0 z-10 outline outline-1 outline-slate-200 shadow-sm">
              <tr>
                <th className="px-4 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider text-center">No</th>
                <th className="px-4 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider">SKU PRODUK</th>
                <th className="px-4 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider">Kategori</th>
                <th className="px-4 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider">Nama Produk</th>
                <th className="px-4 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider">VARIASI PRODAK</th>
                <th className="px-4 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider text-right">Harga Modal</th>
                <th className="px-4 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider text-right">Harga Jual</th>
                <th className="px-4 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider text-center">Stock Awal</th>
                <th className="px-4 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-4 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider text-center">Penjualan</th>
                <th className="px-4 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider text-center">Stok Tersedia</th>
                <th className="px-4 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider text-center">Indikator Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentItems.length > 0 ? (
                currentItems.map((product, index) => {
                  const sTersedia = product.stokTersedia;
                  
                  // LOGIKA OTOMATIS WARNA INDIKATOR STOK
                  let indikator = "Aman";
                  let indColor = "bg-emerald-50 text-emerald-600 border-emerald-200";
                  if (sTersedia === 0) { 
                    indikator = "Habis"; 
                    indColor = "bg-red-50 text-red-600 border-red-200"; 
                  } else if (sTersedia <= 10) { 
                    indikator = "Menipis"; 
                    indColor = "bg-orange-50 text-orange-600 border-orange-200"; 
                  }

                  return (
                    <tr key={product.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-50">
                      <td className="px-4 py-4 text-sm text-slate-600 text-center">{indexOfFirstItem + index + 1}</td>
                      <td className="px-4 py-4 text-[13px] font-mono text-slate-600 font-medium">{product.sku}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{product.kategori}</td>
                      <td className="px-4 py-4 text-[16px] font-bold text-slate-900 hover:text-indigo-600 cursor-pointer leading-tight">{product.name}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{product.variation || "-"}</td>
                      <td className="px-4 py-4 text-sm text-right text-slate-600">{formatRupiah(product.hargaModal)}</td>
                      <td className="px-4 py-4 text-[16px] text-right text-slate-900 font-bold">{formatRupiah(product.hargaJual)}</td>
                      <td className="px-4 py-4 text-sm text-center text-slate-600">{product.stokAwal}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-[12px] font-bold uppercase tracking-wider ${
                          product.status === 'Aktif' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {product.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-center text-emerald-600 font-bold">{product.penjualan}</td>
                      <td className="px-4 py-4 text-sm text-center font-bold text-slate-800">{sTersedia}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-[12px] font-bold uppercase tracking-wider border ${indColor}`}>
                          {indikator}
                        </span>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-slate-500">
                    <Package size={32} className="mx-auto mb-3 text-slate-300" />
                    <p className="font-medium">Tidak ada produk yang ditemukan</p>
                    <p className="text-xs mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER (GAYA TIKTOK BLACK) */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-500">
            Menampilkan <span className="font-medium text-slate-900">{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredProducts.length)}</span> dari <span className="font-medium text-slate-900">{filteredProducts.length}</span> data
          </div>

          <div className="flex items-center gap-2">
            {/* Dropdown Items per Page */}
            <div className="relative">
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="appearance-none bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-black focus:border-black block w-full pl-3 pr-8 py-1.5 cursor-pointer outline-none transition-all shadow-sm"
              >
                <option value={10}>10 / halaman</option>
                <option value={20}>20 / halaman</option>
                <option value={50}>50 / halaman</option>
                <option value={100}>100 / halaman</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </div>

            {/* Pagination Buttons Container */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-black disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
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
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-black disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}