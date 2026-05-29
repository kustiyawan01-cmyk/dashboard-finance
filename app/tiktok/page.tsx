"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2, Download, Package, Search, Store, Upload, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { cleanObjectKeys, cleanOrderId, formatDateDisplay, formatRupiah, parseCurrency, readCell, toISODate } from "@/app/lib/marketplaceFinance";
import { useAuth } from "@/app/context/AuthContext";

type SalesRow = {
  platform: "TikTok";
  orderId: string;
  order_id: string;
  date: string;
  orderDate: string;
  productName: string;
  product_name: string;
  variationName: string;
  marketplaceSku: string;
  sku: string;
  sellerSku: string;
  skuId: string;
  variationId: string;
  quantity: number;
  qty: number;
  amount: number;
  itemAmount: number;
  status: string;
  rawData?: unknown;
};

export default function TikTokPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<SalesRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [globalSearch, setGlobalSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [sortConfig, setSortConfig] = useState<{ key: keyof SalesRow; direction: "asc" | "desc" } | null>({ key: "date", direction: "desc" });

  const fetchOrders = async () => {
    setIsFetching(true);
    try {
      const res = await fetch("/api/tiktok");
      if (!res.ok) return;
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Gagal mengambil data penjualan TikTok.");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const detectHeaderRow = (rows: unknown[][]) => {
    for (let i = 0; i < Math.min(rows.length, 40); i++) {
      const text = String((rows[i] || []).join(" ")).toLowerCase().replace(/[^a-z0-9]/g, "");
      if ((text.includes("orderid") || text.includes("idpesanan")) && (text.includes("product") || text.includes("produk") || text.includes("sku"))) return i;
    }
    return -1;
  };

  const normalizeRows = (parsedRows: Record<string, unknown>[]) => parsedRows
    .map(cleanObjectKeys)
    .map((row): SalesRow | null => {
      const orderId = cleanOrderId(readCell(row, ["Order ID", "ID Pesanan", "No Pesanan", "Nomor Pesanan"]));
      if (!orderId || orderId.toLowerCase().includes("platform")) return null;

      const marketplaceSku = String(readCell(row, ["Seller SKU", "SKU Penjual", "SKU", "SKU PRODUK"]) || "").trim();
      const skuId = String(readCell(row, ["SKU ID", "ID SKU"]) || "").trim();
      const variationId = String(readCell(row, ["Variation ID", "ID Variasi", "Product Variation ID"]) || "").trim();
      const quantity = Number(readCell(row, ["Quantity", "Qty", "Jumlah"]) || 1) || 1;
      const amount = parseCurrency(readCell(row, ["Order Amount", "Total Harga", "Total Nilai Pesanan", "Subtotal", "Harga Setelah Diskon"]));
      const date = String(readCell(row, ["Order Create Time", "Created Time", "Waktu Pemesanan", "Waktu Pesanan Dibuat"]) || "-").trim();
      const productName = String(readCell(row, ["Product Name", "Nama Produk", "Nama Barang", "Item Name"]) || "Produk Tidak Diketahui").trim();
      const variationName = String(readCell(row, ["Variation", "Variation Name", "Nama Variasi", "Variasi Produk"]) || "-").trim();
      const status = String(readCell(row, ["Order Status", "Status Pesanan", "Status"]) || "Unknown").trim();

      return {
        platform: "TikTok",
        orderId,
        order_id: orderId,
        date,
        orderDate: date,
        productName,
        product_name: productName,
        variationName,
        marketplaceSku: marketplaceSku || skuId || variationId,
        sku: marketplaceSku || skuId || variationId,
        sellerSku: marketplaceSku,
        skuId,
        variationId,
        quantity,
        qty: quantity,
        amount,
        itemAmount: amount,
        status,
        rawData: row,
      };
    })
    .filter(Boolean) as SalesRow[];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const workbook = XLSX.read(event.target?.result, { type: "binary" });
        const rows: SalesRow[] = [];

        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
          const headerRowIndex = detectHeaderRow(rawRows);
          if (headerRowIndex === -1) return;
          const parsedRows = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex, defval: "" }) as Record<string, unknown>[];
          rows.push(...normalizeRows(parsedRows));
        });

        if (rows.length === 0) throw new Error("Tidak ada data item TikTok yang valid.");

        const res = await fetch("/api/tiktok", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orders: rows }),
        });
        if (!res.ok) throw new Error("Gagal simpan");
        toast.success("Data penjualan TikTok berhasil disimpan.");
        fetchOrders();
      } catch (error) {
        console.error(error);
        toast.error("Gagal membaca file. Upload file Data Pesanan / Order Detail TikTok dari Seller Center.");
      } finally {
        setIsUploading(false);
        e.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const uniqueStatuses = useMemo(() => Array.from(new Set(orders.map((order) => order.status || "Unknown"))), [orders]);

  const filteredOrders = useMemo(() => {
    const keyword = globalSearch.toLowerCase().trim();
    return orders.filter((order) => {
      const matchesSearch = !keyword || [order.orderId, order.productName, order.marketplaceSku, order.skuId, order.variationId].join(" ").toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === "Semua Status" || order.status === statusFilter;
      const orderDate = toISODate(order.date);
      const matchesDate = !dateRange.start || !dateRange.end || (orderDate >= dateRange.start && orderDate <= dateRange.end);
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [orders, globalSearch, statusFilter, dateRange]);

  const sortedOrders = useMemo(() => {
    const data = [...filteredOrders];
    if (!sortConfig) return data;
    data.sort((a, b) => {
      let aVal: string | number = a[sortConfig.key] as never;
      let bVal: string | number = b[sortConfig.key] as never;
      if (sortConfig.key === "date") {
        aVal = new Date(toISODate(aVal)).getTime() || 0;
        bVal = new Date(toISODate(bVal)).getTime() || 0;
      }
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    return data;
  }, [filteredOrders, sortConfig]);

  const summary = useMemo(() => {
    const totalQty = filteredOrders.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const totalAmount = filteredOrders.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const missingSku = filteredOrders.filter((item) => !item.marketplaceSku && !item.skuId && !item.variationId).length;
    const uniqueOrder = new Set(filteredOrders.map((item) => item.orderId)).size;
    return { totalItem: filteredOrders.length, uniqueOrder, totalQty, totalAmount, missingSku };
  }, [filteredOrders]);

  const requestSort = (key: keyof SalesRow) => {
    setSortConfig((prev) => ({ key, direction: prev?.key === key && prev.direction === "asc" ? "desc" : "asc" }));
  };

  const getSortIcon = (key: keyof SalesRow) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown size={14} className="opacity-40" />;
    return sortConfig.direction === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const exportData = () => {
    if (filteredOrders.length === 0) return toast.error("Tidak ada data untuk diexport.");
    const ws = XLSX.utils.json_to_sheet(filteredOrders.map((item) => ({
      Platform: item.platform,
      Tanggal: item.date,
      "Order ID": item.orderId,
      "Nama Produk": item.productName,
      Variasi: item.variationName,
      "SKU Marketplace": item.marketplaceSku,
      "SKU ID": item.skuId,
      "Variation ID": item.variationId,
      Qty: item.quantity,
      "Total Harga": item.amount,
      Status: item.status,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TikTok Sales Items");
    XLSX.writeFile(wb, "TikTok_Sales_Items.xlsx");
  };

  return (
    <main className="flex-1 bg-slate-50 min-h-screen text-slate-800 p-4 md:p-8 overflow-x-hidden">
      <header className="mb-6 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Store size={24} /> Data Penjualan TikTok</h2>
          <p className="text-sm text-slate-500 mt-1">Upload file order detail TikTok. Data disimpan sebagai item per produk agar multi-item order terbaca real.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={exportData} className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold flex justify-center items-center gap-2 hover:bg-slate-50"><Download size={16} /> Export</button>
          {user?.role === "admin" && (
            <label className="bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex justify-center items-center gap-2 cursor-pointer hover:bg-slate-800">
              <Upload size={16} /> {isUploading ? "Memproses..." : "Upload TikTok Sales"}
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
            </label>
          )}
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Metric title="Order" value={summary.uniqueOrder} />
        <Metric title="Item Baris" value={summary.totalItem} />
        <Metric title="Qty Terjual" value={summary.totalQty} />
        <Metric title="Omzet Item" value={formatRupiah(summary.totalAmount)} />
        <Metric title="SKU Kosong" value={summary.missingSku} danger={summary.missingSku > 0} />
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} placeholder="Cari order, produk, SKU..." className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:border-slate-900" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold bg-white">
            <option>Semua Status</option>
            {uniqueStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="date" value={dateRange.start} onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))} className="w-full px-3 py-3 rounded-xl border border-slate-200 text-sm" />
            <input type="date" value={dateRange.end} onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))} className="w-full px-3 py-3 rounded-xl border border-slate-200 text-sm" />
          </div>
        </div>

        <div className="overflow-auto max-h-[68vh]">
          <table className="w-full min-w-[1180px] text-left">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
              <tr>
                <Head title="Tanggal" onClick={() => requestSort("date")} icon={getSortIcon("date")} />
                <Head title="Order ID" />
                <Head title="SKU Marketplace" />
                <Head title="SKU ID" />
                <Head title="Nama Produk" />
                <Head title="Qty" onClick={() => requestSort("quantity")} icon={getSortIcon("quantity")} center />
                <Head title="Total" onClick={() => requestSort("amount")} icon={getSortIcon("amount")} right />
                <Head title="Status" center />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isFetching ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm font-bold text-slate-400">Memuat data...</td></tr>
              ) : sortedOrders.length > 0 ? sortedOrders.map((order) => (
                <tr key={`${order.orderId}-${order.marketplaceSku}-${order.skuId}-${order.productName}`} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{formatDateDisplay(order.date)}</td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-600">{order.orderId}</td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-800">{order.marketplaceSku || "-"}</td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-500">{order.skuId || order.variationId || "-"}</td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-800 max-w-[320px] truncate">{order.productName}</td>
                  <td className="px-4 py-3 text-sm font-bold text-center">{order.quantity}</td>
                  <td className="px-4 py-3 text-sm font-black text-right">{formatRupiah(order.amount)}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={order.status} /></td>
                </tr>
              )) : (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm font-bold text-slate-400">Belum ada data penjualan TikTok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Metric({ title, value, danger }: { title: string; value: string | number; danger?: boolean }) {
  return <div className={`bg-white rounded-2xl border p-4 shadow-sm ${danger ? "border-red-200" : "border-slate-200"}`}><p className={`text-[11px] font-black mb-1 ${danger ? "text-red-500" : "text-slate-500"}`}>{title}</p><h3 className="text-xl font-black text-slate-900">{value}</h3></div>;
}

function Head({ title, onClick, icon, center, right }: { title: string; onClick?: () => void; icon?: ReactNode; center?: boolean; right?: boolean }) {
  return <th onClick={onClick} className={`px-4 py-3 text-[11px] uppercase tracking-wider font-black text-slate-500 ${onClick ? "cursor-pointer hover:bg-slate-100" : ""} ${center ? "text-center" : right ? "text-right" : ""}`}><div className={`flex items-center gap-1 ${center ? "justify-center" : right ? "justify-end" : ""}`}>{title}{icon}</div></th>;
}

function StatusBadge({ status }: { status: string }) {
  const text = String(status || "Unknown").toUpperCase();
  const isDone = text.includes("SELESAI") || text.includes("COMPLETED") || text.includes("DELIVERED");
  const isCancel = text.includes("BATAL") || text.includes("CANCEL");
  return <span className={`px-2 py-1 rounded-full border text-[10px] font-black ${isDone ? "bg-emerald-50 text-emerald-700 border-emerald-200" : isCancel ? "bg-red-50 text-red-700 border-red-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>{status || "Unknown"}</span>;
}
