"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Package,
  Layers,
  ClipboardList,
  Plus,
  RefreshCw,
  AlertTriangle,
  ArrowDownLeft,
  Sliders,
  Search,
  X,
  CheckCircle2,
  Clock,
  Boxes,
  Warehouse,
  Factory,
  ShieldCheck,
  TrendingDown,
  Loader2,
  CircleAlert,
  Save,
  RotateCcw,
  Wrench,
  ArrowRight,
  ClipboardCheck,
  PackageCheck,
  Settings2
} from "lucide-react";

interface BahanBaku {
  id: number;
  nama_bahan: string;
  stok_meter: number;
  kategori: string;
  updatedAt: string;
}

interface BarangJadi {
  id: number;
  nama_produk: string;
  stok_pcs: number;
  kode_sku: string;
  updatedAt: string;
}

interface WorkOrder {
  id: number;
  nomor_wo: string;
  barang_jadi_id: number;
  nama_produk: string;
  kode_sku: string;
  jumlah_produksi: number;
  status: "PROSES" | "SELESAI";
  createdAt: string;
}

type ActiveTab = "ringkasan" | "bahan" | "produk" | "produksi";
type ModalType = "add_bahan" | "add_produk" | "inbound" | "opname" | "create_wo" | null;
type MessageType = { type: "success" | "error"; text: string } | null;
type StockStatus = "safe" | "low" | "empty";

export default function InventoryManagementPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("ringkasan");
  const [loading, setLoading] = useState(true);

  const [bahanList, setBahanList] = useState<BahanBaku[]>([]);
  const [produkList, setProdukList] = useState<BarangJadi[]>([]);
  const [woList, setWorkOrders] = useState<WorkOrder[]>([]);

  const [modalType, setModalType] = useState<ModalType>(null);
  const [confirmWO, setConfirmWO] = useState<WorkOrder | null>(null);

  const [selectedBahanId, setSelectedBahanId] = useState<string>("");
  const [selectedProdukId, setSelectedProdukId] = useState<string>("");
  const [inputJumlah, setInputJumlah] = useState<string>("");
  const [inputNomorWO, setInputNomorWO] = useState<string>("");

  const [newBahanName, setNewBahanName] = useState("");
  const [newBahanCategory, setNewBahanCategory] = useState("Kulit Sintetis");
  const [newBahanStokAwal, setNewBahanStokAwal] = useState("0");

  const [newProdukName, setNewProdukName] = useState("");
  const [newProdukSKU, setNewProdukSKU] = useState("");
  const [bomBahanId, setBomBahanId] = useState("");
  const [bomMeter, setBomMeter] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<"all" | StockStatus>("all");
  const [woStatusFilter, setWoStatusFilter] = useState<"all" | "PROSES" | "SELESAI">("all");
  const [sortMode, setSortMode] = useState<"latest" | "stok_asc" | "stok_desc" | "name_asc">("latest");

  const [message, setMessage] = useState<MessageType>(null);
  const [toast, setToast] = useState<MessageType>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completingWO, setCompletingWO] = useState(false);

  const fetchAllInventoryData = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/inventory");

      if (res.ok) {
        const data = await res.json();
        setBahanList(data.bahan || []);
        setProdukList(data.produk || []);
        setWorkOrders(data.wo || []);
      } else {
        setToast({ type: "error", text: "Gagal mengambil data inventory." });
      }
    } catch (e) {
      console.error(e);
      setToast({ type: "error", text: "Terjadi kesalahan saat mengambil data." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllInventoryData();
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
    }, 3500);

    return () => clearTimeout(timer);
  }, [toast]);

  const totalBahanMeter = useMemo(() => {
    return bahanList.reduce((acc, curr) => acc + Number(curr.stok_meter || 0), 0);
  }, [bahanList]);

  const totalProdukPcs = useMemo(() => {
    return produkList.reduce((acc, curr) => acc + Number(curr.stok_pcs || 0), 0);
  }, [produkList]);

  const woProses = useMemo(() => {
    return woList.filter((w) => w.status === "PROSES").length;
  }, [woList]);

  const woSelesai = useMemo(() => {
    return woList.filter((w) => w.status === "SELESAI").length;
  }, [woList]);

  const stokMenipis = useMemo(() => {
    return bahanList.filter((item) => {
      const stok = Number(item.stok_meter || 0);
      return stok > 0 && stok <= 5;
    }).length;
  }, [bahanList]);

  const kategoriOptions = useMemo(() => {
    return Array.from(new Set(bahanList.map((item) => item.kategori).filter(Boolean)));
  }, [bahanList]);

  const getStockStatus = (stok: number): StockStatus => {
    if (stok <= 0) return "empty";
    if (stok <= 5) return "low";
    return "safe";
  };

  const getStockBadge = (stok: number) => {
    const status = getStockStatus(stok);

    if (status === "empty") {
      return {
        label: "Habis",
        className: "bg-red-50 text-red-700 border-red-200",
        icon: <CircleAlert size={13} />
      };
    }

    if (status === "low") {
      return {
        label: "Menipis",
        className: "bg-amber-50 text-amber-700 border-amber-200",
        icon: <TrendingDown size={13} />
      };
    }

    return {
      label: "Aman",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <ShieldCheck size={13} />
    };
  };

  const filteredBahanList = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    const result = bahanList.filter((item) => {
      const matchSearch =
        item.nama_bahan.toLowerCase().includes(term) ||
        item.kategori.toLowerCase().includes(term) ||
        String(item.id).includes(term);

      const matchCategory = categoryFilter === "all" || item.kategori === categoryFilter;
      const matchStock = stockFilter === "all" || getStockStatus(Number(item.stok_meter || 0)) === stockFilter;

      return matchSearch && matchCategory && matchStock;
    });

    return [...result].sort((a, b) => {
      if (sortMode === "stok_asc") return Number(a.stok_meter || 0) - Number(b.stok_meter || 0);
      if (sortMode === "stok_desc") return Number(b.stok_meter || 0) - Number(a.stok_meter || 0);
      if (sortMode === "name_asc") return a.nama_bahan.localeCompare(b.nama_bahan);
      return Number(b.id) - Number(a.id);
    });
  }, [bahanList, searchTerm, categoryFilter, stockFilter, sortMode]);

  const filteredProdukList = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return produkList.filter((item) => {
      return (
        item.nama_produk.toLowerCase().includes(term) ||
        item.kode_sku.toLowerCase().includes(term) ||
        String(item.id).includes(term)
      );
    });
  }, [produkList, searchTerm]);

  const filteredWOList = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return woList.filter((item) => {
      const matchSearch =
        item.nomor_wo.toLowerCase().includes(term) ||
        item.nama_produk.toLowerCase().includes(term) ||
        item.kode_sku.toLowerCase().includes(term) ||
        item.status.toLowerCase().includes(term);

      const matchStatus = woStatusFilter === "all" || item.status === woStatusFilter;

      return matchSearch && matchStatus;
    });
  }, [woList, searchTerm, woStatusFilter]);

  const formatDate = (dateValue?: string) => {
    if (!dateValue) return "-";

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  };

  const clearForm = () => {
    setSelectedBahanId("");
    setSelectedProdukId("");
    setInputJumlah("");
    setInputNomorWO("");
    setNewBahanName("");
    setNewBahanCategory("Kulit Sintetis");
    setNewBahanStokAwal("0");
    setNewProdukName("");
    setNewProdukSKU("");
    setBomBahanId("");
    setBomMeter("");
  };

  const closeModal = () => {
    setModalType(null);
    setMessage(null);
    setSubmitting(false);
    clearForm();
  };

  const resetFilter = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setStockFilter("all");
    setWoStatusFilter("all");
    setSortMode("latest");
  };

  const changeTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    resetFilter();
  };

  const openModal = (type: ModalType) => {
    clearForm();
    setMessage(null);
    setModalType(type);
  };

  const validateForm = () => {
    const jumlah = Number(inputJumlah);
    const stokAwal = Number(newBahanStokAwal);
    const kebutuhanBom = Number(bomMeter);

    if (modalType === "add_bahan") {
      if (!newBahanName.trim()) return "Nama bahan baku wajib diisi.";
      if (Number.isNaN(stokAwal) || stokAwal < 0) return "Stok awal tidak boleh minus.";
    }

    if (modalType === "add_produk") {
      if (!newProdukName.trim()) return "Nama produk wajib diisi.";
      if (!newProdukSKU.trim()) return "Kode SKU wajib diisi.";
      if (bomBahanId && (Number.isNaN(kebutuhanBom) || kebutuhanBom <= 0)) {
        return "Kebutuhan bahan per produk harus lebih dari 0.";
      }
    }

    if (modalType === "inbound") {
      if (!selectedBahanId) return "Pilih bahan baku terlebih dahulu.";
      if (Number.isNaN(jumlah) || jumlah <= 0) return "Jumlah stok masuk harus lebih dari 0.";
    }

    if (modalType === "opname") {
      if (!selectedBahanId) return "Pilih bahan baku terlebih dahulu.";
      if (Number.isNaN(jumlah) || jumlah < 0) return "Stok fisik tidak boleh minus.";
    }

    if (modalType === "create_wo") {
      if (!inputNomorWO.trim()) return "Nomor perintah produksi wajib diisi.";
      if (!selectedProdukId) return "Pilih produk yang akan diproduksi.";
      if (Number.isNaN(jumlah) || jumlah <= 0) return "Jumlah produksi harus lebih dari 0.";
    }

    return "";
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const validationError = validateForm();

    if (validationError) {
      setMessage({ type: "error", text: validationError });
      return;
    }

    let payload: any = {};

    if (modalType === "add_bahan") {
      payload = {
        action: "ADD_BAHAN",
        nama_bahan: newBahanName.trim(),
        kategori: newBahanCategory,
        stok_awal: Number(newBahanStokAwal)
      };
    } else if (modalType === "add_produk") {
      payload = {
        action: "ADD_PRODUK",
        nama_produk: newProdukName.trim(),
        kode_sku: newProdukSKU.trim().toUpperCase(),
        resep: bomBahanId
          ? [
              {
                bahan_baku_id: Number(bomBahanId),
                jumlah_butuh_meter: Number(bomMeter || 0)
              }
            ]
          : []
      };
    } else if (modalType === "inbound") {
      payload = {
        action: "INBOUND",
        bahan_baku_id: Number(selectedBahanId),
        jumlah_meter: Number(inputJumlah)
      };
    } else if (modalType === "opname") {
      payload = {
        action: "OPNAME",
        bahan_baku_id: Number(selectedBahanId),
        stok_fisik_meter: Number(inputJumlah)
      };
    } else if (modalType === "create_wo") {
      payload = {
        action: "CREATE_WO",
        nomor_wo: inputNomorWO.trim().toUpperCase(),
        barang_jadi_id: Number(selectedProdukId),
        jumlah_produksi: Number(inputJumlah)
      };
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (res.ok) {
        const successText = result.message || "Data berhasil disimpan.";
        setMessage({ type: "success", text: successText });
        setToast({ type: "success", text: successText });

        setTimeout(() => {
          closeModal();
          fetchAllInventoryData();
        }, 900);
      } else {
        setMessage({ type: "error", text: result.error || "Gagal memproses data." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Terjadi kesalahan server." });
    } finally {
      setSubmitting(false);
    }
  };

  const executeCompleteWO = async () => {
    if (!confirmWO) return;

    setCompletingWO(true);

    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "COMPLETE_WO", id: confirmWO.id })
      });

      if (res.ok) {
        setToast({ type: "success", text: "Produksi selesai. Stok produk jadi berhasil ditambahkan." });
        setConfirmWO(null);
        fetchAllInventoryData();
      } else {
        const err = await res.json();
        setToast({ type: "error", text: err.error || "Gagal menyelesaikan produksi." });
      }
    } catch (e) {
      setToast({ type: "error", text: "Terjadi kesalahan saat menyelesaikan produksi." });
    } finally {
      setCompletingWO(false);
    }
  };

  const SummaryCard = ({
    title,
    value,
    suffix,
    icon,
    color
  }: {
    title: string;
    value: string | number;
    suffix: string;
    icon: React.ReactNode;
    color: "indigo" | "blue" | "amber" | "orange" | "emerald";
  }) => {
    const colorMap = {
      indigo: "bg-indigo-50 text-indigo-600",
      blue: "bg-blue-50 text-blue-600",
      amber: "bg-amber-50 text-amber-600",
      orange: "bg-orange-50 text-orange-600",
      emerald: "bg-emerald-50 text-emerald-600"
    };

    return (
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className={`absolute -right-5 -top-5 w-20 h-20 rounded-full ${colorMap[color].split(" ")[0]}`} />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">{title}</p>
            <h3 className="text-3xl font-black text-slate-900">
              {value}
              <span className="text-xs font-semibold text-slate-400 ml-1">{suffix}</span>
            </h3>
          </div>
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${colorMap[color]}`}>{icon}</div>
        </div>
      </div>
    );
  };

  const TabButton = ({
    tab,
    label,
    icon
  }: {
    tab: ActiveTab;
    label: string;
    icon: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={() => changeTab(tab)}
      className={`text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-2 whitespace-nowrap ${
        activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const ActionButton = ({
    label,
    icon,
    onClick,
    primary = false
  }: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    primary?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs font-black flex items-center gap-2 px-3.5 py-2.5 rounded-xl ${
        primary
          ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200"
          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const EmptyState = ({
    title,
    description,
    buttonLabel,
    onClick
  }: {
    title: string;
    description: string;
    buttonLabel?: string;
    onClick?: () => void;
  }) => (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
        <Boxes size={30} />
      </div>
      <h3 className="text-sm font-black text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed">{description}</p>
      {buttonLabel && onClick && (
        <button
          type="button"
          onClick={onClick}
          className="mt-5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2"
        >
          <Plus size={14} />
          {buttonLabel}
        </button>
      )}
    </div>
  );

  const TableSkeleton = () => (
    <div className="p-5 space-y-3">
      {[1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="grid grid-cols-4 gap-4">
          <div className="h-9 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-9 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-9 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-9 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      ))}
    </div>
  );

  const ContextActions = () => {
    if (activeTab === "ringkasan") {
      return (
        <>
          <ActionButton label="Tambah Bahan" icon={<Plus size={14} />} onClick={() => openModal("add_bahan")} />
          <ActionButton label="Tambah Produk" icon={<Plus size={14} />} onClick={() => openModal("add_produk")} />
          <ActionButton label="Stok Masuk" icon={<ArrowDownLeft size={14} />} onClick={() => openModal("inbound")} />
          <ActionButton label="Buat Produksi" icon={<Factory size={14} />} onClick={() => openModal("create_wo")} primary />
        </>
      );
    }

    if (activeTab === "bahan") {
      return (
        <>
          <ActionButton label="Tambah Bahan" icon={<Plus size={14} />} onClick={() => openModal("add_bahan")} primary />
          <ActionButton label="Stok Masuk" icon={<ArrowDownLeft size={14} />} onClick={() => openModal("inbound")} />
          <ActionButton label="Cek Stok Fisik" icon={<AlertTriangle size={14} />} onClick={() => openModal("opname")} />
        </>
      );
    }

    if (activeTab === "produk") {
      return (
        <>
          <ActionButton label="Tambah Produk" icon={<Plus size={14} />} onClick={() => openModal("add_produk")} primary />
        </>
      );
    }

    return (
      <>
        <ActionButton label="Buat Perintah Produksi" icon={<Plus size={14} />} onClick={() => openModal("create_wo")} primary />
      </>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col w-full">
      {toast && (
        <div className="fixed top-5 right-5 z-[70] w-[calc(100%-2rem)] max-w-sm">
          <div
            className={`rounded-2xl border px-4 py-3 shadow-xl backdrop-blur bg-white flex items-start gap-3 ${
              toast.type === "success" ? "border-emerald-200" : "border-red-200"
            }`}
          >
            <div
              className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center ${
                toast.type === "success" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
              }`}
            >
              {toast.type === "success" ? <CheckCircle2 size={18} /> : <CircleAlert size={18} />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-slate-800">{toast.type === "success" ? "Berhasil" : "Gagal"}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{toast.text}</p>
            </div>
            <button type="button" onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <header className="bg-white/90 backdrop-blur border-b border-slate-200 px-5 md:px-8 py-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2.5 rounded-2xl shadow-sm shadow-indigo-200">
            <Sliders size={21} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-indigo-600 font-black mb-0.5">
              Inventory Produksi
            </p>
            <h1 className="text-lg md:text-xl font-black text-slate-900 leading-tight">
              Sistem ERP Konveksi Alas Jok
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Alur sederhana: bahan baku, produk jadi, lalu produksi
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchAllInventoryData}
          disabled={loading}
          className="p-2.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      <main className="p-4 md:p-8 max-w-[1440px] mx-auto w-full flex-1 space-y-6">
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <SummaryCard title="Jenis Bahan" value={bahanList.length} suffix="Varian" color="indigo" icon={<Package size={22} />} />
          <SummaryCard title="Stok Bahan" value={totalBahanMeter.toFixed(1)} suffix="Meter" color="blue" icon={<Warehouse size={22} />} />
          <SummaryCard title="Stok Menipis" value={stokMenipis} suffix="Item" color="amber" icon={<TrendingDown size={22} />} />
          <SummaryCard title="Produksi Jalan" value={woProses} suffix="WO" color="orange" icon={<Factory size={22} />} />
          <SummaryCard title="Produk Jadi" value={totalProdukPcs} suffix="Pcs" color="emerald" icon={<Layers size={22} />} />
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 md:p-5 border-b border-slate-200 bg-white space-y-5">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm md:text-base font-black text-slate-900">Alur Kerja Inventory</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mulai dari data bahan, data produk, stok masuk, lalu proses produksi.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <ContextActions />
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
              <div className="flex bg-slate-100 p-1 rounded-2xl w-full lg:w-max overflow-x-auto">
                <TabButton tab="ringkasan" label="Ringkasan" icon={<ClipboardCheck size={15} />} />
                <TabButton tab="bahan" label={`Bahan Baku (${bahanList.length})`} icon={<Package size={15} />} />
                <TabButton tab="produk" label={`Produk Jadi (${produkList.length})`} icon={<Layers size={15} />} />
                <TabButton tab="produksi" label={`Produksi (${woList.length})`} icon={<Factory size={15} />} />
              </div>

              {activeTab !== "ringkasan" && (
                <div className="flex flex-col md:flex-row gap-2 w-full lg:w-auto">
                  <div className="relative w-full md:w-72">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Cari data..."
                      className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                    />
                  </div>

                  {activeTab === "bahan" && (
                    <>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3 py-2.5 text-xs font-bold border border-slate-200 rounded-xl outline-none bg-white text-slate-600"
                      >
                        <option value="all">Semua Kategori</option>
                        {kategoriOptions.map((kategori) => (
                          <option key={kategori} value={kategori}>
                            {kategori}
                          </option>
                        ))}
                      </select>

                      <select
                        value={stockFilter}
                        onChange={(e) => setStockFilter(e.target.value as "all" | StockStatus)}
                        className="px-3 py-2.5 text-xs font-bold border border-slate-200 rounded-xl outline-none bg-white text-slate-600"
                      >
                        <option value="all">Semua Stok</option>
                        <option value="safe">Stok Aman</option>
                        <option value="low">Stok Menipis</option>
                        <option value="empty">Stok Habis</option>
                      </select>

                      <select
                        value={sortMode}
                        onChange={(e) => setSortMode(e.target.value as "latest" | "stok_asc" | "stok_desc" | "name_asc")}
                        className="px-3 py-2.5 text-xs font-bold border border-slate-200 rounded-xl outline-none bg-white text-slate-600"
                      >
                        <option value="latest">Terbaru</option>
                        <option value="stok_asc">Stok Terkecil</option>
                        <option value="stok_desc">Stok Terbesar</option>
                        <option value="name_asc">Nama A-Z</option>
                      </select>
                    </>
                  )}

                  {activeTab === "produksi" && (
                    <select
                      value={woStatusFilter}
                      onChange={(e) => setWoStatusFilter(e.target.value as "all" | "PROSES" | "SELESAI")}
                      className="px-3 py-2.5 text-xs font-bold border border-slate-200 rounded-xl outline-none bg-white text-slate-600"
                    >
                      <option value="all">Semua Status</option>
                      <option value="PROSES">Sedang Diproduksi</option>
                      <option value="SELESAI">Selesai</option>
                    </select>
                  )}

                  <button
                    type="button"
                    onClick={resetFilter}
                    className="text-xs font-black flex items-center justify-center gap-2 px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
                  >
                    <RotateCcw size={14} />
                    Reset
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto w-full min-h-[420px]">
            {loading ? (
              <TableSkeleton />
            ) : (
              <>
                {activeTab === "ringkasan" && (
                  <div className="p-5 md:p-6 space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-4">
                          <Settings2 size={22} />
                        </div>
                        <h3 className="text-sm font-black text-slate-900">1. Setup Awal</h3>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          Tambahkan bahan baku dan produk jadi terlebih dahulu.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openModal("add_bahan")}
                            className="text-xs font-black bg-white border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-100"
                          >
                            Tambah Bahan
                          </button>
                          <button
                            type="button"
                            onClick={() => openModal("add_produk")}
                            className="text-xs font-black bg-white border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-100"
                          >
                            Tambah Produk
                          </button>
                        </div>
                      </div>

                      <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50">
                        <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-4">
                          <Warehouse size={22} />
                        </div>
                        <h3 className="text-sm font-black text-slate-900">2. Gudang Bahan</h3>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          Masukkan stok bahan saat pembelian, lalu cek stok fisik jika diperlukan.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openModal("inbound")}
                            className="text-xs font-black bg-white border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-100"
                          >
                            Stok Masuk
                          </button>
                          <button
                            type="button"
                            onClick={() => openModal("opname")}
                            className="text-xs font-black bg-white border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-100"
                          >
                            Cek Stok Fisik
                          </button>
                        </div>
                      </div>

                      <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mb-4">
                          <Factory size={22} />
                        </div>
                        <h3 className="text-sm font-black text-slate-900">3. Produksi</h3>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          Buat perintah produksi, lalu selesaikan setelah proses jahit selesai.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openModal("create_wo")}
                            className="text-xs font-black bg-indigo-600 text-white px-3 py-2 rounded-xl hover:bg-indigo-700"
                          >
                            Buat Produksi
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-5">
                      <h3 className="text-sm font-black text-slate-900 mb-4">Urutan Kerja yang Disarankan</h3>

                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        {[
                          { title: "Tambah Bahan", icon: <Package size={18} /> },
                          { title: "Tambah Produk", icon: <Layers size={18} /> },
                          { title: "Stok Masuk", icon: <ArrowDownLeft size={18} /> },
                          { title: "Buat Produksi", icon: <Factory size={18} /> },
                          { title: "Produk Jadi", icon: <PackageCheck size={18} /> }
                        ].map((item, index) => (
                          <div key={item.title} className="flex items-center gap-3">
                            <div className="flex-1 border border-slate-200 rounded-2xl p-4 bg-slate-50">
                              <div className="w-9 h-9 rounded-xl bg-white text-indigo-600 flex items-center justify-center mb-3 border border-slate-200">
                                {item.icon}
                              </div>
                              <p className="text-xs font-black text-slate-800">{index + 1}. {item.title}</p>
                            </div>
                            {index < 4 && <ArrowRight size={18} className="hidden md:block text-slate-300" />}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="border border-slate-200 rounded-2xl p-4">
                        <p className="text-xs text-slate-500 font-bold">Bahan Terdaftar</p>
                        <p className="text-2xl font-black text-slate-900 mt-1">{bahanList.length}</p>
                      </div>
                      <div className="border border-slate-200 rounded-2xl p-4">
                        <p className="text-xs text-slate-500 font-bold">Produk Terdaftar</p>
                        <p className="text-2xl font-black text-slate-900 mt-1">{produkList.length}</p>
                      </div>
                      <div className="border border-slate-200 rounded-2xl p-4">
                        <p className="text-xs text-slate-500 font-bold">Produksi Berjalan</p>
                        <p className="text-2xl font-black text-slate-900 mt-1">{woProses}</p>
                      </div>
                      <div className="border border-slate-200 rounded-2xl p-4">
                        <p className="text-xs text-slate-500 font-bold">Produksi Selesai</p>
                        <p className="text-2xl font-black text-slate-900 mt-1">{woSelesai}</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "bahan" && (
                  <>
                    {filteredBahanList.length === 0 ? (
                      <EmptyState
                        title="Belum ada data bahan baku"
                        description="Tambahkan bahan baku terlebih dahulu agar stok gudang bisa mulai dikelola."
                        buttonLabel="Tambah Bahan"
                        onClick={() => openModal("add_bahan")}
                      />
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase">ID</th>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase">Nama Bahan</th>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase">Kategori</th>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase">Stok Bahan</th>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase">Status</th>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase">Update</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 bg-white">
                          {filteredBahanList.map((bahan) => {
                            const stok = Number(bahan.stok_meter || 0);
                            const badge = getStockBadge(stok);

                            return (
                              <tr key={bahan.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="px-6 py-4 text-xs text-slate-400 font-bold">#{bahan.id}</td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                      <Package size={16} />
                                    </div>
                                    <div>
                                      <p className="text-sm font-black text-slate-900">{bahan.nama_bahan}</p>
                                      <p className="text-[11px] text-slate-400">Bahan untuk produksi alas jok</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-xs">
                                  <span className="bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-lg font-black">
                                    {bahan.kategori}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-sm font-black text-indigo-600">{stok.toFixed(2)} Meter</p>
                                </td>
                                <td className="px-6 py-4">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-black border ${badge.className}`}
                                  >
                                    {badge.icon}
                                    {badge.label}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-500 font-semibold whitespace-nowrap">
                                  {formatDate(bahan.updatedAt)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </>
                )}

                {activeTab === "produk" && (
                  <>
                    {filteredProdukList.length === 0 ? (
                      <EmptyState
                        title="Belum ada produk jadi"
                        description="Tambahkan produk jadi agar proses produksi bisa dibuat."
                        buttonLabel="Tambah Produk"
                        onClick={() => openModal("add_produk")}
                      />
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase">Kode SKU</th>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase">Nama Produk</th>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase">Stok Siap Jual</th>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase">Update</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 bg-white">
                          {filteredProdukList.map((produk) => (
                            <tr key={produk.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center bg-indigo-50 text-indigo-700 px-2.5 py-1.5 rounded-lg text-xs font-black font-mono">
                                  {produk.kode_sku}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <Layers size={16} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-black text-slate-900">{produk.nama_produk}</p>
                                    <p className="text-[11px] text-slate-400">Produk jadi siap dijual</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm font-black text-slate-900">{produk.stok_pcs} Pcs</td>
                              <td className="px-6 py-4 text-xs text-slate-500 font-semibold whitespace-nowrap">
                                {formatDate(produk.updatedAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}

                {activeTab === "produksi" && (
                  <>
                    {filteredWOList.length === 0 ? (
                      <EmptyState
                        title="Belum ada perintah produksi"
                        description="Buat perintah produksi untuk mengubah bahan baku menjadi produk jadi."
                        buttonLabel="Buat Perintah Produksi"
                        onClick={() => openModal("create_wo")}
                      />
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase">No. Produksi</th>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase">Produk</th>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase">Jumlah</th>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase">Status</th>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase">Dibuat</th>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase text-center">Aksi</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 bg-white">
                          {filteredWOList.map((wo) => (
                            <tr key={wo.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-6 py-4">
                                <p className="text-sm font-black text-indigo-700">{wo.nomor_wo}</p>
                                <p className="text-[11px] text-slate-400 font-mono">{wo.kode_sku}</p>
                              </td>
                              <td className="px-6 py-4 text-sm font-black text-slate-900">{wo.nama_produk}</td>
                              <td className="px-6 py-4 text-sm font-black text-slate-700">{wo.jumlah_produksi} Pcs</td>
                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-black border ${
                                    wo.status === "PROSES"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  }`}
                                >
                                  {wo.status === "PROSES" ? <Clock size={13} /> : <CheckCircle2 size={13} />}
                                  {wo.status === "PROSES" ? "Diproduksi" : "Selesai"}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-500 font-semibold whitespace-nowrap">
                                {formatDate(wo.createdAt)}
                              </td>
                              <td className="px-6 py-4 text-center">
                                {wo.status === "PROSES" ? (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmWO(wo)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-3.5 py-2 rounded-xl"
                                  >
                                    Selesai Produksi
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 text-emerald-600 text-xs font-black">
                                    <CheckCircle2 size={14} />
                                    Produk Masuk Stok
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      {modalType && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-indigo-600 font-black mb-1">
                  Form Inventory
                </p>
                <h2 className="text-sm font-black text-slate-900">
                  {modalType === "add_bahan" && "Tambah Bahan Baku"}
                  {modalType === "add_produk" && "Tambah Produk Jadi"}
                  {modalType === "inbound" && "Stok Masuk Bahan"}
                  {modalType === "opname" && "Cek Stok Fisik"}
                  {modalType === "create_wo" && "Buat Perintah Produksi"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {modalType === "add_bahan" && (
                <>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-1.5">
                      Nama Bahan
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Contoh: Kulit Sintetis Hitam"
                      value={newBahanName}
                      onChange={(e) => setNewBahanName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-1.5">
                      Kategori
                    </label>
                    <select
                      value={newBahanCategory}
                      onChange={(e) => setNewBahanCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl outline-none bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                    >
                      <option value="Kulit Sintetis">Kulit Sintetis</option>
                      <option value="Busa">Busa</option>
                      <option value="Benang">Benang</option>
                      <option value="Aksesoris">Aksesoris</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-1.5">
                      Stok Awal (Meter)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newBahanStokAwal}
                      onChange={(e) => setNewBahanStokAwal(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                    />
                  </div>
                </>
              )}

              {modalType === "add_produk" && (
                <>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-1.5">
                      Nama Produk
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Contoh: Jok Avanza Hitam"
                      value={newProdukName}
                      onChange={(e) => setNewProdukName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-1.5">
                      Kode SKU
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Contoh: JOK-AVNZ-HITAM"
                      value={newProdukSKU}
                      onChange={(e) => setNewProdukSKU(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl outline-none font-mono uppercase focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                    />
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Wrench size={14} className="text-indigo-600" />
                      <p className="text-[11px] font-black text-indigo-600 uppercase">
                        Resep Bahan Produk
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 mb-1.5">
                          Bahan Utama
                        </label>
                        <select
                          value={bomBahanId}
                          onChange={(e) => setBomBahanId(e.target.value)}
                          className="w-full p-2.5 text-xs border border-slate-200 rounded-xl bg-white outline-none"
                        >
                          <option value="">-- Belum pakai resep --</option>
                          {bahanList.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.nama_bahan}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-slate-400 mb-1.5">
                          Kebutuhan Meter/Pcs
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Misal: 4.5"
                          value={bomMeter}
                          onChange={(e) => setBomMeter(e.target.value)}
                          className="w-full p-2.5 text-xs border border-slate-200 rounded-xl font-bold outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {modalType === "inbound" && (
                <>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-1.5">
                      Pilih Bahan
                    </label>
                    <select
                      required
                      value={selectedBahanId}
                      onChange={(e) => setSelectedBahanId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl outline-none bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                    >
                      <option value="">-- PILIH BAHAN --</option>
                      {bahanList.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nama_bahan} (Stok: {Number(b.stok_meter).toFixed(1)}m)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-1.5">
                      Jumlah Stok Masuk (Meter)
                    </label>
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={inputJumlah}
                      onChange={(e) => setInputJumlah(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                    />
                  </div>
                </>
              )}

              {modalType === "opname" && (
                <>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-1.5">
                      Pilih Bahan
                    </label>
                    <select
                      required
                      value={selectedBahanId}
                      onChange={(e) => setSelectedBahanId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl outline-none bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                    >
                      <option value="">-- PILIH BAHAN --</option>
                      {bahanList.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nama_bahan} (Stok Sistem: {Number(b.stok_meter).toFixed(1)}m)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-1.5">
                      Stok Fisik Hasil Hitung (Meter)
                    </label>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={inputJumlah}
                      onChange={(e) => setInputJumlah(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                    />
                  </div>
                </>
              )}

              {modalType === "create_wo" && (
                <>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-1.5">
                      Nomor Perintah Produksi
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="CONTOH: PRD-2026-001"
                      value={inputNomorWO}
                      onChange={(e) => setInputNomorWO(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl outline-none font-bold uppercase focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-1.5">
                      Produk yang Diproduksi
                    </label>
                    <select
                      required
                      value={selectedProdukId}
                      onChange={(e) => setSelectedProdukId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl outline-none bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                    >
                      <option value="">-- PILIH PRODUK --</option>
                      {produkList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nama_produk} ({p.kode_sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-1.5">
                      Jumlah Produksi (Pcs)
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      placeholder="0"
                      value={inputJumlah}
                      onChange={(e) => setInputJumlah(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                    />
                  </div>
                </>
              )}

              {message && (
                <div
                  className={`text-xs font-bold p-3 rounded-xl flex items-center gap-2 border ${
                    message.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "bg-red-50 text-red-600 border-red-100"
                  }`}
                >
                  {message.type === "success" ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}
                  {message.text}
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-100 rounded-xl font-bold"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl font-black shadow-sm disabled:opacity-70 flex items-center gap-2"
                >
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {submitting ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmWO && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <CheckCircle2 size={28} />
              </div>

              <h3 className="text-lg font-black text-slate-900">Selesaikan Produksi?</h3>
              <p className="text-sm text-slate-500 leading-relaxed mt-2">
                Produksi <span className="font-black text-slate-700">{confirmWO.nomor_wo}</span> untuk produk{" "}
                <span className="font-black text-slate-700">{confirmWO.nama_produk}</span> akan ditandai selesai.
                Stok produk jadi akan bertambah sesuai jumlah produksi.
              </p>

              <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex justify-between gap-4 text-xs">
                  <span className="text-slate-500 font-bold">Jumlah Produksi</span>
                  <span className="font-black text-slate-900">{confirmWO.jumlah_produksi} Pcs</span>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmWO(null)}
                  disabled={completingWO}
                  className="px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-100 rounded-xl font-bold"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={executeCompleteWO}
                  disabled={completingWO}
                  className="px-5 py-2.5 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-black shadow-sm disabled:opacity-70 flex items-center gap-2"
                >
                  {completingWO ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  {completingWO ? "Memproses..." : "Ya, Selesaikan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}