"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2, Download, Eye, Save, Search, Upload, WalletCards, X } from "lucide-react";
import toast from "react-hot-toast";
import { calculateOrderHpp, cleanOrderId, formatDateDisplay, formatRupiah, parseCurrency, toISODate, type ProductCostRow, type SalesItem } from "@/app/lib/marketplaceFinance";
import { useAuth } from "@/app/context/AuthContext";

type FinanceRow = {
  platform: "Shopee";
  orderId: string;
  orderStatus: string;
  createdDate: string;
  date: string;
  qty: number;
  productName: string;
  sku: string;
  revenue: number;
  subtotal: number;
  net: number;
  fees: number;
  hppPerItem: number;
  totalHpp: number;
  labaBersih: number;
  hppStatus: "Valid" | "Belum Mapping" | "Dikesampingkan - Batal/Retur";
  hppMissingSkus: string[];
  hppRule: string;
  isFinalProfit: boolean;
  orderItems: unknown[];
  shippingBuyer?: number;
  shippingSubsidy?: number;
  adjustment?: number;
  sellerDiscount?: number;
  platformFee?: number;
  paymentFee?: number;
  affiliateFee?: number;
  freeShippingFee?: number;
  tax?: number;
  codFee?: number;
  hargaProduk?: number;
  ongkirPembeli?: number;
  subsidiOngkir?: number;
  voucherShopee?: number;
  cashbackShopee?: number;
  penyesuaianSaldo?: number;
  codPembeli?: number;
  kompensasi?: number;
  admin?: number;
  layanan?: number;
  ongkirXtra?: number;
  cashbackXtra?: number;
  ams?: number;
  komisiAffiliate?: number;
  pajak?: number;
  biayaCod?: number;
  voucherPenjual?: number;
  cashbackPenjual?: number;
  shopeeAds?: number;
  penalti?: number;
  refund?: number;
  retur?: number;
  transfer?: number;
  materai?: number;
  penyesuaianSistem?: number;
  rawData?: unknown;
};

export default function FinanceShopeePage() {
  const { user } = useAuth();
  const [finances, setFinances] = useState<FinanceRow[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesItem[]>([]);
  const [products, setProducts] = useState<ProductCostRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [hppFilter, setHppFilter] = useState("Semua HPP");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [selectedOrder, setSelectedOrder] = useState<FinanceRow | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof FinanceRow; direction: "asc" | "desc" } | null>({ key: "date", direction: "desc" });

  const fetchData = async () => {
    try {
      const [salesRes, financeRes, productRes] = await Promise.all([
        fetch("/api/shopee"),
        fetch("/api/finance-shopee"),
        fetch("/api/products"),
      ]);
      if (salesRes.ok) setSalesOrders(await salesRes.json());
      if (financeRes.ok) {
        const data = await financeRes.json();
        setFinances(Array.isArray(data) ? data : []);
      }
      if (productRes.ok) setProducts(await productRes.json());
    } catch {
      toast.error("Gagal mengambil data Shopee / master produk.");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isSameOrderId = (left: unknown, right: unknown) => {
    const leftRaw = String(left || "").trim();
    const rightRaw = String(right || "").trim();
    const leftClean = cleanOrderId(leftRaw);
    const rightClean = cleanOrderId(rightRaw);
    return leftRaw === rightRaw || (leftClean !== "" && rightClean !== "" && leftClean === rightClean);
  };

  const getProductsForHpp = () => {
    const targetPlatform = "Shopee";
    const normalizedTarget = targetPlatform.toLowerCase();

    return products.flatMap((item) => {
      const row = item as any;
      const productPlatforms = Array.isArray(row.platforms) ? row.platforms.map((platform: unknown) => String(platform || "").toLowerCase()) : [];
      const productPlatform = String(row.platform || "").toLowerCase();
      const sku = String(row.sku || row.internalSku || row.marketplaceSku || row.marketplaceSkuId || row.marketplaceVariationId || "").trim();
      const alreadyTarget = productPlatform === normalizedTarget || productPlatforms.includes(normalizedTarget);
      const isInternal = !productPlatform || productPlatform === "internal" || productPlatforms.includes("internal");

      const baseItem = {
        ...row,
        sku: row.sku || sku,
        internalSku: row.internalSku || sku,
        marketplaceSku: row.marketplaceSku || sku,
        marketplaceSkuId: row.marketplaceSkuId || sku,
        marketplaceVariationId: row.marketplaceVariationId || sku
      } as ProductCostRow;

      if (alreadyTarget) return [baseItem];
      if (!isInternal) return [baseItem];

      return [
        baseItem,
        {
          ...baseItem,
          platform: targetPlatform,
          platforms: Array.from(new Set([...(Array.isArray(row.platforms) ? row.platforms : []), targetPlatform]))
        } as ProductCostRow
      ];
    });
  };

  const hydrateDetailOrder = (item: FinanceRow): FinanceRow => {
    const matchedSalesItems = salesOrders.filter((sales: any) => {
      const salesOrderId = sales.orderId || sales.order_id || sales.noPesanan || sales.no_pesanan || sales.idPesanan || sales.id_pesanan;
      return isSameOrderId(salesOrderId, item.orderId);
    });

    const sourceItems = matchedSalesItems.length > 0
      ? matchedSalesItems
      : Array.isArray(item.orderItems)
        ? item.orderItems
        : [];

    const detailItems = sourceItems.map((row: any) => ({
      ...row,
      productName: String(row.productName || row.product_name || row.namaProduk || row.nama_produk || row.name || item.productName || "").trim(),
      sku: String(row.marketplaceSku || row.sku || row.sellerSku || row.seller_sku || row.skuId || row.sku_id || item.sku || "").trim(),
      quantity: Number(row.quantity || row.qty || row.jumlah || 1) || 1,
      hppPerItem: Number(row.hppPerItem || row.hpp_per_item || 0) || 0,
      totalHpp: Number(row.totalHpp || row.total_hpp || 0) || 0
    }));

    const productNames = Array.from(new Set(detailItems.map((row: any) => String(row.productName || "").trim()).filter((value) => value && value !== "-")));
    const skus = Array.from(new Set(detailItems.map((row: any) => String(row.sku || "").trim()).filter((value) => value && value !== "-")));

    return {
      ...item,
      productName: productNames.length > 0 ? productNames.join(", ") : (item.productName && item.productName !== "-" ? item.productName : "Tidak Diketahui"),
      sku: skus.length > 0 ? skus.join(", ") : (item.sku && item.sku !== "-" ? item.sku : "-"),
      orderItems: detailItems.length > 0 ? detailItems : item.orderItems
    };
  };

  const findHeader = (rows: unknown[][]) => {
    for (let i = 0; i < Math.min(rows.length, 60); i++) {
      const text = String((rows[i] || []).join(" ")).toLowerCase().replace(/[^a-z0-9]/g, "");
      if ((text.includes("nopesanan") || text.includes("orderid")) && (text.includes("totalpenghasilan") || text.includes("danadilepaskan") || text.includes("biayaadministrasi"))) return i;
    }
    return -1;
  };

  const rowsFromWorkbook = (workbook: XLSX.WorkBook) => {
    for (const sheetName of workbook.SheetNames) {
      const sheetRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: false, defval: "" }) as unknown[][];
      if (findHeader(sheetRows) !== -1) return sheetRows;
    }
    return [];
  };

  const normalizeHeader = (value: unknown) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const findIdx = (headers: string[], names: string[]) => headers.findIndex((header) => names.some((name) => normalizeHeader(header) === normalizeHeader(name) || normalizeHeader(header).includes(normalizeHeader(name))));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const workbook = XLSX.read(event.target?.result, { type: "binary" });
        const rows = rowsFromWorkbook(workbook);
        const headerIdx = findHeader(rows);
        if (headerIdx === -1) throw new Error("Header finance Shopee tidak ditemukan.");

        const headers = (rows[headerIdx] || []).map((item) => String(item || "").trim());
        const iID = findIdx(headers, ["no. pesanan", "no pesanan", "order id", "id pesanan"]);
        const iStatus = findIdx(headers, ["status", "status pesanan"]);
        const iRevenue = findIdx(headers, ["harga asli produk", "total harga produk", "harga produk", "total pembayaran"]);
        const iNet = findIdx(headers, ["total penghasilan", "dana dilepaskan", "jumlah dana dilepaskan"]);
        const iFee = findIdx(headers, ["biaya administrasi", "biaya layanan", "total biaya", "biaya platform"]);
        const iOngkirPembeli = findIdx(headers, ["ongkir dibayar pembeli"]);
        const iSubsidiOngkir = findIdx(headers, ["gratis ongkir dari shopee", "subsidi ongkos kirim shopee", "diskon ongkir ditanggung jasa kirim"]);
        const iVoucherShopee = findIdx(headers, ["diskon produk dari shopee", "voucher ditanggung shopee"]);
        const iCashbackShopee = findIdx(headers, ["cashback shopee"]);
        const iPenyesuaianSaldo = findIdx(headers, ["penyesuaian saldo"]);
        const iCodPembeli = findIdx(headers, ["biaya cod dibayar pembeli"]);
        const iKompensasi = findIdx(headers, ["kompensasi shopee", "kompensasi"]);
        const iAdmin = findIdx(headers, ["biaya administrasi"]);
        const iLayanan = findIdx(headers, ["biaya layanan"]);
        const iOngkirXtra = findIdx(headers, ["biaya program hemat biaya kirim", "biaya program gratis ongkir xtra"]);
        const iCashbackXtra = findIdx(headers, ["biaya kampanye", "biaya cashback xtra"]);
        const iAms = findIdx(headers, ["biaya komisi ams", "biaya affiliate marketing solution"]);
        const iKomisiAffiliate = findIdx(headers, ["komisi shopee affiliate"]);
        const iPajak = findIdx(headers, ["bea masuk, ppn & pph", "pajak"]);
        const iBiayaCod = findIdx(headers, ["biaya cod", "biaya penanganan"]);
        const iVoucherPenjual = findIdx(headers, ["voucher disponsori oleh penjual", "voucher ditanggung penjual", "total diskon produk"]);
        const iCashbackPenjual = findIdx(headers, ["cashback koin co-fund disponsori penjual", "cashback ditanggung penjual"]);
        const iShopeeAds = findIdx(headers, ["biaya iklan", "shopee ads"]);
        const iPenalti = findIdx(headers, ["penalti", "denda"]);
        const iRetur = findIdx(headers, ["ongkos kirim pengembalian barang", "retur barang"]);
        const iTransfer = findIdx(headers, ["biaya transfer"]);
        const iMaterai = findIdx(headers, ["biaya materai"]);
        const iPenyesuaianSistem = findIdx(headers, ["penyesuaian sistem"]);
        const iDate = findIdx(headers, ["tanggal dana dilepaskan", "waktu penyelesaian", "tanggal penyelesaian"]);
        const iCreatedDate = findIdx(headers, ["waktu pesanan dibuat", "tanggal pesanan dibuat", "order created time"]);
        const iSubtotal = findIdx(headers, ["harga asli produk", "total pembayaran", "subtotal produk"]);
        const iSku = findIdx(headers, ["nomor referensi sku", "sku referensi", "seller sku", "sku penjual", "sku"]);
        const iQty = findIdx(headers, ["jumlah", "quantity", "qty"]);
        const iName = findIdx(headers, ["nama produk", "product name", "item name", "nama barang"]);
        const iRefund = findIdx(headers, ["jumlah pengembalian dana ke pembeli", "refund pembeli", "retur", "pengembalian"]);

        if (iID === -1 || iNet === -1) throw new Error("File ini bukan laporan Penghasilan Shopee yang valid.");

        const finalData: FinanceRow[] = [];
        for (let i = headerIdx + 1; i < rows.length; i++) {
          const row = rows[i] || [];
          const orderId = cleanOrderId(row[iID]);
          if (!orderId || orderId.length < 6) continue;

          const revenue = parseCurrency(row[iRevenue]);
          const net = parseCurrency(row[iNet]);
          const rawFee = Math.abs(parseCurrency(row[iFee]));
          const ongkirPembeli = parseCurrency(row[iOngkirPembeli]);
          const subsidiOngkir = parseCurrency(row[iSubsidiOngkir]);
          const voucherShopee = parseCurrency(row[iVoucherShopee]);
          const cashbackShopee = parseCurrency(row[iCashbackShopee]);
          const penyesuaianSaldo = parseCurrency(row[iPenyesuaianSaldo]);
          const codPembeli = parseCurrency(row[iCodPembeli]);
          const kompensasi = parseCurrency(row[iKompensasi]);
          const admin = Math.abs(parseCurrency(row[iAdmin]));
          const layanan = Math.abs(parseCurrency(row[iLayanan]));
          const ongkirXtra = Math.abs(parseCurrency(row[iOngkirXtra]));
          const cashbackXtra = Math.abs(parseCurrency(row[iCashbackXtra]));
          const ams = Math.abs(parseCurrency(row[iAms]));
          const komisiAffiliate = Math.abs(parseCurrency(row[iKomisiAffiliate]));
          const pajak = Math.abs(parseCurrency(row[iPajak]));
          const biayaCod = Math.abs(parseCurrency(row[iBiayaCod]));
          const voucherPenjual = Math.abs(parseCurrency(row[iVoucherPenjual]));
          const cashbackPenjual = Math.abs(parseCurrency(row[iCashbackPenjual]));
          const shopeeAds = Math.abs(parseCurrency(row[iShopeeAds]));
          const penalti = Math.abs(parseCurrency(row[iPenalti]));
          const retur = Math.abs(parseCurrency(row[iRetur]));
          const transfer = Math.abs(parseCurrency(row[iTransfer]));
          const materai = Math.abs(parseCurrency(row[iMaterai]));
          const penyesuaianSistem = Math.abs(parseCurrency(row[iPenyesuaianSistem]));
          const date = String(row[iDate] || "-").trim();
          const createdDate = String(row[iCreatedDate] || date || "-").trim();
          const subtotal = parseCurrency(row[iSubtotal]);
          const sku = String(row[iSku] || "").trim();
          const qty = Number(row[iQty] || 1) || 1;
          const productName = String(row[iName] || "-").trim();
          const refundAmount = Math.abs(parseCurrency(row[iRefund]));

          let status = String(row[iStatus] || "Selesai");
          const matchingSales = salesOrders.find((item) => cleanOrderId(item.orderId || item.order_id || item.noPesanan || item.no_pesanan) === orderId);
          if (refundAmount > 0) status = "Retur / Refund";
          else if (net === 0 && revenue === 0 && rawFee === 0) status = "Batal";
          else if (matchingSales?.status) status = String(matchingSales.status);

          const hpp = calculateOrderHpp({
            salesOrders,
            products: getProductsForHpp(),
            platform: "Shopee",
            orderId,
            orderDate: toISODate(createdDate || date),
            status,
            net,
            refundAmount,
            fallback: { orderId, orderDate: createdDate, productName, marketplaceSku: sku, skuId: sku, quantity: qty, itemAmount: subtotal, status },
          });

          const finalFees = hpp.hppStatus === "Dikesampingkan - Batal/Retur" ? 0 : (revenue - net || rawFee);
          const labaBersih = hpp.isFinalProfit ? net - hpp.totalHpp : 0;
          const totalQty = hpp.orderItems.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0) || qty;

          finalData.push({
            platform: "Shopee",
            orderId,
            orderStatus: status,
            createdDate,
            date,
            qty: totalQty,
            productName,
            sku,
            revenue,
            subtotal,
            net,
            fees: finalFees,
            hargaProduk: revenue,
            ongkirPembeli,
            subsidiOngkir,
            voucherShopee,
            cashbackShopee,
            penyesuaianSaldo,
            codPembeli,
            kompensasi,
            admin,
            layanan,
            ongkirXtra,
            cashbackXtra,
            ams,
            komisiAffiliate,
            pajak,
            biayaCod,
            voucherPenjual,
            cashbackPenjual,
            shopeeAds,
            penalti,
            refund: refundAmount,
            retur,
            transfer,
            materai,
            penyesuaianSistem,
            hppPerItem: hpp.hppPerItem,
            totalHpp: hpp.totalHpp,
            labaBersih,
            hppStatus: hpp.hppStatus,
            hppMissingSkus: hpp.hppMissingSkus,
            hppRule: hpp.hppRule,
            isFinalProfit: hpp.isFinalProfit,
            orderItems: hpp.orderItems,
            rawData: Object.fromEntries(headers.map((header, idx) => [header, row[idx]])),
          });
        }

        if (finalData.length === 0) throw new Error("Tidak ada data finance Shopee valid.");
        setFinances((prev) => {
          const map = new Map<string, FinanceRow>();
          [...prev, ...finalData].forEach((item) => map.set(item.orderId, item));
          return Array.from(map.values());
        });
        const missing = finalData.filter((item) => item.hppStatus === "Belum Mapping").length;
        if (missing > 0) toast.error(`${missing} transaksi HPP belum mapping. Lengkapi Master HPP dulu.`);
        else toast.success("Finance Shopee berhasil dibaca dan HPP valid.");
      } catch (error) {
        console.error(error);
        toast.error("Gagal membaca file. Upload laporan Penghasilan Shopee, bukan laporan pesanan.");
      } finally {
        setIsUploading(false);
        e.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveToDatabase = async () => {
    if (finances.length === 0) return toast.error("Belum ada data untuk disimpan.");
    const missing = finances.filter((item) => item.hppStatus === "Belum Mapping");
    if (missing.length > 0) return toast.error(`Ada ${missing.length} transaksi HPP belum mapping. Jangan simpan sebelum dilengkapi.`);
    setIsSaving(true);
    try {
      const res = await fetch("/api/finance-shopee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finances),
      });
      if (!res.ok) throw new Error("Gagal simpan");
      toast.success("Finance Shopee berhasil disimpan.");
      fetchData();
    } catch {
      toast.error("Gagal menyimpan finance Shopee.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecalculateHpp = () => {
    if (finances.length === 0) return toast.error("Belum ada data finance untuk dihitung ulang.");
    if (products.length === 0) return toast.error("Master HPP produk masih kosong.");

    const recalculated = finances.map((item) => {
      const refundAmount = Math.abs(Number(item.refund || item.retur || 0)) || 0;
      const hpp = calculateOrderHpp({
        salesOrders,
        products,
        platform: "Shopee",
        orderId: item.orderId,
        orderDate: toISODate(item.createdDate || item.date),
        status: item.orderStatus,
        net: item.net,
        refundAmount,
        fallback: {
          orderId: item.orderId,
          orderDate: item.createdDate || item.date,
          productName: item.productName,
          marketplaceSku: item.sku,
          skuId: item.sku,
          variationId: item.sku,
          quantity: item.qty || 1,
          itemAmount: item.subtotal || item.revenue || item.hargaProduk || item.net,
          status: item.orderStatus
        }
      });

      return {
        ...item,
        hppPerItem: hpp.hppPerItem,
        totalHpp: hpp.totalHpp,
        labaBersih: hpp.isFinalProfit ? item.net - hpp.totalHpp : 0,
        hppStatus: hpp.hppStatus,
        hppMissingSkus: hpp.hppMissingSkus,
        hppRule: hpp.hppRule,
        isFinalProfit: hpp.isFinalProfit,
        orderItems: hpp.orderItems
      };
    });

    setFinances(recalculated);

    const missing = recalculated.filter((item) => item.hppStatus === "Belum Mapping").length;
    if (missing > 0) toast.error(`${missing} transaksi masih HPP kosong.`);
    else toast.success("Semua HPP Shopee berhasil dihitung ulang.");
  };

  const filtered = useMemo(() => {
    const keyword = globalSearch.toLowerCase().trim();
    return finances.filter((item) => {
      const orderDate = toISODate(item.date || item.createdDate);
      const matchesSearch = !keyword || [item.orderId, item.productName, item.sku, (Array.isArray(item.hppMissingSkus) ? item.hppMissingSkus.join(" ") : "")].join(" ").toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === "Semua Status" || item.orderStatus === statusFilter;
      const matchesHpp = hppFilter === "Semua HPP" || item.hppStatus === hppFilter;
      const matchesDate =
        (!dateRange.start || orderDate >= dateRange.start) &&
        (!dateRange.end || orderDate <= dateRange.end);
      return matchesSearch && matchesStatus && matchesHpp && matchesDate;
    });
  }, [finances, globalSearch, statusFilter, hppFilter, dateRange]);

  const sorted = useMemo(() => {
    const data = [...filtered];
    if (!sortConfig) return data;
    data.sort((a, b) => {
      let aVal: any = a[sortConfig.key];
      let bVal: any = b[sortConfig.key];
      if (sortConfig.key === "date" || sortConfig.key === "createdDate") {
        aVal = new Date(toISODate(aVal)).getTime() || 0;
        bVal = new Date(toISODate(bVal)).getTime() || 0;
      }
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    return data;
  }, [filtered, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginated = sorted.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [globalSearch, statusFilter, hppFilter, dateRange.start, dateRange.end, itemsPerPage]);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const generatePagination = () => {
    const pages: Array<number | string> = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (safeCurrentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (safeCurrentPage >= totalPages - 3) {
      pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, "...", totalPages);
    }
    return pages;
  };

  const summary = useMemo(() => {
    const totalRevenue = filtered.reduce((sum, item) => sum + Number(item.revenue || item.hargaProduk || item.subtotal || 0), 0);
    const totalNet = filtered.reduce((sum, item) => sum + Number(item.net || 0), 0);
    const totalFees = filtered.reduce((sum, item) => sum + Number(item.fees || 0), 0);
    const totalHpp = filtered.reduce((sum, item) => sum + Number(item.totalHpp || 0), 0);
    const totalProfit = filtered.reduce((sum, item) => sum + Number(item.labaBersih || 0), 0);
    const missing = filtered.filter((item) => item.hppStatus === "Belum Mapping").length;
    const returOrder = filtered.filter((item) => {
      const status = String(item.orderStatus || "").toLowerCase();
      return status.includes("retur") || status.includes("refund");
    }).length;
    const batalOrder = filtered.filter((item) => String(item.orderStatus || "").toLowerCase().includes("batal")).length;
    const marginPercent = totalNet > 0 ? (totalProfit / totalNet) * 100 : 0;

    return {
      totalRevenue,
      totalNet,
      totalFees,
      totalHpp,
      totalProfit,
      missing,
      totalOrder: filtered.length,
      returOrder,
      batalOrder,
      marginPercent
    };
  }, [filtered]);

  const statuses = useMemo(() => Array.from(new Set(finances.map((item) => item.orderStatus))), [finances]);

  const requestSort = (key: keyof FinanceRow) => setSortConfig((prev) => ({ key, direction: prev?.key === key && prev.direction === "asc" ? "desc" : "asc" }));
  const sortIcon = (key: keyof FinanceRow) => !sortConfig || sortConfig.key !== key ? <ArrowUpDown size={14} /> : sortConfig.direction === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />;

  const exportMissingHpp = () => {
    const data = finances.filter((item) => item.hppStatus === "Belum Mapping");
    if (data.length === 0) return toast.success("Tidak ada HPP belum mapping.");
    const ws = XLSX.utils.json_to_sheet(data.map((item) => ({
      Platform: item.platform,
      "Order ID": item.orderId,
      "Tanggal": item.createdDate,
      "SKU Belum Mapping": (Array.isArray(item.hppMissingSkus) ? item.hppMissingSkus.join(", ") : ""),
      "Nama Produk": item.productName,
      Qty: item.qty,
      Net: item.net,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HPP Belum Mapping");
    XLSX.writeFile(wb, "Shopee_HPP_Belum_Mapping.xlsx");
  };

  return (
    <main className="flex-1 bg-slate-50 min-h-screen text-slate-800 p-4 md:p-8 overflow-x-hidden">
      <header className="mb-6 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2"><WalletCards size={24} /> Finance Shopee</h2>
          <p className="text-sm text-slate-500 mt-1">Profit dihitung dari laporan penghasilan Shopee + sales item + master HPP platform/SKU/tanggal berlaku.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={exportMissingHpp} className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold flex justify-center items-center gap-2 hover:bg-slate-50"><Download size={16} /> Export HPP Kosong</button>
          <button onClick={handleRecalculateHpp} disabled={finances.length === 0} className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold flex justify-center items-center gap-2 hover:bg-slate-50 disabled:opacity-50"><CheckCircle2 size={16} /> Hitung Ulang HPP</button>
          {user?.role === "admin" && <button onClick={handleSaveToDatabase} disabled={isSaving || finances.length === 0} className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex justify-center items-center gap-2 disabled:opacity-50 hover:bg-emerald-700"><Save size={16} /> {isSaving ? "Menyimpan..." : "Simpan Finance"}</button>}
          {user?.role === "admin" && <label className="bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex justify-center items-center gap-2 cursor-pointer hover:bg-slate-800"><Upload size={16} /> {isUploading ? "Memproses..." : "Upload Finance Shopee"}<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} /></label>}
        </div>
      </header>

      {summary.missing > 0 && <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm font-bold flex items-center gap-2"><AlertTriangle size={18} /> Ada {summary.missing} transaksi yang HPP-nya belum mapping. Lengkapi Master HPP sebelum menyimpan.</div>}

      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Metric title="Order" value={summary.totalOrder} tone="blue" />
        <Metric title="Omzet" value={formatRupiah(summary.totalRevenue)} tone="slate" />
        <Metric title="Dana Cair" value={formatRupiah(summary.totalNet)} tone="green" />
        <Metric title="Potongan" value={formatRupiah(summary.totalFees)} tone="red" />
        <Metric title="Total HPP" value={formatRupiah(summary.totalHpp)} tone="orange" />
        <Metric title="Profit Final" value={formatRupiah(summary.totalProfit)} tone={summary.totalProfit < 0 ? "red" : "green"} />
        <Metric title="Margin" value={`${summary.marginPercent.toFixed(1)}%`} tone={summary.marginPercent < 0 ? "red" : "green"} />
        <Metric title="Retur / Refund" value={summary.returOrder + summary.batalOrder} tone={(summary.returOrder + summary.batalOrder) > 0 ? "red" : "green"} />
        <Metric title="HPP Kosong" value={summary.missing} tone={summary.missing > 0 ? "red" : "green"} />
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 grid grid-cols-1 xl:grid-cols-[1fr_auto_auto_auto] gap-3">
          <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} placeholder="Cari order, SKU, produk..." className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:border-slate-900" /></div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold bg-white"><option>Semua Status</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select>
          <select value={hppFilter} onChange={(e) => setHppFilter(e.target.value)} className="px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold bg-white"><option>Semua HPP</option><option>Valid</option><option>Belum Mapping</option><option>Dikesampingkan - Batal/Retur</option></select>
          <div className="flex gap-2"><input type="date" value={dateRange.start} onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))} className="w-full px-3 py-3 rounded-xl border border-slate-200 text-sm" /><input type="date" value={dateRange.end} onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))} className="w-full px-3 py-3 rounded-xl border border-slate-200 text-sm" /></div>
        </div>
        <div className="overflow-auto max-h-[68vh] min-h-[420px]">
          <table className="w-full min-w-[1320px] text-left">
            <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur border-b border-slate-200 shadow-sm">
              <tr><Head title="Tanggal" onClick={() => requestSort("date")} icon={sortIcon("date")} /><Head title="Order ID" /><Head title="Status" /><Head title="Item" right /><Head title="Net" right onClick={() => requestSort("net")} icon={sortIcon("net")} /><Head title="Potongan" right /><Head title="HPP" right /><Head title="Profit" right /><Head title="Status HPP" /><Head title="SKU Belum Mapping" /><Head title="Aksi" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {sorted.length > 0 ? paginated.map((item) => (
                <tr key={item.orderId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{formatDateDisplay(item.date)}</td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-700">{item.orderId}</td>
                  <td className="px-4 py-3"><StatusBadge status={item.orderStatus} /></td>
                  <td className="px-4 py-3 text-sm font-bold text-right">{item.qty}</td>
                  <td className="px-4 py-3 text-sm font-black text-right">{formatRupiah(item.net)}</td>
                  <td className="px-4 py-3 text-sm font-black text-right text-red-600">{formatRupiah(item.fees)}</td>
                  <td className="px-4 py-3 text-sm font-black text-right">{formatRupiah(item.totalHpp)}</td>
                  <td className={`px-4 py-3 text-sm font-black text-right ${item.isFinalProfit ? (item.labaBersih < 0 ? "text-red-600" : "text-emerald-600") : "text-slate-400"}`}>{item.isFinalProfit ? formatRupiah(item.labaBersih) : "-"}</td>
                  <td className="px-4 py-3"><HppBadge status={item.hppStatus} /></td>
                  <td className="px-4 py-3 text-xs text-red-600 max-w-[220px] truncate">{Array.isArray(item.hppMissingSkus) && item.hppMissingSkus.length > 0 ? item.hppMissingSkus.join(", ") : "-"}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelectedOrder(hydrateDetailOrder(item))} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-900 hover:text-white transition-colors">
                      <Eye size={13} /> Detail
                    </button>
                  </td>
                </tr>
              )) : <tr><td colSpan={11} className="px-4 py-12 text-center text-sm font-bold text-slate-400">Belum ada data finance Shopee.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <p className="text-xs font-bold text-slate-500">
                Menampilkan {sorted.length === 0 ? 0 : startIndex + 1} - {Math.min(endIndex, sorted.length)} dari {sorted.length} data
              </p>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
                Tampilkan
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 outline-none focus:border-slate-900"
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                / halaman
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage === 1}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Awal
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={safeCurrentPage === 1}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Prev
              </button>

              <div className="flex items-center gap-1">
                {generatePagination().map((page, idx) => (
                  <button
                    key={`${page}-${idx}`}
                    onClick={() => typeof page === "number" && setCurrentPage(page)}
                    disabled={page === "..."}
                    className={`min-w-9 rounded-lg px-3 py-2 text-xs font-black transition-colors ${
                      safeCurrentPage === page
                        ? "bg-slate-900 text-white"
                        : page === "..."
                          ? "cursor-default text-slate-400"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={safeCurrentPage === totalPages}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage === totalPages}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Akhir
              </button>
            </div>
          </div>
        </div>
      </section>
      {selectedOrder && <DetailModal item={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    </main>
  );
}

function Metric({ title, value, tone = "slate" }: { title: string; value: string | number; tone?: "slate" | "blue" | "green" | "orange" | "red" }) {
  const styles = {
    slate: "border-slate-200 bg-white text-slate-900 ring-slate-100",
    blue: "border-blue-200 bg-blue-50 text-blue-700 ring-blue-100",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-100",
    orange: "border-orange-200 bg-orange-50 text-orange-700 ring-orange-100",
    red: "border-red-200 bg-red-50 text-red-700 ring-red-100",
  };

  const labelStyles = {
    slate: "text-slate-500",
    blue: "text-blue-600",
    green: "text-emerald-600",
    orange: "text-orange-600",
    red: "text-red-600",
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ring-1 transition-all hover:-translate-y-0.5 hover:shadow-md ${styles[tone]}`}>
      <p className={`text-[11px] font-black mb-1 ${labelStyles[tone]}`}>{title}</p>
      <h3 className="text-xl font-black">{value}</h3>
    </div>
  );
}

function Head({ title, onClick, icon, right }: { title: string; onClick?: () => void; icon?: ReactNode; right?: boolean }) {
  return <th onClick={onClick} className={`px-4 py-3 text-[11px] uppercase tracking-wider font-black text-slate-500 ${onClick ? "cursor-pointer hover:bg-slate-100" : ""} ${right ? "text-right" : ""}`}><div className={`flex items-center gap-1 ${right ? "justify-end" : ""}`}>{title}{icon}</div></th>;
}

function StatusBadge({ status }: { status: string }) {
  const text = String(status || "").toLowerCase();
  const cls = text.includes("batal") || text.includes("cancel") ? "bg-red-50 text-red-700 border-red-200" : text.includes("retur") || text.includes("refund") ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200";
  return <span className={`px-2 py-1 rounded-full border text-[10px] font-black ${cls}`}>{status}</span>;
}

function HppBadge({ status }: { status: string }) {
  const cls = status === "Valid" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : status === "Belum Mapping" ? "bg-red-50 text-red-700 border-red-200" : "bg-slate-50 text-slate-600 border-slate-200";
  return <span className={`px-2 py-1 rounded-full border text-[10px] font-black ${cls}`}>{status}</span>;
}

function DetailModal({ item, onClose }: { item: FinanceRow; onClose: () => void }) {
  const isTikTok = String(item.platform) === "TikTok";
  const isFinal = Boolean(item.isFinalProfit);
  const profitTone = !isFinal ? "text-slate-500" : item.labaBersih < 0 ? "text-red-600" : "text-emerald-600";
  const profitBg = !isFinal ? "bg-slate-50 border-slate-200" : item.labaBersih < 0 ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100";
  const totalPendapatan = Number(item.revenue || item.hargaProduk || item.subtotal || 0);
  const missingSkus = Array.isArray(item.hppMissingSkus) && item.hppMissingSkus.length > 0 ? item.hppMissingSkus.join(", ") : "-";

  const pemasukanRows = isTikTok ? [
    ["Subtotal pesanan", item.subtotal],
    ["Diskon dari penjual", -(Number(item.sellerDiscount) || 0)],
    ["Penyesuaian", item.adjustment],
  ] : [
    ["Harga produk", item.hargaProduk || item.revenue],
    ["Ongkir dibayar pembeli", item.ongkirPembeli],
    ["Subsidi ongkir marketplace", item.subsidiOngkir],
    ["Voucher marketplace", item.voucherShopee],
    ["Cashback marketplace", item.cashbackShopee],
    ["Penyesuaian saldo", item.penyesuaianSaldo],
    ["COD dibayar pembeli", item.codPembeli],
    ["Kompensasi", item.kompensasi],
  ];

  const tiktokPenalty = Number(item.adjustment || 0) < 0 ? Math.abs(Number(item.adjustment || 0)) : 0;
  const tiktokKnownPotongan =
    Math.abs(Number(item.platformFee || 0)) +
    Math.abs(Number(item.affiliateFee || 0)) +
    Math.abs(Number(item.freeShippingFee || 0)) +
    Math.abs(Number(item.paymentFee || 0)) +
    Math.abs(Number(item.tax || 0)) +
    Math.abs(Number(item.codFee || 0)) +
    tiktokPenalty;

  const tiktokOngkirPenjual = Math.max(0, Math.abs(Number(item.fees || 0)) - tiktokKnownPotongan);

  const shopeeKnownPotongan =
    Math.abs(Number(item.admin || 0)) +
    Math.abs(Number(item.layanan || 0)) +
    Math.abs(Number(item.ongkirXtra || 0)) +
    Math.abs(Number(item.cashbackXtra || 0)) +
    Math.abs(Number(item.ams || 0)) +
    Math.abs(Number(item.komisiAffiliate || 0)) +
    Math.abs(Number(item.pajak || 0)) +
    Math.abs(Number(item.biayaCod || 0)) +
    Math.abs(Number(item.voucherPenjual || 0)) +
    Math.abs(Number(item.cashbackPenjual || 0)) +
    Math.abs(Number(item.shopeeAds || 0)) +
    Math.abs(Number(item.penalti || 0)) +
    Math.abs(Number(item.refund || 0)) +
    Math.abs(Number(item.retur || 0)) +
    Math.abs(Number(item.transfer || 0)) +
    Math.abs(Number(item.materai || 0)) +
    Math.abs(Number(item.penyesuaianSistem || 0));

  const shopeePotonganLainnya = Math.max(0, Math.abs(Number(item.fees || 0)) - shopeeKnownPotongan);

  const potonganRows = isTikTok ? [
    ["Biaya Platform", item.platformFee],
    ["Biaya Administrasi", 0],
    ["Biaya Komisi Affiliate", item.affiliateFee],
    ["Biaya Ongkir Penjual", tiktokOngkirPenjual],
    ["Biaya Program Gratis Ongkir", item.freeShippingFee],
    ["Biaya Pembayaran / Payment Fee", item.paymentFee],
    ["Pajak (PPN/PPh)", item.tax],
    ["Biaya COD", item.codFee],
    ["Biaya Retur / Refund", item.refund],
    ["Penalti / Denda", tiktokPenalty],
    ["Biaya Affiliate Extra", 0],
  ] : [
    ["Biaya Administrasi", item.admin],
    ["Biaya Layanan", item.layanan],
    ["Biaya Program Gratis Ongkir", item.ongkirXtra],
    ["Biaya Cashback / Kampanye", item.cashbackXtra],
    ["AMS / Affiliate Marketing Solution", item.ams],
    ["Komisi Shopee Affiliate", item.komisiAffiliate],
    ["Pajak / Bea Masuk / PPN / PPH", item.pajak],
    ["Biaya COD", item.biayaCod],
    ["Voucher Ditanggung Penjual", item.voucherPenjual],
    ["Cashback Ditanggung Penjual", item.cashbackPenjual],
    ["Shopee Ads", item.shopeeAds],
    ["Penalti / Denda", item.penalti],
    ["Refund Pembeli", item.refund],
    ["Retur Barang", item.retur],
    ["Biaya Transfer", item.transfer],
    ["Biaya Materai", item.materai],
    ["Penyesuaian Sistem", item.penyesuaianSistem],
    ["Potongan Lain / Selisih Laporan", shopeePotonganLainnya],
  ];

  const orderItems = Array.isArray(item.orderItems) ? item.orderItems : [];
  const detailProductNames = Array.from(new Set(orderItems.map((row: any) => String(row.productName || row.product_name || row.namaProduk || row.nama_produk || row.name || "").trim()).filter((value) => value && value !== "-")));
  const detailSkus = Array.from(new Set(orderItems.map((row: any) => String(row.sku || row.marketplaceSku || row.sellerSku || row.seller_sku || row.skuId || row.sku_id || "").trim()).filter((value) => value && value !== "-")));
  const detailProductName = detailProductNames.length > 0 ? detailProductNames.join(", ") : (item.productName && item.productName !== "-" ? item.productName : "Tidak Diketahui");
  const detailSku = detailSkus.length > 0 ? detailSkus.join(", ") : (item.sku && item.sku !== "-" ? item.sku : "-");

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/55 p-3 sm:p-6 backdrop-blur-sm">
      <div className="w-full max-w-5xl max-h-[94vh] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <WalletCards size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">Detail Penyelesaian Transaksi</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
                  <CheckCircle2 size={12} /> Telah diselesaikan
                </span>
                <span className="text-xs font-bold text-slate-500">{formatDateDisplay(item.date)}</span>
                <StatusBadge status={item.orderStatus} />
                <HppBadge status={item.hppStatus} />
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-500 transition-colors hover:bg-slate-900 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(94vh-96px)] overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          <section className="grid grid-cols-1 gap-4 border-b border-slate-100 pb-5 sm:grid-cols-3">
            <InfoHeader label="ID Pesanan" value={item.orderId} />
            <InfoHeader label="Nama Produk" value={detailProductName} />
            <InfoHeader label="SKU / Variasi" value={detailSku} />
          </section>

          <section className="mt-5 grid grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-3">
            <TopAmount label="Dana diselesaikan" value={formatRupiah(item.net)} tone="green" />
            <TopAmount label="Total Pendapatan" value={formatRupiah(totalPendapatan)} tone="slate" />
            <TopAmount label="Total Potongan" value={formatDeduction(item.fees)} tone="red" />
          </section>

          <section className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-5">
              <DetailPanel title="Pendapatan dari Pesanan" icon="income">
                {pemasukanRows.map(([label, value]) => (
                  <MoneyLine key={String(label)} label={String(label)} value={Number(value) || 0} />
                ))}
                <TotalLine label="Total Pendapatan" value={formatRupiah(totalPendapatan)} tone="green" />
              </DetailPanel>

              <DetailPanel title="Informasi Transaksi" icon="info">
                <SimpleLine label="Order Created Time" value={formatDateDisplay(item.createdDate)} />
                <SimpleLine label="Order Settled Time" value={formatDateDisplay(item.date)} />
                <SimpleLine label="Sumber Order" value={isTikTok ? "TikTok Shop" : "Shopee"} />
                <SimpleLine label="Status HPP" value={item.hppStatus || "-"} />
                <SimpleLine label="SKU Belum Mapping" value={missingSkus} />
              </DetailPanel>

              <DetailPanel title="Analisis Profit Internal" icon="profit" tone={profitBg}>
                <MoneyLine label={`Total HPP (${item.qty || 0} item)`} value={-(Number(item.totalHpp) || 0)} />
                <TotalLine label="Laba Bersih" value={isFinal ? formatRupiah(item.labaBersih) : "Belum Final"} className={profitTone} />
                <p className="pt-1 text-[11px] font-semibold text-slate-500">{item.hppRule || "Profit dihitung dari dana cair dikurangi HPP."}</p>
              </DetailPanel>
            </div>

            <div className="space-y-5">
              <DetailPanel title="Rincian Potongan" icon="deduction">
                {potonganRows.map(([label, value]) => (
                  <DeductionLine key={String(label)} label={String(label)} value={Number(value) || 0} />
                ))}
                <TotalLine label="Total Semua Potongan" value={formatDeduction(item.fees)} className="text-red-600" />
              </DetailPanel>

              {orderItems.length > 1 && (
                <DetailPanel title="Item Produk dalam Order" icon="items">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-3 py-2 font-black">SKU</th>
                          <th className="px-3 py-2 font-black">Produk</th>
                          <th className="px-3 py-2 text-right font-black">Qty</th>
                          <th className="px-3 py-2 text-right font-black">HPP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {orderItems.map((orderItem: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-mono text-slate-600">{orderItem.marketplaceSku || orderItem.sku || orderItem.skuId || "-"}</td>
                            <td className="px-3 py-2 text-slate-600">{orderItem.productName || orderItem.name || "-"}</td>
                            <td className="px-3 py-2 text-right font-black">{orderItem.quantity || orderItem.qty || 0}</td>
                            <td className="px-3 py-2 text-right font-black">{formatRupiah(orderItem.totalHpp || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </DetailPanel>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoHeader({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 break-all text-sm font-black text-slate-800">{value}</p>
    </div>
  );
}

function DetailPanel({ title, icon, tone = "bg-white border-slate-200", children }: { title: string; icon?: "income" | "deduction" | "info" | "profit" | "items"; tone?: string; children: ReactNode }) {
  const iconStyle = icon === "deduction" ? "text-red-500 bg-red-50" : icon === "profit" ? "text-emerald-600 bg-emerald-50" : icon === "info" ? "text-indigo-500 bg-indigo-50" : icon === "items" ? "text-blue-500 bg-blue-50" : "text-emerald-600 bg-emerald-50";
  const symbol = icon === "deduction" ? "↘" : icon === "profit" ? "▥" : icon === "info" ? "▣" : icon === "items" ? "□" : "⊕";
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tone}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-black ${iconStyle}`}>{symbol}</span>
        <h3 className="text-sm font-black text-slate-800">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function SimpleLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="max-w-[55%] break-all text-right font-bold text-slate-700">{value}</span>
    </div>
  );
}

function MoneyLine({ label, value }: { label: string; value: number }) {
  const isNegative = value < 0;
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className={`text-right font-bold ${isNegative ? "text-red-500" : "text-slate-700"}`}>{formatRupiah(value)}</span>
    </div>
  );
}

function DeductionLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="text-right font-bold text-red-500">{formatDeduction(value)}</span>
    </div>
  );
}

function TotalLine({ label, value, tone, className }: { label: string; value: ReactNode; tone?: "green" | "red" | "slate"; className?: string }) {
  const color = className || (tone === "green" ? "text-emerald-600" : tone === "red" ? "text-red-600" : "text-slate-800");
  return (
    <div className="mt-3 flex items-center justify-between gap-4 border-t border-slate-100 pt-3 text-sm">
      <span className="font-black text-slate-800">{label}</span>
      <span className={`text-right font-black ${color}`}>{value}</span>
    </div>
  );
}

function TopAmount({ label, value, tone }: { label: string; value: string; tone: "green" | "red" | "slate" }) {
  const styles = {
    green: "text-emerald-600 bg-emerald-50",
    red: "text-red-600 bg-red-50",
    slate: "text-slate-800 bg-slate-50",
  };
  return (
    <div className="flex min-h-[92px] items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
      <div>
        <p className="text-xs font-semibold text-slate-400">{label}</p>
        <p className={`mt-1 text-xl font-black ${tone === "red" ? "text-red-600" : tone === "green" ? "text-emerald-600" : "text-slate-900"}`}>{value}</p>
      </div>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-black ${styles[tone]}`}>{tone === "red" ? "↘" : tone === "green" ? "↑" : "•"}</span>
    </div>
  );
}

function formatDeduction(value: unknown) {
  const amount = Math.abs(Number(value) || 0);
  return `-${formatRupiah(amount)}`;
}
