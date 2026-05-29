"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Download,
  Package,
  Save,
  Search,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Store,
  XCircle,
  Loader2,
  RefreshCw,
  FileSpreadsheet,
  CircleAlert
} from "lucide-react";
import { cleanObjectKeys, formatRupiah, parseCurrency, toISODate } from "@/app/lib/marketplaceFinance";

type ProductRow = {
  id: number;
  platform: string;
  sku: string;
  internalSku: string;
  marketplaceSku: string;
  marketplaceSkuId: string;
  marketplaceVariationId: string;
  kategori: string;
  name: string;
  variation: string;
  hargaModal: number;
  hargaJual: number;
  effectiveFrom: string;
  effectiveTo: string;
  stokAwal: number;
  penjualan: number;
  stokTersedia: number;
  status: string;
  hppMappingStatus: "Valid" | "Perlu Mapping";
  platforms: string[];
  rawData?: unknown;
};

type ToastState = {
  type: "success" | "error" | "warning";
  text: string;
} | null;

export default function MasterProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("Semua");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
    }, 3500);

    return () => clearTimeout(timer);
  }, [toast]);

  const normalizeHeader = (value: unknown) => {
    return String(value || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[_\-./():]/g, "")
      .trim();
  };

  const normalizeText = (value: unknown) => {
    return String(value ?? "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const normalizeSku = (value: unknown) => {
    const text = normalizeText(value);

    if (!text || text === "-" || text.toLowerCase() === "undefined" || text.toLowerCase() === "null") {
      return "";
    }

    return text;
  };

  const normalizePlatform = (value: unknown) => {
    const text = normalizeText(value);

    if (!text || text === "-" || text.toLowerCase() === "undefined" || text.toLowerCase() === "null") {
      return "Internal";
    }

    return text;
  };

  const resolveProductPlatforms = (platformValue: unknown) => {
    const platform = normalizePlatform(platformValue);

    if (platform.toLowerCase() === "internal") {
      return ["Internal", "Shopee", "TikTok"];
    }

    return [platform];
  };

  const normalizeStatus = (value: unknown) => {
    const text = normalizeText(value);

    if (!text || text === "-") {
      return "Aktif";
    }

    return text;
  };

  const readValue = (row: Record<string, unknown>, aliases: string[]) => {
    const normalizedAliases = aliases.map((alias) => normalizeHeader(alias));

    for (const [key, value] of Object.entries(row)) {
      if (normalizedAliases.includes(normalizeHeader(key))) {
        return value;
      }
    }

    return "";
  };

  const getHppMappingStatus = (item: Partial<ProductRow>): "Valid" | "Perlu Mapping" => {
    const hasSku = Boolean(
      normalizeSku(item.internalSku) ||
      normalizeSku(item.marketplaceSku) ||
      normalizeSku(item.marketplaceSkuId) ||
      normalizeSku(item.marketplaceVariationId) ||
      normalizeSku(item.sku)
    );

    const hasName = Boolean(normalizeText(item.name) && normalizeText(item.name) !== "-");
    const hasHargaModal = Number(item.hargaModal || 0) > 0;

    return hasSku && hasName && hasHargaModal ? "Valid" : "Perlu Mapping";
  };

  const normalizeProductRow = (rawItem: Record<string, unknown>, index: number): ProductRow => {
    const row = cleanObjectKeys(rawItem) as Record<string, unknown>;

    const platform = normalizePlatform(
      readValue(row, [
        "platform",
        "Platform",
        "marketplace",
        "Marketplace",
        "Sumber",
        "Channel"
      ])
    );

    const marketplaceSku = normalizeSku(
      readValue(row, [
        "marketplaceSku",
        "SKU Marketplace",
        "Seller SKU",
        "SKU Penjual",
        "Nomor Referensi SKU",
        "SKU PRODUK",
        "SKU Produk",
        "SKU",
        "sku"
      ])
    );

    const internalSku = normalizeSku(
      readValue(row, [
        "internalSku",
        "SKU Internal",
        "Internal SKU",
        "SKU PRODUK",
        "SKU Produk",
        "SKU",
        "sku"
      ]) || marketplaceSku
    );

    const marketplaceSkuId = normalizeSku(
      readValue(row, [
        "marketplaceSkuId",
        "SKU ID",
        "ID SKU",
        "Sku ID",
        "ID Produk Marketplace"
      ])
    );

    const marketplaceVariationId = normalizeSku(
      readValue(row, [
        "marketplaceVariationId",
        "Variation ID",
        "ID Variasi",
        "Variation Id",
        "ID Variation"
      ])
    );

    const name = normalizeText(
      readValue(row, [
        "name",
        "Nama Produk",
        "Product Name",
        "Nama Barang",
        "Produk",
        "Nama"
      ])
    ) || "-";

    const variation = normalizeText(
      readValue(row, [
        "variation",
        "VARIASI PRODAK",
        "Variasi Produk",
        "Variation",
        "Variation Name",
        "Variasi"
      ])
    ) || "-";

    const kategori = normalizeText(
      readValue(row, [
        "kategori",
        "Kategori",
        "Category",
        "Kategori Produk"
      ])
    ) || "-";

    const hargaModal = parseCurrency(
      readValue(row, [
        "hargaModal",
        "Harga Modal",
        "HPP",
        "Harga HPP",
        "Modal",
        "Harga Pokok"
      ])
    );

    const hargaJual = parseCurrency(
      readValue(row, [
        "hargaJual",
        "Harga Jual",
        "Selling Price",
        "Harga Produk",
        "Harga"
      ])
    );

    const stokAwal = Number(
      readValue(row, [
        "stokAwal",
        "Stock Awal",
        "Stok Awal",
        "Stok",
        "Stock"
      ]) || 0
    ) || 0;

    const penjualan = Number(
      readValue(row, [
        "penjualan",
        "Penjualan",
        "Terjual",
        "Qty Terjual"
      ]) || 0
    ) || 0;

    const stokExcel = readValue(row, [
      "stokTersedia",
      "Stok Tersedia",
      "Stock Tersedia",
      "Stok Saat Ini",
      "Sisa Stok"
    ]);

    const stokTersedia =
      stokExcel !== undefined && stokExcel !== ""
        ? Number(stokExcel) || 0
        : stokAwal - penjualan;

    const effectiveFrom = toISODate(
      readValue(row, [
        "effectiveFrom",
        "Berlaku Mulai",
        "Effective From",
        "Mulai Berlaku",
        "Tanggal Mulai"
      ])
    );

    const effectiveTo = toISODate(
      readValue(row, [
        "effectiveTo",
        "Berlaku Sampai",
        "Effective To",
        "Sampai Berlaku",
        "Tanggal Selesai"
      ])
    );

    const idValue = Number(
      readValue(row, [
        "id",
        "ID",
        "No",
        "Nomor"
      ])
    );

    const baseProduct: ProductRow = {
      id: Number.isFinite(idValue) && idValue > 0 ? idValue : index + 1,
      platform,
      sku: internalSku || marketplaceSku || marketplaceSkuId || marketplaceVariationId || `NO-SKU-${index + 1}`,
      internalSku: internalSku || marketplaceSku || marketplaceSkuId || marketplaceVariationId || `NO-SKU-${index + 1}`,
      marketplaceSku,
      marketplaceSkuId,
      marketplaceVariationId,
      kategori,
      name,
      variation,
      hargaModal,
      hargaJual,
      effectiveFrom,
      effectiveTo,
      stokAwal,
      penjualan,
      stokTersedia,
      status: normalizeStatus(readValue(row, ["status", "Status"])),
      hppMappingStatus: "Perlu Mapping",
      platforms: resolveProductPlatforms(platform),
      rawData: row
    };

    return {
      ...baseProduct,
      hppMappingStatus: getHppMappingStatus(baseProduct)
    };
  };

  const fetchProducts = async () => {
    setIsFetching(true);

    try {
      const res = await fetch("/api/products");

      if (!res.ok) {
        setIsFetching(false);
        return;
      }

      const data = await res.json();
      const source = Array.isArray(data) ? data : Array.isArray(data?.products) ? data.products : [];

      const normalized = source.map((item: Record<string, unknown>, index: number) => {
        return normalizeProductRow(item, index);
      });

      setProducts(normalized);
    } catch {
      setToast({ type: "error", text: "Gagal mengambil data master produk." });
    } finally {
      setIsFetching(false);
    }
  };

  const detectHeaderRow = (rows: unknown[][]) => {
    for (let i = 0; i < Math.min(rows.length, 40); i++) {
      const text = String((rows[i] || []).join(" ")).toLowerCase();

      const hasSku = text.includes("sku") || text.includes("produk");
      const hasName = text.includes("nama produk") || text.includes("nama barang");
      const hasHpp = text.includes("harga modal") || text.includes("hpp") || text.includes("modal");

      if (hasSku && hasName && hasHpp) {
        return i;
      }
    }

    return -1;
  };

  const parseWorkbookToProducts = (workbook: XLSX.WorkBook) => {
    let selectedSheet: XLSX.WorkSheet | null = null;
    let selectedHeaderRow = -1;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        raw: false
      }) as unknown[][];

      const headerRowIndex = detectHeaderRow(rawRows);

      if (headerRowIndex !== -1) {
        selectedSheet = sheet;
        selectedHeaderRow = headerRowIndex;
        break;
      }
    }

    if (!selectedSheet || selectedHeaderRow === -1) {
      throw new Error("Header master produk tidak ditemukan.");
    }

    const parsedRows = XLSX.utils.sheet_to_json(selectedSheet, {
      range: selectedHeaderRow,
      defval: "",
      raw: false
    }) as Record<string, unknown>[];

    const formatted = parsedRows
      .map((row) => cleanObjectKeys(row) as Record<string, unknown>)
      .filter((row) => {
        const sku = normalizeSku(
          readValue(row, [
            "SKU Marketplace",
            "Seller SKU",
            "SKU Penjual",
            "Nomor Referensi SKU",
            "SKU PRODUK",
            "SKU Produk",
            "SKU Internal",
            "Internal SKU",
            "SKU"
          ])
        );

        const name = normalizeText(
          readValue(row, [
            "Nama Produk",
            "Product Name",
            "Nama Barang",
            "Produk"
          ])
        );

        const hargaModal = parseCurrency(
          readValue(row, [
            "Harga Modal",
            "HPP",
            "Harga HPP",
            "Modal"
          ])
        );

        return Boolean(sku || name || hargaModal > 0);
      })
      .map((row, index) => normalizeProductRow(row, index));

    if (formatted.length === 0) {
      throw new Error("Tidak ada baris produk yang bisa dibaca.");
    }

    return formatted;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setIsUploading(true);

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const workbook = XLSX.read(event.target?.result, {
          type: "array",
          cellDates: true
        });

        const formatted = parseWorkbookToProducts(workbook);

        setProducts(formatted);

        const invalidAfterUpload = formatted.filter((item) => item.hppMappingStatus === "Perlu Mapping").length;

        if (invalidAfterUpload > 0) {
          setToast({
            type: "warning",
            text: `${formatted.length} produk berhasil dibaca. ${invalidAfterUpload} baris masih perlu dicek karena SKU, nama produk, atau harga modal kosong.`
          });
        } else {
          setToast({
            type: "success",
            text: `${formatted.length} produk berhasil dibaca dan semua mapping HPP valid.`
          });
        }
      } catch (error) {
        console.error(error);
        setToast({
          type: "error",
          text: "Gagal membaca file. Pastikan kolom SKU PRODUK, Nama Produk, dan Harga Modal ada di file Excel."
        });
      } finally {
        setIsUploading(false);
        e.target.value = "";
      }
    };

    reader.onerror = () => {
      setIsUploading(false);
      e.target.value = "";
      setToast({ type: "error", text: "File gagal dibaca oleh browser." });
    };

    reader.readAsArrayBuffer(file);
  };

  const handleSaveToDatabase = async () => {
    if (products.length === 0) {
      setToast({ type: "error", text: "Upload data master produk terlebih dahulu." });
      return;
    }

    const invalid = products.filter((item) => item.hppMappingStatus === "Perlu Mapping");

    if (invalid.length > 0) {
      const ok = window.confirm(
        `Masih ada ${invalid.length} baris yang belum lengkap. Tetap simpan sebagai draft?`
      );

      if (!ok) return;
    }

    const payload = products.map(({ rawData, ...item }) => ({
      ...item,
      hppMappingStatus: getHppMappingStatus(item)
    }));

    setIsSaving(true);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Gagal simpan");
      }

      setToast({ type: "success", text: "Master HPP berhasil disimpan." });
      fetchProducts();
    } catch {
      setToast({ type: "error", text: "Gagal menyimpan ke database." });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const keyword = globalSearch.toLowerCase().trim();

    return products.filter((item) => {
      const matchesSearch =
        !keyword ||
        [
          item.platform,
          item.marketplaceSku,
          item.marketplaceSkuId,
          item.marketplaceVariationId,
          item.internalSku,
          item.sku,
          item.kategori,
          item.name,
          item.variation,
          item.status,
          item.hppMappingStatus
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword);

      const itemPlatforms = Array.isArray(item.platforms) && item.platforms.length > 0 ? item.platforms : [item.platform || "Internal"];
      const matchesPlatform = platformFilter === "Semua" || itemPlatforms.includes(platformFilter);
      const matchesStatus = statusFilter === "Semua" || item.hppMappingStatus === statusFilter;

      return matchesSearch && matchesPlatform && matchesStatus;
    });
  }, [products, globalSearch, platformFilter, statusFilter]);

  const platforms = useMemo(() => {
    return Array.from(
      new Set(
        products.flatMap((item) => {
          if (Array.isArray(item.platforms) && item.platforms.length > 0) return item.platforms;
          return [item.platform || "Internal"];
        })
      )
    );
  }, [products]);

  const validCount = useMemo(() => {
    return products.filter((item) => getHppMappingStatus(item) === "Valid").length;
  }, [products]);

  const invalidCount = useMemo(() => {
    return products.length - validCount;
  }, [products, validCount]);

  const totalHpp = useMemo(() => {
    return products.reduce((acc, item) => acc + Number(item.hargaModal || 0), 0);
  }, [products]);

  const exportMissingMapping = () => {
    const data = products.filter((item) => item.hppMappingStatus === "Perlu Mapping");

    if (data.length === 0) {
      setToast({ type: "success", text: "Tidak ada mapping HPP yang bermasalah." });
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(
      data.map((item) => ({
        Platform: item.platform,
        "SKU Marketplace": item.marketplaceSku,
        "SKU ID": item.marketplaceSkuId,
        "Variation ID": item.marketplaceVariationId,
        "SKU Internal": item.internalSku,
        Kategori: item.kategori,
        "Nama Produk": item.name,
        Variasi: item.variation,
        "Harga Modal": item.hargaModal,
        "Harga Jual": item.hargaJual,
        "Berlaku Mulai": item.effectiveFrom,
        "Berlaku Sampai": item.effectiveTo,
        Status: item.hppMappingStatus
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Belum Mapping");
    XLSX.writeFile(workbook, "HPP_Belum_Mapping.xlsx");
  };

  const exportAllProducts = () => {
    if (products.length === 0) {
      setToast({ type: "error", text: "Belum ada data untuk diexport." });
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(
      products.map((item) => ({
        Platform: item.platform,
        "SKU Marketplace": item.marketplaceSku,
        "SKU ID": item.marketplaceSkuId,
        "Variation ID": item.marketplaceVariationId,
        "SKU Internal": item.internalSku,
        Kategori: item.kategori,
        "Nama Produk": item.name,
        Variasi: item.variation,
        "Harga Modal": item.hargaModal,
        "Harga Jual": item.hargaJual,
        "Stok Awal": item.stokAwal,
        Penjualan: item.penjualan,
        "Stok Tersedia": item.stokTersedia,
        "Berlaku Mulai": item.effectiveFrom,
        "Berlaku Sampai": item.effectiveTo,
        Status: item.hppMappingStatus
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Master HPP");
    XLSX.writeFile(workbook, "Master_HPP_Produk.xlsx");
  };

  const StatCard = ({
    title,
    value,
    subtitle,
    icon,
    variant
  }: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ReactNode;
    variant: "slate" | "emerald" | "amber" | "indigo";
  }) => {
    const variants = {
      slate: "border-slate-200 bg-white text-slate-900",
      emerald: "border-emerald-200 bg-emerald-50/40 text-emerald-700",
      amber: "border-amber-200 bg-amber-50/40 text-amber-700",
      indigo: "border-indigo-200 bg-indigo-50/40 text-indigo-700"
    };

    const iconVariants = {
      slate: "bg-slate-100 text-slate-600",
      emerald: "bg-emerald-100 text-emerald-700",
      amber: "bg-amber-100 text-amber-700",
      indigo: "bg-indigo-100 text-indigo-700"
    };

    return (
      <div className={`rounded-xl border p-4 shadow-sm ${variants[variant]}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-black mb-1">{title}</p>
            <h3 className="text-2xl font-black">{value}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
          </div>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconVariants[variant]}`}>
            {icon}
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="flex-1 bg-slate-50 min-h-screen text-slate-800 p-4 md:p-8 overflow-x-hidden">
      {toast && (
        <div className="fixed top-5 right-5 z-50 w-[calc(100%-2rem)] max-w-sm">
          <div
            className={`rounded-2xl border px-4 py-3 shadow-xl bg-white flex items-start gap-3 ${
              toast.type === "success"
                ? "border-emerald-200"
                : toast.type === "warning"
                ? "border-amber-200"
                : "border-red-200"
            }`}
          >
            <div
              className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center ${
                toast.type === "success"
                  ? "bg-emerald-50 text-emerald-600"
                  : toast.type === "warning"
                  ? "bg-amber-50 text-amber-600"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle2 size={18} />
              ) : toast.type === "warning" ? (
                <CircleAlert size={18} />
              ) : (
                <XCircle size={18} />
              )}
            </div>

            <div className="flex-1">
              <p className="text-sm font-black text-slate-800">
                {toast.type === "success" ? "Berhasil" : toast.type === "warning" ? "Perhatian" : "Gagal"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{toast.text}</p>
            </div>

            <button type="button" onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
              <XCircle size={16} />
            </button>
          </div>
        </div>
      )}

      <header className="mb-6 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package size={24} className="text-indigo-600" />
            Master HPP Produk
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Upload file produk internal atau marketplace. Mapping valid jika SKU, nama produk, dan harga modal sudah terisi.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={fetchProducts}
            disabled={isFetching}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={exportMissingMapping}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50"
          >
            <Download size={16} />
            Export Belum Mapping
          </button>

          <button
            type="button"
            onClick={exportAllProducts}
            disabled={products.length === 0}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-50"
          >
            <FileSpreadsheet size={16} />
            Export Semua
          </button>

          <button
            type="button"
            onClick={handleSaveToDatabase}
            disabled={isSaving || products.length === 0}
            className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-emerald-700"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? "Menyimpan..." : "Simpan Master HPP"}
          </button>

          <label className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-indigo-700">
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {isUploading ? "Memproses..." : "Upload Master HPP"}
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <StatCard
          title="Total Produk"
          value={products.length}
          subtitle="Semua data terbaca"
          icon={<Package size={18} />}
          variant="slate"
        />

        <StatCard
          title="Valid"
          value={validCount}
          subtitle="SKU, nama, dan HPP lengkap"
          icon={<CheckCircle2 size={18} />}
          variant="emerald"
        />

        <StatCard
          title="Perlu Dicek"
          value={invalidCount}
          subtitle="Ada data kosong"
          icon={<AlertTriangle size={18} />}
          variant="amber"
        />

        <StatCard
          title="Total Nilai HPP"
          value={formatRupiah(totalHpp)}
          subtitle="Akumulasi harga modal"
          icon={<Save size={18} />}
          variant="indigo"
        />
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col xl:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Cari SKU, produk, variasi, kategori, platform..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <div className="relative xl:w-64">
            <Store size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-sm font-bold outline-none focus:border-indigo-500"
            >
              <option value="Semua">Semua Platform</option>
              {platforms.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
          </div>

          <div className="relative xl:w-64">
            <CheckCircle2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-sm font-bold outline-none focus:border-indigo-500"
            >
              <option value="Semua">Semua Status</option>
              <option value="Valid">Valid</option>
              <option value="Perlu Mapping">Perlu Mapping</option>
            </select>
          </div>
        </div>

        <div className="overflow-auto max-h-[65vh]">
          <table className="w-full min-w-[1280px] text-left">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
              <tr>
                {[
                  "Platform",
                  "SKU Marketplace",
                  "SKU ID",
                  "SKU Internal",
                  "Kategori",
                  "Nama Produk",
                  "Variasi",
                  "Harga Modal",
                  "Harga Jual",
                  "Stok",
                  "Berlaku",
                  "Status"
                ].map((title) => (
                  <th
                    key={title}
                    className="px-4 py-3 text-[11px] uppercase tracking-wider font-black text-slate-500"
                  >
                    {title}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredProducts.map((item, index) => (
                <tr
                  key={`${item.platform}-${item.internalSku}-${item.marketplaceSku}-${item.marketplaceSkuId}-${index}`}
                  className="hover:bg-slate-50"
                >
                  <td className="px-4 py-3 text-sm font-bold text-slate-700">
                    <div className="flex flex-col gap-1">
                      <span>{item.platform}</span>
                      {item.platform === "Internal" && Array.isArray(item.platforms) && item.platforms.length > 1 && (
                        <span className="w-max rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-black text-indigo-700">
                          Fallback Shopee/TikTok
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-sm font-mono text-slate-700">
                    {item.marketplaceSku || item.internalSku || "-"}
                  </td>

                  <td className="px-4 py-3 text-sm font-mono text-slate-500">
                    {item.marketplaceSkuId || item.marketplaceVariationId || "-"}
                  </td>

                  <td className="px-4 py-3 text-sm font-mono text-slate-700">
                    {item.internalSku || "-"}
                  </td>

                  <td className="px-4 py-3 text-xs text-slate-600">
                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-bold">
                      {item.kategori || "-"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-sm font-bold text-slate-800 max-w-[320px] truncate">
                    {item.name || "-"}
                  </td>

                  <td className="px-4 py-3 text-sm text-slate-500 max-w-[220px] truncate">
                    {item.variation || "-"}
                  </td>

                  <td className="px-4 py-3 text-sm font-black text-slate-900 text-right">
                    {formatRupiah(item.hargaModal)}
                  </td>

                  <td className="px-4 py-3 text-sm font-bold text-slate-700 text-right">
                    {item.hargaJual > 0 ? formatRupiah(item.hargaJual) : "-"}
                  </td>

                  <td className="px-4 py-3 text-sm font-bold text-slate-700">
                    {item.stokTersedia}
                  </td>

                  <td className="px-4 py-3 text-xs text-slate-500">
                    {item.effectiveFrom || "awal"} - {item.effectiveTo || "aktif"}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-black border ${
                        item.hppMappingStatus === "Valid"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {item.hppMappingStatus === "Valid" ? (
                        <CheckCircle2 size={12} />
                      ) : (
                        <AlertTriangle size={12} />
                      )}
                      {item.hppMappingStatus}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                        <Package size={26} />
                      </div>
                      <p className="text-sm font-black text-slate-500">Belum ada data master HPP.</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Upload file Excel yang memiliki kolom SKU PRODUK, Nama Produk, dan Harga Modal.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}