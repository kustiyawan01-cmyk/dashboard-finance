"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  Banknote,
  Bell,
  Briefcase,
  Calendar,
  CalendarRange,
  ChevronDown,
  Download,
  Edit,
  FileBox,
  LayoutGrid,
  ListOrdered,
  Megaphone,
  Package,
  Plus,
  QrCode,
  Receipt,
  RefreshCcw,
  Search,
  Settings,
  Smartphone,
  Trash2,
  Truck,
  Upload,
  Users2,
  Wallet,
  WalletCards,
  Wrench,
  X
} from "lucide-react";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

type ExpenseRow = {
  id?: number | string;
  tanggal: string;
  kategori: string;
  keterangan: string;
  jumlah: number;
  metode_pembayaran: string;
  created_at?: string;
};

type DateRange = {
  start: string;
  end: string;
};

type InternalMetrics = {
  operasional: number;
  marketing: number;
  maintenance: number;
  karyawan: number;
  bahan: number;
  gaji: number;
  perlengkapan: number;
};

type Metrics = {
  totalKasKeluar: number;
  totalOperasional: number;
  totalStok: number;
  periodeIni: number;
  rataHarian: number;
  totalTransaksi: number;
  totalKategori: number;
  previousTotal: number;
  previousOperasional: number;
  previousStok: number;
  trendData: number[];
  internal: InternalMetrics;
};

type FormDataState = {
  tanggal: string;
  kategori: string;
  keterangan: string;
  jumlah: string;
  metode_pembayaran: string;
};

const todayIso = () => new Date().toISOString().split("T")[0];

const defaultFormData: FormDataState = {
  tanggal: todayIso(),
  kategori: "Biaya Operasional",
  keterangan: "",
  jumlah: "",
  metode_pembayaran: "Transfer Bank"
};

const defaultMetrics: Metrics = {
  totalKasKeluar: 0,
  totalOperasional: 0,
  totalStok: 0,
  periodeIni: 0,
  rataHarian: 0,
  totalTransaksi: 0,
  totalKategori: 0,
  previousTotal: 0,
  previousOperasional: 0,
  previousStok: 0,
  trendData: [0, 0, 0, 0, 0],
  internal: {
    operasional: 0,
    marketing: 0,
    maintenance: 0,
    karyawan: 0,
    bahan: 0,
    gaji: 0,
    perlengkapan: 0
  }
};

export default function ExpensesPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [rawExpenses, setRawExpenses] = useState<ExpenseRow[]>([]);
  const [metrics, setMetrics] = useState<Metrics>(defaultMetrics);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua Kategori");
  const [selectedMethod, setSelectedMethod] = useState("Semua Metode");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [dateRange, setDateRange] = useState<DateRange>({ start: "", end: "" });
  const [tempDateRange, setTempDateRange] = useState<DateRange>({ start: "", end: "" });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState<number | string | null>(null);
  const [formData, setFormData] = useState<FormDataState>(defaultFormData);

  const [deleteTarget, setDeleteTarget] = useState<ExpenseRow | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

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

  const normalizeDate = (value: unknown) => {
    if (!value || value === "-") return "";

    const formatDateParts = (year: number, month: number, day: number) => {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    };

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return formatDateParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
    }

    if (typeof value === "number" && value > 20000) {
      const parsed = XLSX.SSF.parse_date_code(value);

      if (parsed) {
        return formatDateParts(parsed.y, parsed.m, parsed.d);
      }

      const date = new Date(Math.round((value - 25569) * 86400 * 1000));
      return formatDateParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
    }

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

    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(text)) {
      const [d, m, y] = text.split("-");
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    const monthMap: Record<string, string> = {
      jan: "01",
      januari: "01",
      feb: "02",
      februari: "02",
      mar: "03",
      maret: "03",
      apr: "04",
      april: "04",
      mei: "05",
      may: "05",
      jun: "06",
      juni: "06",
      jul: "07",
      juli: "07",
      agu: "08",
      ags: "08",
      agustus: "08",
      aug: "08",
      sep: "09",
      september: "09",
      okt: "10",
      oktober: "10",
      oct: "10",
      nov: "11",
      november: "11",
      des: "12",
      desember: "12",
      dec: "12"
    };

    const monthNameMatch = text.match(/^(\d{1,2})[-/ ]([a-zA-Z]+)(?:[-/ ](\d{2,4}))?$/);

    if (monthNameMatch) {
      const day = monthNameMatch[1].padStart(2, "0");
      const month = monthMap[monthNameMatch[2].toLowerCase()];
      const rawYear = monthNameMatch[3] || "2026";
      const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;

      if (month) return `${year}-${month}-${day}`;
    }

    return text;
  };

  const formatDate = (value: unknown) => {
    const normalized = normalizeDate(value);
    if (!normalized || !/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return "-";
    const [y, m, d] = normalized.split("-");
    return `${d}/${m}/${y}`;
  };

  const parseCurrency = (value: unknown) => {
    if (value === undefined || value === null || value === "") return 0;
    if (typeof value === "number") return Math.round(value);

    let text = String(value).trim().replace(/Rp/gi, "").replace(/\s/g, "");

    if (text.includes(",") && text.includes(".")) {
      if (text.indexOf(",") < text.indexOf(".")) text = text.replace(/,/g, "");
      else text = text.replace(/\./g, "").replace(/,/g, ".");
    } else if (text.includes(",")) {
      const parts = text.split(",");
      text = parts[parts.length - 1].length === 2 ? text.replace(/,/g, ".") : text.replace(/,/g, "");
    } else if (text.includes(".")) {
      const parts = text.split(".");
      if (parts[parts.length - 1].length !== 2) text = text.replace(/\./g, "");
    }

    text = text.replace(/[^0-9.-]/g, "");
    const number = Number(text);

    return Number.isNaN(number) ? 0 : Math.round(Math.abs(number));
  };

  const getCategoryGroup = (kategori: string) => {
    const cat = String(kategori || "").toLowerCase();

    if (cat.includes("marketing") || cat.includes("iklan")) return "marketing";
    if (cat.includes("maintenance") || cat.includes("perbaikan")) return "maintenance";
    if (cat.includes("karyawan") && !cat.includes("gaji")) return "karyawan";
    if (cat.includes("bahan") || cat.includes("produksi") || cat.includes("stok")) return "bahan";
    if (cat.includes("gaji")) return "gaji";
    if (cat.includes("perlengkapan") || cat.includes("atk")) return "perlengkapan";

    return "operasional";
  };

  const isStockExpense = (kategori: string) => getCategoryGroup(kategori) === "bahan";

  const getFilteredByDate = (data: ExpenseRow[], range: DateRange) => {
    return data.filter((item) => {
      const date = normalizeDate(item.tanggal || item.created_at);

      if (!range.start && !range.end) return true;
      if (!date) return true;
      if (range.start && date < range.start) return false;
      if (range.end && date > range.end) return false;

      return true;
    });
  };

  const getPreviousRange = (range: DateRange): DateRange => {
    if (!range.start || !range.end) return { start: "", end: "" };

    const start = new Date(`${range.start}T00:00:00`);
    const end = new Date(`${range.end}T00:00:00`);
    const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);

    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);

    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - diffDays + 1);

    return {
      start: prevStart.toISOString().split("T")[0],
      end: prevEnd.toISOString().split("T")[0]
    };
  };

  const buildMetrics = (data: ExpenseRow[], previousData: ExpenseRow[]): Metrics => {
    let totalKasKeluar = 0;
    let totalOperasional = 0;
    let totalStok = 0;
    let op = 0;
    let mkt = 0;
    let mtc = 0;
    let krw = 0;
    let bhn = 0;
    let gj = 0;
    let plg = 0;

    const categories = new Set<string>();
    const dailySums: Record<string, number> = {};

    data.forEach((item) => {
      const amount = Number(item.jumlah) || 0;
      const group = getCategoryGroup(item.kategori);
      const date = normalizeDate(item.tanggal || item.created_at) || "-";

      totalKasKeluar += amount;
      categories.add(item.kategori || "Tanpa Kategori");
      dailySums[date] = (dailySums[date] || 0) + amount;

      if (group === "operasional") op += amount;
      else if (group === "marketing") mkt += amount;
      else if (group === "maintenance") mtc += amount;
      else if (group === "karyawan") krw += amount;
      else if (group === "bahan") bhn += amount;
      else if (group === "gaji") gj += amount;
      else if (group === "perlengkapan") plg += amount;
    });

    totalStok = bhn;
    totalOperasional = totalKasKeluar - totalStok;

    let previousTotal = 0;
    let previousOperasional = 0;
    let previousStok = 0;

    previousData.forEach((item) => {
      const amount = Number(item.jumlah) || 0;
      previousTotal += amount;

      if (isStockExpense(item.kategori)) previousStok += amount;
      else previousOperasional += amount;
    });

    const sortedDates = Object.keys(dailySums).sort();
    const trend = sortedDates.slice(-14).map((date) => dailySums[date]);

    return {
      totalKasKeluar,
      totalOperasional,
      totalStok,
      periodeIni: totalKasKeluar,
      rataHarian: sortedDates.length > 0 ? totalKasKeluar / sortedDates.length : 0,
      totalTransaksi: data.length,
      totalKategori: categories.size,
      previousTotal,
      previousOperasional,
      previousStok,
      trendData: trend.length > 0 ? trend : [0, 0, 0, 0, 0],
      internal: {
        operasional: op,
        marketing: mkt,
        maintenance: mtc,
        karyawan: krw,
        bahan: bhn,
        gaji: gj,
        perlengkapan: plg
      }
    };
  };

  const fetchExpenses = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/expenses");

      if (!res.ok) {
        showNotification("error", "Gagal mengambil data pengeluaran.");
        return;
      }

      const rawData = await res.json();
      const normalizedData: ExpenseRow[] = Array.isArray(rawData)
        ? rawData.map((item: any) => ({
            ...item,
            tanggal: normalizeDate(item.tanggal || item.date || item.created_at),
            kategori: String(item.kategori || item.category || "Biaya Operasional"),
            keterangan: String(item.keterangan || item.description || "-"),
            jumlah: Number(item.jumlah || item.amount || 0),
            metode_pembayaran: String(item.metode_pembayaran || item.method || "Transfer Bank")
          }))
        : [];

      const currentData = getFilteredByDate(normalizedData, dateRange);
      const previousRange = getPreviousRange(dateRange);
      const previousData = previousRange.start && previousRange.end ? getFilteredByDate(normalizedData, previousRange) : [];

      setRawExpenses(normalizedData);
      setExpenses(currentData);
      setMetrics(buildMetrics(currentData, previousData));
    } catch {
      showNotification("error", "Terjadi kesalahan saat mengambil data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [dateRange]);

  const applyPresetDate = (days: number) => {
    const end = new Date();
    const start = new Date();

    start.setDate(end.getDate() - days);

    const formatDateValue = (date: Date) => date.toISOString().split("T")[0];

    setDateRange({
      start: formatDateValue(start),
      end: formatDateValue(end)
    });
    setCurrentPage(1);
  };

  const handlePresetDate = (days: number) => {
    const end = new Date();
    const start = new Date();

    start.setDate(end.getDate() - days);

    const formatDateValue = (date: Date) => date.toISOString().split("T")[0];

    setTempDateRange({
      start: formatDateValue(start),
      end: formatDateValue(end)
    });
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const search = searchTerm.toLowerCase();
      const matchSearch =
        String(exp.keterangan || "").toLowerCase().includes(search) ||
        String(exp.kategori || "").toLowerCase().includes(search) ||
        String(exp.metode_pembayaran || "").toLowerCase().includes(search);

      const matchCategory = selectedCategory === "Semua Kategori" || exp.kategori === selectedCategory;
      const matchMethod = selectedMethod === "Semua Metode" || exp.metode_pembayaran === selectedMethod;

      return matchSearch && matchCategory && matchMethod;
    });
  }, [expenses, searchTerm, selectedCategory, selectedMethod]);

  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const paginatedExpenses = filteredExpenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const uniqueCategories = useMemo(() => {
    return ["Semua Kategori", ...Array.from(new Set(rawExpenses.map((item) => item.kategori).filter(Boolean)))];
  }, [rawExpenses]);

  const uniqueMethods = useMemo(() => {
    return ["Semua Metode", ...Array.from(new Set(rawExpenses.map((item) => item.metode_pembayaran).filter(Boolean)))];
  }, [rawExpenses]);

  const methodSummary = useMemo(() => {
    const map = new Map<string, number>();

    filteredExpenses.forEach((item) => {
      const method = item.metode_pembayaran || "Tanpa Metode";
      map.set(method, (map.get(method) || 0) + Number(item.jumlah || 0));
    });

    return Array.from(map.entries())
      .map(([method, total]) => ({ method, total }))
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses]);

  const largestExpenses = useMemo(() => {
    return [...filteredExpenses].sort((a, b) => Number(b.jumlah || 0) - Number(a.jumlah || 0)).slice(0, 5);
  }, [filteredExpenses]);

  const warningRows = useMemo(() => {
    const rows: Array<{ title: string; desc: string; tone: "red" | "amber" | "green" }> = [];
    const operationalRatio = metrics.totalKasKeluar > 0 ? (metrics.totalOperasional / metrics.totalKasKeluar) * 100 : 0;
    const stockRatio = metrics.totalKasKeluar > 0 ? (metrics.totalStok / metrics.totalKasKeluar) * 100 : 0;
    const biggest = largestExpenses[0];

    if (metrics.totalTransaksi === 0) {
      rows.push({
        title: "Belum ada pengeluaran",
        desc: "Tidak ada transaksi pada periode atau filter ini.",
        tone: "amber"
      });
    }

    if (metrics.totalStok > 0 && stockRatio > 50) {
      rows.push({
        title: "Pembelian stok dominan",
        desc: `Pembelian bahan/stok mengambil ${stockRatio.toFixed(1)}% dari total kas keluar.`,
        tone: "amber"
      });
    }

    if (operationalRatio > 70) {
      rows.push({
        title: "Operasional cukup tinggi",
        desc: `Beban operasional mencapai ${operationalRatio.toFixed(1)}% dari total kas keluar.`,
        tone: "amber"
      });
    }

    if (biggest && Number(biggest.jumlah || 0) > metrics.totalKasKeluar * 0.35) {
      rows.push({
        title: "Ada transaksi besar",
        desc: `${biggest.keterangan} sebesar ${formatRp(Number(biggest.jumlah || 0))}.`,
        tone: "red"
      });
    }

    if (rows.length === 0) {
      rows.push({
        title: "Data aman",
        desc: "Tidak ada warning besar pada periode ini.",
        tone: "green"
      });
    }

    return rows;
  }, [metrics, largestExpenses]);

  const handleExport = () => {
    const wb = XLSX.utils.book_new();

    const wsData = XLSX.utils.json_to_sheet(filteredExpenses.map((exp) => ({
      Tanggal: exp.tanggal,
      Kategori: exp.kategori,
      Tipe: isStockExpense(exp.kategori) ? "Pembelian Stok" : "Beban Operasional",
      Keterangan: exp.keterangan,
      Metode: exp.metode_pembayaran,
      Jumlah: exp.jumlah
    })));

    const wsSummary = XLSX.utils.json_to_sheet([
      { Metrik: "Total Kas Keluar", Nilai: metrics.totalKasKeluar },
      { Metrik: "Beban Operasional", Nilai: metrics.totalOperasional },
      { Metrik: "Pembelian Bahan / Stok", Nilai: metrics.totalStok },
      { Metrik: "Rata-rata Harian", Nilai: metrics.rataHarian },
      { Metrik: "Total Transaksi", Nilai: metrics.totalTransaksi },
      { Metrik: "Total Kategori", Nilai: metrics.totalKategori }
    ]);

    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan");
    XLSX.utils.book_append_sheet(wb, wsData, "Data Pengeluaran");
    XLSX.writeFile(wb, "Laporan_Pengeluaran.xlsx");
  };

  const readExcelDateCell = (sheet: XLSX.WorkSheet, rowIndex: number, colIndex: number) => {
    const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
    const cell = sheet[cellAddress];

    const fromFormattedText = normalizeDate(cell?.w);
    if (/^\d{4}-\d{2}-\d{2}$/.test(fromFormattedText)) return fromFormattedText;

    const fromRawValue = normalizeDate(cell?.v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(fromRawValue)) return fromRawValue;

    return "";
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { cellDates: false, raw: true });

      const normalizeHeader = (value: unknown) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

      const mapKonveksiCategory = (value: unknown) => {
        const text = String(value || "").toLowerCase();

        if (text.includes("bahan")) return "Biaya Beli Bahan";
        if (text.includes("gaji")) return "Biaya Gaji";
        if (text.includes("makan")) return "Biaya Karyawan";
        if (text.includes("packing") || text.includes("plastik") || text.includes("inventaris")) return "Biaya Perlengkapan";
        if (text.includes("ongkos") || text.includes("akomodasi") || text.includes("bensin") || text.includes("kirim")) return "Biaya Operasional";
        if (text.includes("marketing") || text.includes("iklan")) return "Biaya Marketing";
        if (text.includes("maintenance") || text.includes("perbaikan")) return "Biaya Maintenance";
        if (text.includes("bll") || text.includes("lain")) return "Biaya Operasional";

        return "Biaya Operasional";
      };

      const readObjectValue = (row: Record<string, unknown>, keys: string[]) => {
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

      const importedRows: Array<{
        tanggal: string;
        kategori: string;
        keterangan: string;
        jumlah: number;
        metode_pembayaran: string;
      }> = [];

      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: true });

        const headerRowIndex = matrix.findIndex((row) => {
          const headers = row.map(normalizeHeader);
          return headers.includes("tgl") && (headers.includes("uraian") || headers.includes("keterangan")) && (headers.includes("nilai") || headers.includes("jumlah"));
        });

        if (headerRowIndex >= 0) {
          const headerRow = matrix[headerRowIndex].map(normalizeHeader);

          const findCol = (names: string[]) => {
            return headerRow.findIndex((header) => names.some((name) => header === normalizeHeader(name)));
          };

          const iTanggal = 0;
          const iKategori = 2;
          const iKeterangan = 3;
          const iNilai = 7;
          const iMetode = -1;

          matrix.slice(headerRowIndex + 1).forEach((row, rowOffset) => {
            const excelRowIndex = headerRowIndex + 1 + rowOffset;
            const tanggal = readExcelDateCell(sheet, excelRowIndex, iTanggal);
            const kategoriAsli = String(row[iKategori] || "").trim();
            const kategori = mapKonveksiCategory(kategoriAsli);
            const keterangan = String(row[iKeterangan] || "").trim() || kategoriAsli || "Pengeluaran";
            const jumlah = parseCurrency(row[iNilai]);
            const metode = "Transfer Bank";

            if (tanggal && jumlah > 0) {
              importedRows.push({
                tanggal,
                kategori,
                keterangan,
                jumlah,
                metode_pembayaran: metode
              });
            }
          });

          return;
        }

        const objectRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: true });

        objectRows.forEach((row) => {
          const tanggal = normalizeDate(readObjectValue(row, ["tanggal", "date", "tgl"]));
          const kategoriMentah = readObjectValue(row, ["kategori", "category", "uraian"]);
          const kategori = mapKonveksiCategory(kategoriMentah || "Biaya Operasional");
          const keterangan = String(readObjectValue(row, ["keterangan", "deskripsi", "description", "tujuan", "nama barang", "barang"]) || "-").trim();
          const metode = String(readObjectValue(row, ["metode", "metode pembayaran", "payment method"]) || "Transfer Bank").trim();
          const jumlah = parseCurrency(readObjectValue(row, ["jumlah", "amount", "nominal", "nilai"]));

          if (tanggal && jumlah > 0) {
            importedRows.push({
              tanggal,
              kategori,
              keterangan,
              jumlah,
              metode_pembayaran: metode || "Transfer Bank"
            });
          }
        });
      });

      const uniquePayload = Array.from(
        new Map(
          importedRows.map((row) => [
            `${row.tanggal}|${row.kategori}|${row.keterangan}|${row.jumlah}|${row.metode_pembayaran}`,
            row
          ])
        ).values()
      );

      if (uniquePayload.length === 0) {
        showNotification("error", "File Excel tidak memiliki data pengeluaran yang valid.");
        return;
      }

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(uniquePayload)
      });

      if (!res.ok) {
        showNotification("error", "Gagal import Excel.");
        return;
      }

      showNotification("success", `${uniquePayload.length} data pengeluaran berhasil diimport.`);
      fetchExpenses();
    } catch {
      showNotification("error", "Terjadi kesalahan saat membaca file Excel.");
    } finally {
      if (event.target) event.target.value = "";
    }
  };

  const handleEditClick = (exp: ExpenseRow) => {
    setFormData({
      tanggal: normalizeDate(exp.tanggal),
      kategori: exp.kategori,
      keterangan: exp.keterangan,
      jumlah: String(exp.jumlah || ""),
      metode_pembayaran: exp.metode_pembayaran
    });
    setEditId(exp.id || null);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;

    try {
      const res = await fetch("/api/expenses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id })
      });

      if (!res.ok) {
        showNotification("error", "Gagal menghapus data.");
        return;
      }

      showNotification("success", "Data pengeluaran berhasil dihapus.");
      setDeleteTarget(null);
      fetchExpenses();
    } catch {
      showNotification("error", "Terjadi kesalahan saat menghapus data.");
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const amount = parseCurrency(formData.jumlah);

    if (!formData.tanggal || !formData.kategori || !formData.keterangan || amount <= 0) {
      showNotification("error", "Lengkapi data pengeluaran dengan benar.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editId) {
        const res = await fetch("/api/expenses", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editId,
            ...formData,
            jumlah: amount
          })
        });

        if (!res.ok) {
          showNotification("error", "Gagal update data.");
          return;
        }

        showNotification("success", "Data pengeluaran berhasil diupdate.");
      } else {
        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([{ ...formData, jumlah: amount }])
        });

        if (!res.ok) {
          showNotification("error", "Gagal menyimpan data.");
          return;
        }

        showNotification("success", "Data pengeluaran berhasil disimpan.");
      }

      closeModal();
      fetchExpenses();
    } catch {
      showNotification("error", "Terjadi kesalahan sistem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    setFormData(defaultFormData);
  };

  const getCategoryStyle = (kategori: string) => {
    const group = getCategoryGroup(kategori);

    if (group === "operasional") return { icon: <Briefcase size={14} />, color: "text-blue-600 bg-blue-50 border-blue-100" };
    if (group === "marketing") return { icon: <Megaphone size={14} />, color: "text-pink-600 bg-pink-50 border-pink-100" };
    if (group === "maintenance") return { icon: <Settings size={14} />, color: "text-slate-600 bg-slate-100 border-slate-200" };
    if (group === "karyawan") return { icon: <Users2 size={14} />, color: "text-indigo-600 bg-indigo-50 border-indigo-100" };
    if (group === "bahan") return { icon: <Package size={14} />, color: "text-emerald-600 bg-emerald-50 border-emerald-100" };
    if (group === "gaji") return { icon: <Wallet size={14} />, color: "text-purple-600 bg-purple-50 border-purple-100" };
    if (group === "perlengkapan") return { icon: <FileBox size={14} />, color: "text-amber-500 bg-amber-50 border-amber-100" };

    return { icon: <LayoutGrid size={14} />, color: "text-slate-600 bg-slate-100 border-slate-200" };
  };

  const getMethodStyle = (metode: string) => {
    const met = String(metode || "").toLowerCase();

    if (met.includes("transfer")) return { icon: <Banknote size={14} />, color: "text-blue-600 bg-blue-50" };
    if (met.includes("qris")) return { icon: <QrCode size={14} />, color: "text-purple-600 bg-purple-50" };
    if (met.includes("wallet") || met.includes("ovo") || met.includes("dana") || met.includes("tunai") || met.includes("cash")) return { icon: <Smartphone size={14} />, color: "text-emerald-600 bg-emerald-50" };

    return { icon: <Banknote size={14} />, color: "text-slate-600 bg-slate-100" };
  };

  if (loading && expenses.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center p-10 text-[15px] font-medium text-slate-500">
        Mempersiapkan Data Pengeluaran...
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
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Pengeluaran Kantor</h1>
          <p className="mt-1 text-[15px] font-medium text-slate-500">Kelola kas keluar, operasional, dan pembelian bahan/stok bisnis.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <QuickButton label="Hari Ini" onClick={() => applyPresetDate(0)} />
          <QuickButton label="7 Hari" onClick={() => applyPresetDate(7)} />
          <QuickButton label="30 Hari" onClick={() => applyPresetDate(30)} />
          <QuickButton label="Semua" onClick={() => { setDateRange({ start: "", end: "" }); setCurrentPage(1); }} />

          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
            <Upload size={16} />
            Import Excel
          </button>

          <button onClick={handleExport} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
            <Download size={16} />
            Export
          </button>

          <div className="relative z-50">
            <button
              onClick={() => {
                setTempDateRange(dateRange);
                setIsDatePickerOpen(!isDatePickerOpen);
              }}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <Calendar size={18} className="text-indigo-500" />
              {dateRange.start || dateRange.end ? `${dateRange.start || "Awal"} - ${dateRange.end || "Sekarang"}` : "Semua Waktu"}
            </button>

            {isDatePickerOpen && (
              <div className="absolute right-0 top-full mt-2 flex w-[500px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="flex h-[280px] flex-row">
                  <div className="flex w-40 flex-col gap-1 overflow-y-auto border-r border-slate-100 bg-slate-50/50 p-2">
                    <button onClick={() => handlePresetDate(0)} className="rounded-md px-3 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700">Hari ini</button>
                    <button onClick={() => handlePresetDate(1)} className="rounded-md px-3 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700">Kemarin</button>
                    <button onClick={() => handlePresetDate(7)} className="rounded-md px-3 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700">7 hari terakhir</button>
                    <button onClick={() => handlePresetDate(30)} className="rounded-md px-3 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700">30 hari terakhir</button>
                    <button onClick={() => handlePresetDate(90)} className="rounded-md px-3 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700">3 bulan terakhir</button>
                    <button onClick={() => setTempDateRange({ start: "", end: "" })} className="rounded-md px-3 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700">Semua waktu</button>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h4 className="mb-4 font-medium text-slate-900">Atur Tanggal Kustom</h4>

                    <div className="mb-auto flex items-center gap-4">
                      <div className="flex-1">
                        <label className="mb-1.5 block text-xs font-medium text-slate-500">Mulai Tanggal</label>
                        <input type="date" value={tempDateRange.start} onChange={(event) => setTempDateRange((prev) => ({ ...prev, start: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                      </div>
                      <div className="flex-1">
                        <label className="mb-1.5 block text-xs font-medium text-slate-500">Sampai Tanggal</label>
                        <input type="date" value={tempDateRange.end} onChange={(event) => setTempDateRange((prev) => ({ ...prev, end: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                      <button
                        onClick={() => {
                          setDateRange({ start: "", end: "" });
                          setTempDateRange({ start: "", end: "" });
                          setIsDatePickerOpen(false);
                          setCurrentPage(1);
                        }}
                        className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-red-600 transition-colors hover:bg-red-100"
                      >
                        Reset
                      </button>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setIsDatePickerOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100">
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            setDateRange(tempDateRange);
                            setIsDatePickerOpen(false);
                            setCurrentPage(1);
                          }}
                          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
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

          <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
            <Bell size={20} className="text-slate-600" />
            <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
          </div>
        </div>
      </div>

      <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <TopCard title="Total Kas Keluar" value={formatRp(metrics.totalKasKeluar)} icon={<WalletCards />} color="red" trend={metrics.trendData} current={metrics.totalKasKeluar} previous={metrics.previousTotal} />
        <TopCard title="Beban Operasional" value={formatRp(metrics.totalOperasional)} icon={<Briefcase />} color="orange" trend={metrics.trendData} current={metrics.totalOperasional} previous={metrics.previousOperasional} />
        <TopCard title="Beli Bahan / Stok" value={formatRp(metrics.totalStok)} icon={<Truck />} color="blue" trend={metrics.trendData} current={metrics.totalStok} previous={metrics.previousStok} />
        <TopCard title="Rata-rata / Hari" value={formatRp(metrics.rataHarian)} icon={<CalendarRange />} color="emerald" trend={metrics.trendData} />
        <TopCard title="Transaksi" value={metrics.totalTransaksi.toLocaleString("id-ID")} icon={<ListOrdered />} color="purple" trend={metrics.trendData} />
        <TopCard title="Kategori" value={metrics.totalKategori.toLocaleString("id-ID")} icon={<LayoutGrid />} color="slate" trend={metrics.trendData} />
      </section>

      <section className="mb-6">
        <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-slate-500">Operasional Internal & Pembelian Stok</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          <MiniMetricCard label="Operasional" value={formatRp(metrics.internal.operasional)} icon={<Briefcase />} color="text-amber-500 bg-amber-50" />
          <MiniMetricCard label="Marketing" value={formatRp(metrics.internal.marketing)} icon={<Megaphone />} color="text-amber-500 bg-amber-50" />
          <MiniMetricCard label="Maintenance" value={formatRp(metrics.internal.maintenance)} icon={<Wrench />} color="text-amber-500 bg-amber-50" />
          <MiniMetricCard label="Karyawan" value={formatRp(metrics.internal.karyawan)} icon={<Users2 />} color="text-amber-500 bg-amber-50" />
          <MiniMetricCard label="Beli Bahan / Stok" value={formatRp(metrics.internal.bahan)} icon={<Truck />} color="text-blue-500 bg-blue-50" />
          <MiniMetricCard label="Biaya Gaji" value={formatRp(metrics.internal.gaji)} icon={<Wallet />} color="text-amber-500 bg-amber-50" />
          <MiniMetricCard label="Perlengkapan" value={formatRp(metrics.internal.perlengkapan)} icon={<FileBox />} color="text-amber-500 bg-amber-50" />
        </div>
      </section>

      <section className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-[14px] font-bold text-slate-900">Rekap Metode Pembayaran</h3>
          <div className="space-y-3">
            {methodSummary.length > 0 ? methodSummary.map((row) => (
              <ProgressRow key={row.method} label={row.method} value={row.total} total={metrics.totalKasKeluar} />
            )) : (
              <p className="py-8 text-center text-sm font-bold text-slate-400">Belum ada data metode pembayaran.</p>
            )}
          </div>
        </div>

        <WarningPanel warnings={warningRows} />
      </section>

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-[14px] font-bold text-slate-900">Pengeluaran Terbesar</h3>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          {largestExpenses.length > 0 ? largestExpenses.map((item) => {
            const catStyle = getCategoryStyle(item.kategori);

            return (
              <div key={`${item.id}-${item.keterangan}`} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                <div className={`mb-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${catStyle.color}`}>
                  {catStyle.icon}
                  <span className="text-[10px] font-black">{item.kategori}</span>
                </div>
                <p className="line-clamp-2 min-h-[32px] text-[13px] font-bold text-slate-700">{item.keterangan}</p>
                <p className="mt-2 text-[16px] font-black text-red-600">{formatRp(Number(item.jumlah || 0))}</p>
                <p className="mt-1 text-[11px] font-medium text-slate-400">{formatDate(item.tanggal)}</p>
              </div>
            );
          }) : (
            <p className="col-span-full py-8 text-center text-sm font-bold text-slate-400">Belum ada pengeluaran terbesar.</p>
          )}
        </div>
      </section>

      <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-5">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="relative w-full max-w-xs">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari keterangan, kategori, metode..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-[13px] text-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <select value={selectedCategory} onChange={(event) => { setSelectedCategory(event.target.value); setCurrentPage(1); }} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2.5 pr-8 text-[13px] font-medium text-slate-600 focus:outline-none">
              {uniqueCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>

            <select value={selectedMethod} onChange={(event) => { setSelectedMethod(event.target.value); setCurrentPage(1); }} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2.5 pr-8 text-[13px] font-medium text-slate-600 focus:outline-none">
              {uniqueMethods.map((method) => <option key={method} value={method}>{method}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 rounded-lg bg-[#FF5722] px-5 py-2.5 text-[14px] font-bold text-white shadow-sm shadow-orange-200 transition-colors hover:bg-[#E64A19]">
              <Plus size={18} />
              Tambah Pengeluaran
            </button>
            <div className="ml-1 flex items-center gap-2 border-l border-slate-200 pl-3">
              <button onClick={fetchExpenses} title="Refresh Data" className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600">
                <RefreshCcw size={18} />
              </button>
              <button onClick={handleExport} title="Download Excel" className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600">
                <Download size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-[400px] overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-white">
                <th className="w-[13%] px-6 py-4 text-[13px] font-bold text-slate-800">Tanggal</th>
                <th className="w-[18%] px-6 py-4 text-[13px] font-bold text-slate-800">Kategori</th>
                <th className="w-[31%] px-6 py-4 text-[13px] font-bold text-slate-800">Keterangan</th>
                <th className="w-[16%] px-6 py-4 text-[13px] font-bold text-slate-800">Metode</th>
                <th className="w-[12%] px-6 py-4 text-right text-[13px] font-bold text-slate-800">Jumlah</th>
                <th className="w-[10%] px-6 py-4 text-center text-[13px] font-bold text-slate-800">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedExpenses.map((exp) => {
                const catStyle = getCategoryStyle(exp.kategori);
                const methodStyle = getMethodStyle(exp.metode_pembayaran);


                return (
                  <tr key={String(exp.id || `${exp.tanggal}-${exp.keterangan}`)} className="group bg-white transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-[14px] font-medium text-slate-600">{formatDate(exp.tanggal)}</td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${catStyle.color}`}>
                        {catStyle.icon}
                        <span className="text-[12px] font-bold tracking-wide">{exp.kategori}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-[14px] font-medium text-slate-700">{exp.keterangan}</td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 ${methodStyle.color}`}>
                        {methodStyle.icon}
                        <span className="text-[12px] font-bold">{exp.metode_pembayaran}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-[15px] font-black text-red-600">{formatRp(Number(exp.jumlah || 0))}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-80 transition-opacity group-hover:opacity-100">
                        <button onClick={() => handleEditClick(exp)} title="Edit Data" className="rounded-md p-1.5 text-blue-500 transition-colors hover:bg-blue-50 hover:text-blue-700">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => setDeleteTarget(exp)} title="Hapus Data" className="rounded-md p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-24 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
                      <Receipt size={32} className="text-slate-300" />
                    </div>
                    <p className="text-[15px] font-bold text-slate-500">Tidak ada data ditemukan</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-white p-5">
            <span className="text-[13px] font-medium text-slate-500">
              Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredExpenses.length)} dari {filteredExpenses.length} data
            </span>

            <div className="flex items-center gap-1">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50">
                <ChevronDown size={16} className="rotate-90" />
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2)).map((page) => (
                <button key={page} onClick={() => setCurrentPage(page)} className={`flex h-8 w-8 items-center justify-center rounded-md text-[13px] font-bold ${currentPage === page ? "bg-[#FF5722] text-white" : "border border-transparent text-slate-600 hover:bg-slate-50"}`}>
                  {page}
                </button>
              ))}

              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50">
                <ChevronDown size={16} className="-rotate-90" />
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 px-6 py-4">
              <h3 className="text-[18px] font-black text-slate-900">{editId ? "Edit Pengeluaran" : "Catat Pengeluaran Baru"}</h3>
              <button onClick={closeModal} className="text-slate-400 transition-colors hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="mb-2 block text-[12px] font-bold uppercase tracking-wide text-slate-600">Tanggal</label>
                  <input type="date" required value={formData.tanggal} onChange={(event) => setFormData({ ...formData, tanggal: event.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="mb-2 block text-[12px] font-bold uppercase tracking-wide text-slate-600">Kategori</label>
                  <select required value={formData.kategori} onChange={(event) => setFormData({ ...formData, kategori: event.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-orange-500">
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
                <label className="mb-2 block text-[12px] font-bold uppercase tracking-wide text-slate-600">Keterangan / Tujuan</label>
                <input type="text" required placeholder="Contoh: Beli kertas HVS dan tinta" value={formData.keterangan} onChange={(event) => setFormData({ ...formData, keterangan: event.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="mb-2 block text-[12px] font-bold uppercase tracking-wide text-slate-600">Jumlah (Rp)</label>
                  <input type="text" required placeholder="50000" value={formData.jumlah} onChange={(event) => setFormData({ ...formData, jumlah: event.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-[14px] font-bold text-red-600 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="mb-2 block text-[12px] font-bold uppercase tracking-wide text-slate-600">Metode Pembayaran</label>
                  <select required value={formData.metode_pembayaran} onChange={(event) => setFormData({ ...formData, metode_pembayaran: event.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <option>Transfer Bank</option>
                    <option>QRIS</option>
                    <option>E-Wallet (OVO/Dana)</option>
                    <option>Cash / Tunai</option>
                    <option>Kartu Kredit</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3 font-bold text-slate-600 transition-colors hover:bg-slate-50">
                  Batal
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 rounded-lg bg-[#FF5722] px-4 py-3 font-bold text-white transition-colors hover:bg-[#E64A19] disabled:opacity-50">
                  {isSubmitting ? "Menyimpan..." : editId ? "Update Data" : "Simpan Pengeluaran"}
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
            <h3 className="text-xl font-black text-slate-900">Hapus pengeluaran?</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">Data “{deleteTarget.keterangan}” akan dihapus permanen dari daftar pengeluaran.</p>
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
    </main>
  );
}

function QuickButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm transition-colors hover:bg-slate-900 hover:text-white">
      {label}
    </button>
  );
}

function MiniMetricCard({ label, value, icon, color }: any) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-transform duration-300 hover:-translate-y-0.5">
      <div className={`shrink-0 rounded-lg p-2 ${color}`}>
        {React.cloneElement(icon, { size: 16 })}
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 truncate text-[9px] font-bold uppercase tracking-wider text-slate-400" title={label}>{label}</p>
        <p className="truncate text-[14px] font-black leading-none tracking-tight text-slate-900" title={value}>{value}</p>
      </div>
    </div>
  );
}

function TopCard({ title, value, icon, color, trend, current, previous }: any) {
  const colorMap: Record<string, { bg: string; text: string; hex: string }> = {
    red: { bg: "bg-red-50", text: "text-red-500", hex: "#EF4444" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-500", hex: "#10B981" },
    blue: { bg: "bg-blue-50", text: "text-blue-500", hex: "#3B82F6" },
    purple: { bg: "bg-purple-50", text: "text-purple-500", hex: "#8B5CF6" },
    orange: { bg: "bg-orange-50", text: "text-orange-500", hex: "#F97316" },
    slate: { bg: "bg-slate-100", text: "text-slate-600", hex: "#64748B" }
  };

  const theme = colorMap[color] || colorMap.slate;
  const delta = Number(previous || 0) > 0 ? ((Number(current || 0) - Number(previous || 0)) / Number(previous || 0)) * 100 : null;

  const sparklineOptions = {
    chart: {
      type: "line",
      sparkline: { enabled: true },
      animations: { enabled: true }
    },
    stroke: {
      curve: "smooth",
      width: 1.8
    },
    colors: [theme.hex],
    tooltip: {
      enabled: false
    }
  } as ApexOptions;

  return (
    <div className="flex min-h-[112px] min-w-0 flex-col justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${theme.bg} ${theme.text}`}>
          {React.cloneElement(icon, { size: 15 })}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-black leading-tight text-slate-500" title={title}>{title}</p>
          <h3 className="mt-1.5 truncate text-[18px] font-black leading-tight tracking-tight text-slate-950" title={value}>{value}</h3>
          {delta !== null && (
            <p className={`mt-1 text-[10px] font-black ${delta > 0 ? "text-red-500" : "text-emerald-500"}`}>
              {delta > 0 ? "Naik" : "Turun"} {Math.abs(delta).toFixed(1)}%
            </p>
          )}
        </div>
      </div>

      <div className="mt-2 h-6 w-full opacity-75">
        <ReactApexChart options={sparklineOptions} series={[{ data: trend }]} type="line" height={24} />
      </div>
    </div>
  );
}

function ProgressRow({ label, value, total }: { label: string; value: number; total: number }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const safePercentage = Math.max(0, Math.min(100, percentage));
  const formatRp = (angka: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(angka) || 0);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[12px]">
        <span className="font-bold text-slate-700">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-black text-slate-800">{formatRp(value)}</span>
          <span className="w-9 text-right text-[11px] font-bold text-slate-400">{percentage.toFixed(1)}%</span>
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner">
        <div className="h-full rounded-full bg-[#FF5722]" style={{ width: `${safePercentage}%` }} />
      </div>
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
        Warning Otomatis
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