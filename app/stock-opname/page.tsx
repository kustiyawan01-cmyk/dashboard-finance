"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  Archive,
  Boxes,
  CheckCircle2,
  Download,
  Edit,
  FileSpreadsheet,
  MapPin,
  Package,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Upload,
  Warehouse,
  X
} from "lucide-react";

type StockRow = {
  id?: number | string;
  sku: string;
  nama_barang: string;
  kategori: string;
  satuan: string;
  lokasi: string;
  stok_sistem: number;
  stok_fisik: number;
  harga_modal: number;
  catatan: string;
  tanggal_opname: string;
  created_at?: string;
  updated_at?: string;
};

type FormDataState = {
  sku: string;
  nama_barang: string;
  kategori: string;
  satuan: string;
  lokasi: string;
  stok_sistem: string;
  stok_fisik: string;
  harga_modal: string;
  catatan: string;
  tanggal_opname: string;
};

const todayIso = () => new Date().toISOString().split("T")[0];

const defaultFormData: FormDataState = {
  sku: "",
  nama_barang: "",
  kategori: "",
  satuan: "pcs",
  lokasi: "Gudang Utama",
  stok_sistem: "0",
  stok_fisik: "0",
  harga_modal: "0",
  catatan: "",
  tanggal_opname: todayIso()
};

export default function StockOpnamePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<StockRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("Semua Status");
  const [selectedCategory, setSelectedCategory] = useState("Semua Kategori");
  const [selectedLocation, setSelectedLocation] = useState("Semua Lokasi");
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StockRow | null>(null);
  const [formData, setFormData] = useState<FormDataState>(defaultFormData);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const itemsPerPage = 12;

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    window.setTimeout(() => setNotification(null), 2800);
  };

  const formatRp = (angka: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(Number(angka) || 0);
  };

  const formatNumber = (angka: number) => {
    return new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: 2
    }).format(Number(angka) || 0);
  };

  const normalizeDate = (value: unknown) => {
    if (!value || value === "-") return todayIso();

    const text = String(value).trim().split(/[T ]/)[0];

    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(text)) {
      const [y, m, d] = text.split("-");
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(text)) {
      const [y, m, d] = text.split("/");
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(text)) {
      const [d, m, y] = text.split("/");
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    return todayIso();
  };

  const formatDate = (value: unknown) => {
    const normalized = normalizeDate(value);
    const [y, m, d] = normalized.split("-");
    return `${d}/${m}/${y}`;
  };

  const parseNumber = (value: unknown) => {
    if (value === undefined || value === null || value === "") return 0;
    if (typeof value === "number") return value;

    let text = String(value).trim().replace(/Rp/gi, "").replace(/\s/g, "");

    if (text.includes(",") && text.includes(".")) {
      if (text.indexOf(",") < text.indexOf(".")) text = text.replace(/,/g, "");
      else text = text.replace(/\./g, "").replace(/,/g, ".");
    } else if (text.includes(",")) {
      const parts = text.split(",");
      text = parts[parts.length - 1].length <= 2 ? text.replace(/,/g, ".") : text.replace(/,/g, "");
    } else if (text.includes(".")) {
      const parts = text.split(".");
      if (parts[parts.length - 1].length !== 2) text = text.replace(/\./g, "");
    }

    text = text.replace(/[^0-9.-]/g, "");
    const number = Number(text);

    return Number.isNaN(number) ? 0 : number;
  };

  const getSelisih = (item: StockRow) => {
    return Number(item.stok_fisik || 0) - Number(item.stok_sistem || 0);
  };

  const getNilaiSelisih = (item: StockRow) => {
    return getSelisih(item) * Number(item.harga_modal || 0);
  };

  const getStatus = (item: StockRow) => {
    const selisih = getSelisih(item);

    if (selisih === 0) return "Sesuai";
    if (selisih > 0) return "Lebih";
    return "Kurang";
  };

  const getStatusStyle = (status: string) => {
    if (status === "Sesuai") return "border-emerald-100 bg-emerald-50 text-emerald-700";
    if (status === "Lebih") return "border-blue-100 bg-blue-50 text-blue-700";
    return "border-red-100 bg-red-50 text-red-700";
  };

  const fetchStock = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/stock-opname");

      if (!res.ok) {
        showNotification("error", "Gagal mengambil data stock opname.");
        return;
      }

      const data = await res.json();
      const normalizedData: StockRow[] = Array.isArray(data)
        ? data.map((item: any) => ({
            ...item,
            sku: String(item.sku || "-"),
            nama_barang: String(item.nama_barang || "-"),
            kategori: String(item.kategori || "-"),
            satuan: String(item.satuan || "pcs"),
            lokasi: String(item.lokasi || "Gudang Utama"),
            stok_sistem: Number(item.stok_sistem || 0),
            stok_fisik: Number(item.stok_fisik || 0),
            harga_modal: Number(item.harga_modal || 0),
            catatan: String(item.catatan || "-"),
            tanggal_opname: normalizeDate(item.tanggal_opname)
          }))
        : [];

      setRows(normalizedData);
    } catch {
      showNotification("error", "Terjadi kesalahan saat mengambil data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((item) => {
      const search = searchTerm.toLowerCase();
      const status = getStatus(item);

      const matchSearch =
        String(item.sku || "").toLowerCase().includes(search) ||
        String(item.nama_barang || "").toLowerCase().includes(search) ||
        String(item.kategori || "").toLowerCase().includes(search) ||
        String(item.lokasi || "").toLowerCase().includes(search) ||
        String(item.catatan || "").toLowerCase().includes(search);

      const matchStatus = selectedStatus === "Semua Status" || status === selectedStatus;
      const matchCategory = selectedCategory === "Semua Kategori" || item.kategori === selectedCategory;
      const matchLocation = selectedLocation === "Semua Lokasi" || item.lokasi === selectedLocation;

      return matchSearch && matchStatus && matchCategory && matchLocation;
    });
  }, [rows, searchTerm, selectedStatus, selectedCategory, selectedLocation]);

  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
  const paginatedRows = filteredRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const categories = useMemo(() => ["Semua Kategori", ...Array.from(new Set(rows.map((item) => item.kategori).filter(Boolean)))], [rows]);
  const locations = useMemo(() => ["Semua Lokasi", ...Array.from(new Set(rows.map((item) => item.lokasi).filter(Boolean)))], [rows]);

  const summary = useMemo(() => {
    const totalItem = rows.length;
    const sesuai = rows.filter((item) => getStatus(item) === "Sesuai").length;
    const kurang = rows.filter((item) => getStatus(item) === "Kurang").length;
    const lebih = rows.filter((item) => getStatus(item) === "Lebih").length;
    const totalStokSistem = rows.reduce((sum, item) => sum + Number(item.stok_sistem || 0), 0);
    const totalStokFisik = rows.reduce((sum, item) => sum + Number(item.stok_fisik || 0), 0);
    const totalNilaiSelisih = rows.reduce((sum, item) => sum + getNilaiSelisih(item), 0);

    return {
      totalItem,
      sesuai,
      kurang,
      lebih,
      totalStokSistem,
      totalStokFisik,
      totalNilaiSelisih
    };
  }, [rows]);

  const warningRows = useMemo(() => {
    const warnings: Array<{ title: string; desc: string; tone: "red" | "amber" | "green" }> = [];

    if (summary.kurang > 0) {
      warnings.push({
        title: "Ada stok kurang",
        desc: `${summary.kurang} item stok fisiknya lebih kecil dari stok sistem.`,
        tone: "red"
      });
    }

    if (summary.lebih > 0) {
      warnings.push({
        title: "Ada stok lebih",
        desc: `${summary.lebih} item stok fisiknya lebih besar dari stok sistem.`,
        tone: "amber"
      });
    }

    if (Math.abs(summary.totalNilaiSelisih) > 0) {
      warnings.push({
        title: "Ada nilai selisih stok",
        desc: `Total nilai selisih saat ini ${formatRp(summary.totalNilaiSelisih)}.`,
        tone: summary.totalNilaiSelisih < 0 ? "red" : "amber"
      });
    }

    if (warnings.length === 0) {
      warnings.push({
        title: "Stok aman",
        desc: "Semua stok sistem dan fisik sudah sesuai.",
        tone: "green"
      });
    }

    return warnings;
  }, [summary]);

  const handleExport = () => {
    const wb = XLSX.utils.book_new();

    const wsData = XLSX.utils.json_to_sheet(filteredRows.map((item) => ({
      Tanggal: item.tanggal_opname,
      SKU: item.sku,
      "Nama Barang": item.nama_barang,
      Kategori: item.kategori,
      Satuan: item.satuan,
      Lokasi: item.lokasi,
      "Stok Sistem": item.stok_sistem,
      "Stok Fisik": item.stok_fisik,
      Selisih: getSelisih(item),
      "Harga Modal": item.harga_modal,
      "Nilai Selisih": getNilaiSelisih(item),
      Status: getStatus(item),
      Catatan: item.catatan
    })));

    const wsSummary = XLSX.utils.json_to_sheet([
      { Metrik: "Total Item", Nilai: summary.totalItem },
      { Metrik: "Stok Sesuai", Nilai: summary.sesuai },
      { Metrik: "Stok Kurang", Nilai: summary.kurang },
      { Metrik: "Stok Lebih", Nilai: summary.lebih },
      { Metrik: "Total Stok Sistem", Nilai: summary.totalStokSistem },
      { Metrik: "Total Stok Fisik", Nilai: summary.totalStokFisik },
      { Metrik: "Total Nilai Selisih", Nilai: summary.totalNilaiSelisih }
    ]);

    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan");
    XLSX.utils.book_append_sheet(wb, wsData, "Data Stock Opname");
    XLSX.writeFile(wb, "Stock_Opname_Gudang.xlsx");
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { cellDates: false, raw: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rowsJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: true });

      const normalizeHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
      const readValue = (row: Record<string, unknown>, keys: string[]) => {
        const entries = Object.entries(row);

        for (const key of keys) {
          const target = normalizeHeader(key);
          const found = entries.find(([actual]) => normalizeHeader(actual) === target);
          if (found) return found[1];
        }

        for (const key of keys) {
          const target = normalizeHeader(key);
          const found = entries.find(([actual]) => normalizeHeader(actual).includes(target));
          if (found) return found[1];
        }

        return "";
      };

      const payload = rowsJson
        .map((row) => {
          return {
            tanggal_opname: normalizeDate(readValue(row, ["tanggal", "tanggal opname", "date"])),
            sku: String(readValue(row, ["sku", "kode", "kode barang"]) || "-").trim(),
            nama_barang: String(readValue(row, ["nama barang", "produk", "nama produk", "item", "barang"]) || "-").trim(),
            kategori: String(readValue(row, ["kategori", "category"]) || "-").trim(),
            satuan: String(readValue(row, ["satuan", "unit"]) || "pcs").trim(),
            lokasi: String(readValue(row, ["lokasi", "gudang", "rak"]) || "Gudang Utama").trim(),
            stok_sistem: parseNumber(readValue(row, ["stok sistem", "stok aplikasi", "stock system", "stok"])),
            stok_fisik: parseNumber(readValue(row, ["stok fisik", "stock fisik", "qty fisik", "opname"])),
            harga_modal: parseNumber(readValue(row, ["harga modal", "hpp", "modal", "harga"])),
            catatan: String(readValue(row, ["catatan", "keterangan", "note"]) || "-").trim()
          };
        })
        .filter((item) => item.nama_barang !== "-" || item.sku !== "-");

      if (payload.length === 0) {
        showNotification("error", "File Excel tidak memiliki data stock opname yang valid.");
        return;
      }

      const res = await fetch("/api/stock-opname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        showNotification("error", "Gagal import Excel stock opname.");
        return;
      }

      showNotification("success", `${payload.length} data stock opname berhasil diimport.`);
      fetchStock();
    } catch {
      showNotification("error", "Terjadi kesalahan saat membaca file Excel.");
    } finally {
      if (event.target) event.target.value = "";
    }
  };

  const handleEditClick = (item: StockRow) => {
    setFormData({
      sku: item.sku,
      nama_barang: item.nama_barang,
      kategori: item.kategori,
      satuan: item.satuan,
      lokasi: item.lokasi,
      stok_sistem: String(item.stok_sistem || 0),
      stok_fisik: String(item.stok_fisik || 0),
      harga_modal: String(item.harga_modal || 0),
      catatan: item.catatan,
      tanggal_opname: normalizeDate(item.tanggal_opname)
    });
    setEditId(item.id || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setFormData(defaultFormData);
    setEditId(null);
    setIsModalOpen(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.nama_barang.trim()) {
      showNotification("error", "Nama barang wajib diisi.");
      return;
    }

    try {
      const payload = {
        id: editId,
        sku: formData.sku || "-",
        nama_barang: formData.nama_barang,
        kategori: formData.kategori || "-",
        satuan: formData.satuan || "pcs",
        lokasi: formData.lokasi || "Gudang Utama",
        stok_sistem: parseNumber(formData.stok_sistem),
        stok_fisik: parseNumber(formData.stok_fisik),
        harga_modal: parseNumber(formData.harga_modal),
        catatan: formData.catatan || "-",
        tanggal_opname: normalizeDate(formData.tanggal_opname)
      };

      const res = await fetch("/api/stock-opname", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editId ? payload : [payload])
      });

      if (!res.ok) {
        showNotification("error", editId ? "Gagal update data." : "Gagal simpan data.");
        return;
      }

      showNotification("success", editId ? "Data stock opname berhasil diupdate." : "Data stock opname berhasil disimpan.");
      closeModal();
      fetchStock();
    } catch {
      showNotification("error", "Terjadi kesalahan sistem.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;

    try {
      const res = await fetch("/api/stock-opname", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id })
      });

      if (!res.ok) {
        showNotification("error", "Gagal hapus data.");
        return;
      }

      showNotification("success", "Data stock opname berhasil dihapus.");
      setDeleteTarget(null);
      fetchStock();
    } catch {
      showNotification("error", "Terjadi kesalahan saat menghapus data.");
    }
  };

  if (loading && rows.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center p-10 text-[15px] font-medium text-slate-500">
        Mempersiapkan Data Stock Opname...
      </div>
    );
  }

  return (
    <main className="relative min-h-screen flex-1 bg-[#F8FAFC] px-6 py-5 font-sans text-slate-800">
      {notification && (
        <div className={`fixed right-6 top-6 z-[80] rounded-xl border px-4 py-3 text-sm font-bold shadow-lg ${notification.type === "success" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-red-100 bg-red-50 text-red-700"}`}>
          {notification.message}
        </div>
      )}

      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportExcel} />

      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Stock Opname Gudang</h1>
          <p className="mt-1 text-[15px] font-medium text-slate-500">Cek stok sistem, stok fisik, selisih barang, dan nilai koreksi gudang.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
            <Upload size={16} />
            Import Excel
          </button>

          <button onClick={handleExport} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
            <Download size={16} />
            Export
          </button>

          <button onClick={fetchStock} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
            <RefreshCcw size={16} />
            Refresh
          </button>

          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-[14px] font-bold text-white shadow-sm shadow-emerald-200 transition-colors hover:bg-emerald-700">
            <Plus size={18} />
            Tambah Stok
          </button>
        </div>
      </div>

      <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <SummaryCard title="Total Item" value={summary.totalItem.toLocaleString("id-ID")} icon={<Boxes />} color="blue" />
        <SummaryCard title="Stok Sesuai" value={summary.sesuai.toLocaleString("id-ID")} icon={<CheckCircle2 />} color="emerald" />
        <SummaryCard title="Stok Kurang" value={summary.kurang.toLocaleString("id-ID")} icon={<AlertTriangle />} color="red" />
        <SummaryCard title="Stok Lebih" value={summary.lebih.toLocaleString("id-ID")} icon={<Archive />} color="amber" />
        <SummaryCard title="Stok Sistem" value={formatNumber(summary.totalStokSistem)} icon={<Package />} color="slate" />
        <SummaryCard title="Stok Fisik" value={formatNumber(summary.totalStokFisik)} icon={<Warehouse />} color="purple" />
        <SummaryCard title="Nilai Selisih" value={formatRp(summary.totalNilaiSelisih)} icon={<FileSpreadsheet />} color={summary.totalNilaiSelisih < 0 ? "red" : "emerald"} />
      </section>

      <section className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-[14px] font-bold text-slate-900">Kontrol Opname</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <FilterBox title="Item Sesuai" value={summary.sesuai} tone="emerald" />
            <FilterBox title="Perlu Cek Kurang" value={summary.kurang} tone="red" />
            <FilterBox title="Perlu Cek Lebih" value={summary.lebih} tone="amber" />
            <FilterBox title="Data Terfilter" value={filteredRows.length} tone="slate" />
          </div>
        </div>

        <WarningPanel warnings={warningRows} />
      </section>

      <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-5">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="relative w-full max-w-sm">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari SKU, barang, kategori, lokasi..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-[13px] text-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <select value={selectedStatus} onChange={(event) => { setSelectedStatus(event.target.value); setCurrentPage(1); }} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2.5 pr-8 text-[13px] font-medium text-slate-600 focus:outline-none">
              <option>Semua Status</option>
              <option>Sesuai</option>
              <option>Kurang</option>
              <option>Lebih</option>
            </select>

            <select value={selectedCategory} onChange={(event) => { setSelectedCategory(event.target.value); setCurrentPage(1); }} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2.5 pr-8 text-[13px] font-medium text-slate-600 focus:outline-none">
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>

            <select value={selectedLocation} onChange={(event) => { setSelectedLocation(event.target.value); setCurrentPage(1); }} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2.5 pr-8 text-[13px] font-medium text-slate-600 focus:outline-none">
              {locations.map((location) => <option key={location} value={location}>{location}</option>)}
            </select>
          </div>
        </div>

        <div className="min-h-[500px] overflow-x-auto">
          <table className="w-full min-w-[1200px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-4 text-[12px] font-black uppercase tracking-wider text-slate-500">Tanggal</th>
                <th className="px-5 py-4 text-[12px] font-black uppercase tracking-wider text-slate-500">SKU</th>
                <th className="px-5 py-4 text-[12px] font-black uppercase tracking-wider text-slate-500">Nama Barang</th>
                <th className="px-5 py-4 text-[12px] font-black uppercase tracking-wider text-slate-500">Kategori</th>
                <th className="px-5 py-4 text-[12px] font-black uppercase tracking-wider text-slate-500">Lokasi</th>
                <th className="px-5 py-4 text-right text-[12px] font-black uppercase tracking-wider text-slate-500">Sistem</th>
                <th className="px-5 py-4 text-right text-[12px] font-black uppercase tracking-wider text-slate-500">Fisik</th>
                <th className="px-5 py-4 text-right text-[12px] font-black uppercase tracking-wider text-slate-500">Selisih</th>
                <th className="px-5 py-4 text-right text-[12px] font-black uppercase tracking-wider text-slate-500">Nilai</th>
                <th className="px-5 py-4 text-center text-[12px] font-black uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-5 py-4 text-center text-[12px] font-black uppercase tracking-wider text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRows.map((item) => {
                const selisih = getSelisih(item);
                const nilai = getNilaiSelisih(item);
                const status = getStatus(item);

                return (
                  <tr key={String(item.id || `${item.sku}-${item.nama_barang}`)} className="bg-white transition-colors hover:bg-slate-50">
                    <td className="px-5 py-4 text-[13px] font-medium text-slate-600">{formatDate(item.tanggal_opname)}</td>
                    <td className="px-5 py-4 text-[13px] font-bold text-slate-700">{item.sku}</td>
                    <td className="px-5 py-4">
                      <p className="max-w-[320px] truncate text-[14px] font-black text-slate-900" title={item.nama_barang}>{item.nama_barang}</p>
                      <p className="mt-1 text-[11px] font-medium text-slate-400">{item.satuan} • {item.catatan}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-black text-blue-700">{item.kategori}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600">
                        <MapPin size={12} />
                        {item.lokasi}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-[14px] font-black text-slate-700">{formatNumber(item.stok_sistem)}</td>
                    <td className="px-5 py-4 text-right text-[14px] font-black text-slate-900">{formatNumber(item.stok_fisik)}</td>
                    <td className={`px-5 py-4 text-right text-[14px] font-black ${selisih < 0 ? "text-red-600" : selisih > 0 ? "text-blue-600" : "text-emerald-600"}`}>
                      {selisih > 0 ? "+" : ""}{formatNumber(selisih)}
                    </td>
                    <td className={`px-5 py-4 text-right text-[14px] font-black ${nilai < 0 ? "text-red-600" : nilai > 0 ? "text-blue-600" : "text-slate-500"}`}>
                      {formatRp(nilai)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-black ${getStatusStyle(status)}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleEditClick(item)} className="rounded-md p-1.5 text-blue-500 transition-colors hover:bg-blue-50 hover:text-blue-700">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => setDeleteTarget(item)} className="rounded-md p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedRows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-6 py-24 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
                      <Warehouse size={32} className="text-slate-300" />
                    </div>
                    <p className="text-[15px] font-bold text-slate-500">Belum ada data stock opname.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-white p-5">
            <span className="text-[13px] font-medium text-slate-500">
              Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredRows.length)} dari {filteredRows.length} data
            </span>

            <div className="flex items-center gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                Prev
              </button>
              <span className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white">{currentPage}</span>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 px-6 py-4">
              <h3 className="text-[18px] font-black text-slate-900">{editId ? "Edit Data Stock Opname" : "Tambah Data Stock Opname"}</h3>
              <button onClick={closeModal} className="text-slate-400 transition-colors hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <Field label="Tanggal Opname">
                  <input type="date" value={formData.tanggal_opname} onChange={(event) => setFormData({ ...formData, tanggal_opname: event.target.value })} className="input-stock" />
                </Field>

                <Field label="SKU / Kode">
                  <input type="text" value={formData.sku} onChange={(event) => setFormData({ ...formData, sku: event.target.value })} placeholder="SKU barang" className="input-stock" />
                </Field>

                <Field label="Kategori">
                  <input type="text" value={formData.kategori} onChange={(event) => setFormData({ ...formData, kategori: event.target.value })} placeholder="Kategori" className="input-stock" />
                </Field>
              </div>

              <Field label="Nama Barang">
                <input type="text" required value={formData.nama_barang} onChange={(event) => setFormData({ ...formData, nama_barang: event.target.value })} placeholder="Nama barang di gudang" className="input-stock" />
              </Field>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
                <Field label="Satuan">
                  <input type="text" value={formData.satuan} onChange={(event) => setFormData({ ...formData, satuan: event.target.value })} placeholder="pcs/meter/roll" className="input-stock" />
                </Field>

                <Field label="Lokasi">
                  <input type="text" value={formData.lokasi} onChange={(event) => setFormData({ ...formData, lokasi: event.target.value })} placeholder="Gudang/Rak" className="input-stock" />
                </Field>

                <Field label="Stok Sistem">
                  <input type="text" value={formData.stok_sistem} onChange={(event) => setFormData({ ...formData, stok_sistem: event.target.value })} className="input-stock" />
                </Field>

                <Field label="Stok Fisik">
                  <input type="text" value={formData.stok_fisik} onChange={(event) => setFormData({ ...formData, stok_fisik: event.target.value })} className="input-stock" />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Harga Modal / HPP">
                  <input type="text" value={formData.harga_modal} onChange={(event) => setFormData({ ...formData, harga_modal: event.target.value })} placeholder="Harga modal per satuan" className="input-stock" />
                </Field>

                <Field label="Catatan">
                  <input type="text" value={formData.catatan} onChange={(event) => setFormData({ ...formData, catatan: event.target.value })} placeholder="Catatan opname" className="input-stock" />
                </Field>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Preview Selisih</p>
                <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <PreviewBox title="Selisih Stok" value={formatNumber(parseNumber(formData.stok_fisik) - parseNumber(formData.stok_sistem))} />
                  <PreviewBox title="Nilai Selisih" value={formatRp((parseNumber(formData.stok_fisik) - parseNumber(formData.stok_sistem)) * parseNumber(formData.harga_modal))} />
                  <PreviewBox title="Status" value={parseNumber(formData.stok_fisik) - parseNumber(formData.stok_sistem) === 0 ? "Sesuai" : parseNumber(formData.stok_fisik) - parseNumber(formData.stok_sistem) > 0 ? "Lebih" : "Kurang"} />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3 font-bold text-slate-600 transition-colors hover:bg-slate-50">
                  Batal
                </button>
                <button type="submit" className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 font-bold text-white transition-colors hover:bg-emerald-700">
                  {editId ? "Update Data" : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <Trash2 size={22} />
            </div>
            <h3 className="text-xl font-black text-slate-900">Hapus data stock?</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">Data “{deleteTarget.nama_barang}” akan dihapus permanen dari stock opname.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3 font-bold text-slate-600 hover:bg-slate-50">
                Batal
              </button>
              <button onClick={handleDelete} className="flex-1 rounded-lg bg-red-600 px-4 py-3 font-bold text-white hover:bg-red-700">
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .input-stock {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 0.7rem 0.9rem;
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
          outline: none;
        }

        .input-stock:focus {
          border-color: #10b981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
        }
      `}</style>
    </main>
  );
}

function SummaryCard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactElement<{ size?: number }>; color: string }) {
  const theme: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-600",
    slate: "bg-slate-100 text-slate-600",
    purple: "bg-purple-50 text-purple-600"
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${theme[color] || theme.slate}`}>
          {React.cloneElement(icon, { size: 17 })}
        </div>
        <p className="truncate text-[11px] font-black text-slate-500">{title}</p>
      </div>
      <p className="truncate text-[20px] font-black text-slate-950" title={value}>{value}</p>
    </div>
  );
}

function FilterBox({ title, value, tone }: { title: string; value: number; tone: "emerald" | "red" | "amber" | "slate" }) {
  const theme = {
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    red: "border-red-100 bg-red-50 text-red-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    slate: "border-slate-100 bg-slate-50 text-slate-700"
  };

  return (
    <div className={`rounded-lg border p-3 ${theme[tone]}`}>
      <p className="text-[11px] font-black uppercase tracking-wider opacity-70">{title}</p>
      <p className="mt-1 text-xl font-black">{value.toLocaleString("id-ID")}</p>
    </div>
  );
}

function WarningPanel({ warnings }: { warnings: Array<{ title: string; desc: string; tone: "red" | "amber" | "green" }> }) {
  const styles = {
    red: "border-red-100 bg-red-50 text-red-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700"
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-[14px] font-bold text-slate-900">
        <AlertTriangle size={16} className="text-amber-500" />
        Warning Opname
      </h3>

      <div className="space-y-2.5">
        {warnings.map((warning, index) => (
          <div key={`${warning.title}-${index}`} className={`rounded-lg border p-2.5 ${styles[warning.tone]}`}>
            <p className="text-[13px] font-black">{warning.title}</p>
            <p className="mt-1 text-[11px] font-medium opacity-80">{warning.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function PreviewBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{title}</p>
      <p className="mt-1 text-[15px] font-black text-slate-900">{value}</p>
    </div>
  );
}