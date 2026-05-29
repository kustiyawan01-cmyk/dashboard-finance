"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Banknote,
  Bell,
  Briefcase,
  Calendar,
  CircleDollarSign,
  FileBox,
  Megaphone,
  Package,
  Receipt,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Truck,
  Users2,
  Wallet,
  Wrench
} from "lucide-react";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

type DateRange = {
  start: string;
  end: string;
};

type TrendRow = {
  name: string;
  shopee: number;
  tiktok: number;
  total: number;
  profit: number;
  margin: number;
};

type TopOrderRow = {
  name: string;
  marketplace: "Shopee" | "TikTok";
  omzet: number;
  profit: number;
};

type InternalCosts = {
  operasional: number;
  marketing: number;
  maintenance: number;
  karyawan: number;
  beliBahan: number;
  gaji: number;
  perlengkapan: number;
};

type DashboardStats = {
  omzetShopee: number;
  omzetTikTok: number;
  netShopee: number;
  netTikTok: number;
  hppShopee: number;
  hppTikTok: number;
  labaShopee: number;
  labaTikTok: number;
  pengeluaranShopee: number;
  pengeluaranTikTok: number;
  orderShopee: number;
  orderTikTok: number;
  adminKomisi: number;
  iklanPromosi: number;
  ongkirVoucher: number;
  pajak: number;
  lainnya: number;
  diskonPenjual: number;
  biayaGmv: number;
  returBatal: number;
  hppKosong: number;
  trendData: TrendRow[];
  profitMarginData: TrendRow[];
  topOrders: TopOrderRow[];
  internalCosts: InternalCosts;
};

const emptyStats: DashboardStats = {
  omzetShopee: 0,
  omzetTikTok: 0,
  netShopee: 0,
  netTikTok: 0,
  hppShopee: 0,
  hppTikTok: 0,
  labaShopee: 0,
  labaTikTok: 0,
  pengeluaranShopee: 0,
  pengeluaranTikTok: 0,
  orderShopee: 0,
  orderTikTok: 0,
  adminKomisi: 0,
  iklanPromosi: 0,
  ongkirVoucher: 0,
  pajak: 0,
  lainnya: 0,
  diskonPenjual: 0,
  biayaGmv: 0,
  returBatal: 0,
  hppKosong: 0,
  trendData: [],
  profitMarginData: [],
  topOrders: [],
  internalCosts: {
    operasional: 0,
    marketing: 0,
    maintenance: 0,
    karyawan: 0,
    beliBahan: 0,
    gaji: 0,
    perlengkapan: 0
  }
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({ start: "", end: "" });
  const [tempDateRange, setTempDateRange] = useState<DateRange>({ start: "", end: "" });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats>(emptyStats);

  const formatRp = (angka: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(Number(angka) || 0);
  };

  const normalizeDate = (value: unknown) => {
    if (!value || value === "-") return "";

    const text = String(value).trim().split(" ")[0];

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

    if (!Number.isNaN(Number(text)) && Number(text) > 20000) {
      const date = new Date(Math.round((Number(text) - 25569) * 86400 * 1000));
      return date.toISOString().split("T")[0];
    }

    return text;
  };

  const isInDateRange = (dateValue: unknown) => {
    const normalized = normalizeDate(dateValue);

    if (!normalized) return true;
    if (dateRange.start && normalized < dateRange.start) return false;
    if (dateRange.end && normalized > dateRange.end) return false;

    return true;
  };

  const getNumber = (...values: unknown[]) => {
    for (const value of values) {
      const number = Number(value || 0);
      if (Number.isFinite(number) && number !== 0) return number;
    }

    return 0;
  };

  const getAbs = (...values: unknown[]) => Math.abs(getNumber(...values));

  const isCancelledOrRefund = (item: any) => {
    const status = String(item.orderStatus || item.status || item.hppStatus || "").toLowerCase();

    return (
      status.includes("batal") ||
      status.includes("cancel") ||
      status.includes("retur") ||
      status.includes("refund")
    );
  };

  const isTikTokNonOrderCharge = (item: any) => {
    const status = String(item.orderStatus || "").toLowerCase();
    const hppStatus = String(item.hppStatus || "").toLowerCase();
    const productName = String(item.productName || "").toLowerCase();
    const orderId = String(item.orderId || "").toLowerCase();

    return (
      hppStatus.includes("non order") ||
      status.includes("gmv") ||
      status.includes("iklan") ||
      productName.includes("gmv") ||
      productName.includes("iklan") ||
      orderId.includes("gmvpaydeduction")
    );
  };

  const handlePresetDate = (days: number) => {
    const end = new Date();
    const start = new Date();

    start.setDate(end.getDate() - days);

    const formatDate = (date: Date) => date.toISOString().split("T")[0];

    setTempDateRange({
      start: formatDate(start),
      end: formatDate(end)
    });
  };

  useEffect(() => {
    const fetchRealData = async () => {
      setLoading(true);

      try {
        const [resShopee, resTikTok, resExpenses] = await Promise.all([
          fetch("/api/finance-shopee").catch(() => null),
          fetch("/api/finance-tiktok").catch(() => null),
          fetch("/api/expenses").catch(() => null)
        ]);

        let sOmzet = 0;
        let sNet = 0;
        let sHpp = 0;
        let sLaba = 0;
        let sOrders = 0;
        let sPengeluaran = 0;

        let tOmzet = 0;
        let tNet = 0;
        let tHpp = 0;
        let tLaba = 0;
        let tOrders = 0;
        let tPengeluaran = 0;

        let cAdminKomisi = 0;
        let cIklan = 0;
        let cOngkirVoucher = 0;
        let cPajak = 0;
        let cLainnya = 0;
        let cDiskonPenjual = 0;
        let cBiayaGmv = 0;
        let cReturBatal = 0;
        let cHppKosong = 0;

        let op = 0;
        let mkt = 0;
        let mtc = 0;
        let krw = 0;
        let bhn = 0;
        let gj = 0;
        let plg = 0;

        const trendMap = new Map<string, TrendRow>();
        const topOrdersList: TopOrderRow[] = [];

        const touchTrend = (date: string) => {
          const normalized = normalizeDate(date);
          const key = normalized || "-";
          const existing = trendMap.get(key);

          if (existing) return existing;

          const fresh: TrendRow = {
            name: key,
            shopee: 0,
            tiktok: 0,
            total: 0,
            profit: 0,
            margin: 0
          };

          trendMap.set(key, fresh);

          return fresh;
        };

        if (resShopee && resShopee.ok) {
          const shopee = await resShopee.json();

          if (Array.isArray(shopee)) {
            shopee.forEach((item: any) => {
              const date = item.date || item.createdDate;

              if (!isInDateRange(date)) return;

              const omzet = getNumber(item.hargaProduk, item.revenue, item.subtotal);
              const net = getNumber(item.net);
              const hpp = getNumber(item.totalHpp);
              const laba = getNumber(item.labaBersih);
              const fees = getAbs(item.fees);

              sOrders += 1;
              sOmzet += omzet;
              sNet += net;
              sHpp += hpp;
              sLaba += laba;
              sPengeluaran += fees;

              cAdminKomisi += getAbs(item.admin) + getAbs(item.layanan) + getAbs(item.ams) + getAbs(item.komisiAffiliate);
              cIklan += getAbs(item.shopeeAds);
              cOngkirVoucher += getAbs(item.ongkirXtra) + getAbs(item.cashbackXtra) + getAbs(item.voucherPenjual) + getAbs(item.cashbackPenjual);
              cPajak += getAbs(item.pajak);
              cLainnya += getAbs(item.biayaCod) + getAbs(item.transfer) + getAbs(item.materai) + getAbs(item.penalti) + getAbs(item.penyesuaianSistem) + getAbs(item.refund) + getAbs(item.retur);

              if (isCancelledOrRefund(item)) cReturBatal += 1;
              if (String(item.hppStatus || "").toLowerCase().includes("belum")) cHppKosong += 1;

              if (omzet > 0) {
                topOrdersList.push({
                  name: String(item.orderId || "-"),
                  marketplace: "Shopee",
                  omzet,
                  profit: laba
                });
              }

              const trend = touchTrend(date);
              trend.shopee += omzet;
              trend.total += omzet;
              trend.profit += laba;
            });
          }
        }

        if (resTikTok && resTikTok.ok) {
          const tiktok = await resTikTok.json();

          if (Array.isArray(tiktok)) {
            tiktok.forEach((item: any) => {
              const date = item.date || item.createdDate;

              if (!isInDateRange(date)) return;

              const nonOrderCharge = isTikTokNonOrderCharge(item);
              const net = getNumber(item.net);
              const hpp = getNumber(item.totalHpp);
              const laba = getNumber(item.labaBersih);
              const fees = getAbs(item.fees);

              if (nonOrderCharge) {
                const gmvAmount = getAbs(item.fees, item.net, item.adjustment);

                tPengeluaran += gmvAmount;
                tLaba += laba;
                cIklan += gmvAmount;
                cBiayaGmv += gmvAmount;

                const trend = touchTrend(date);
                trend.profit += laba;

                return;
              }

              const omzet = getNumber(item.tiktokSubtotalAfterDiscount, item.revenue, item.subtotal);
              const sellerDiscount = getAbs(item.tiktokSellerDiscount, item.sellerDiscount);

              tOrders += 1;
              tOmzet += omzet;
              tNet += net;
              tHpp += hpp;
              tLaba += laba;
              tPengeluaran += fees;

              cAdminKomisi +=
                getAbs(item.tiktokPlatformCommission, item.platformFee) +
                getAbs(item.tiktokPaymentFee, item.paymentFee) +
                getAbs(item.tiktokAffiliateCommission, item.affiliateFee) +
                getAbs(item.tiktokPartnerAffiliateCommission) +
                getAbs(item.tiktokShopAdsAffiliateCommission) +
                getAbs(item.tiktokDynamicCommission) +
                getAbs(item.tiktokOrderProcessingFee);

              cIklan += getAbs(item.tiktokGmvMaxAdsFee);

              cOngkirVoucher +=
                getAbs(item.tiktokShippingFee) +
                getAbs(item.tiktokFreeShippingProgramFee, item.freeShippingFee) +
                getAbs(item.tiktokCashbackBonusFee) +
                getAbs(item.tiktokVoucherXtraFee) +
                getAbs(item.tiktokGmvMaxVoucher);

              cPajak += getAbs(item.tiktokTaxPph22, item.tax) + getAbs(item.tiktokGmvMaxVoucherTax);

              cLainnya +=
                getAbs(item.tiktokCodFee, item.codFee) +
                getAbs(item.tiktokLiveServiceFee) +
                getAbs(item.tiktokEamsFee) +
                getAbs(item.adjustment);

              cDiskonPenjual += sellerDiscount;

              if (isCancelledOrRefund(item)) cReturBatal += 1;
              if (String(item.hppStatus || "").toLowerCase().includes("belum")) cHppKosong += 1;

              if (omzet > 0) {
                topOrdersList.push({
                  name: String(item.orderId || "-"),
                  marketplace: "TikTok",
                  omzet,
                  profit: laba
                });
              }

              const trend = touchTrend(date);
              trend.tiktok += omzet;
              trend.total += omzet;
              trend.profit += laba;
            });
          }
        }

        if (resExpenses && resExpenses.ok) {
          const expenses = await resExpenses.json();

          if (Array.isArray(expenses)) {
            expenses.forEach((expense: any) => {
              const rawDate = expense.tanggal || expense.date || expense.created_at;

              if (!isInDateRange(rawDate)) return;

              const value = Number(expense.jumlah || expense.amount || 0);
              const category = String(expense.kategori || expense.category || "").toLowerCase();

              if (category.includes("operasional")) op += value;
              else if (category.includes("marketing") || category.includes("iklan")) mkt += value;
              else if (category.includes("maintenance") || category.includes("perbaikan")) mtc += value;
              else if (category.includes("karyawan") && !category.includes("gaji")) krw += value;
              else if (category.includes("bahan") || category.includes("produksi")) bhn += value;
              else if (category.includes("gaji")) gj += value;
              else if (category.includes("perlengkapan") || category.includes("atk")) plg += value;
              else op += value;
            });
          }
        }

        const finalTrendData = Array.from(trendMap.values())
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((item) => ({
            ...item,
            margin: item.total > 0 ? Number(((item.profit / item.total) * 100).toFixed(1)) : 0
          }));

        setStats({
          omzetShopee: sOmzet,
          omzetTikTok: tOmzet,
          netShopee: sNet,
          netTikTok: tNet,
          hppShopee: sHpp,
          hppTikTok: tHpp,
          labaShopee: sLaba,
          labaTikTok: tLaba,
          pengeluaranShopee: sPengeluaran,
          pengeluaranTikTok: tPengeluaran,
          orderShopee: sOrders,
          orderTikTok: tOrders,
          adminKomisi: cAdminKomisi,
          iklanPromosi: cIklan,
          ongkirVoucher: cOngkirVoucher,
          pajak: cPajak,
          lainnya: cLainnya,
          diskonPenjual: cDiskonPenjual,
          biayaGmv: cBiayaGmv,
          returBatal: cReturBatal,
          hppKosong: cHppKosong,
          trendData: finalTrendData.length > 0
            ? finalTrendData
            : [{ name: "-", shopee: 0, tiktok: 0, total: 0, profit: 0, margin: 0 }],
          profitMarginData: finalTrendData,
          topOrders: topOrdersList.sort((a, b) => b.profit - a.profit).slice(0, 5),
          internalCosts: {
            operasional: op,
            marketing: mkt,
            maintenance: mtc,
            karyawan: krw,
            beliBahan: bhn,
            gaji: gj,
            perlengkapan: plg
          }
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchRealData();
  }, [dateRange]);

  const totalOmzet = stats.omzetShopee + stats.omzetTikTok;
  const totalNet = stats.netShopee + stats.netTikTok;
  const totalHpp = stats.hppShopee + stats.hppTikTok;
  const totalPengeluaranMP = stats.pengeluaranShopee + stats.pengeluaranTikTok;
  const totalPembelianBahan = stats.internalCosts.beliBahan;

  const totalPengeluaranInternalOperasional =
    stats.internalCosts.operasional +
    stats.internalCosts.marketing +
    stats.internalCosts.maintenance +
    stats.internalCosts.karyawan +
    stats.internalCosts.gaji +
    stats.internalCosts.perlengkapan;

  const totalPengeluaranAll = totalPengeluaranMP + totalPengeluaranInternalOperasional;
  const totalLabaBersihMp = stats.labaShopee + stats.labaTikTok;
  const trueNetProfit = totalLabaBersihMp - totalPengeluaranInternalOperasional;
  const totalOrder = stats.orderShopee + stats.orderTikTok;
  const marginBersih = totalOmzet > 0 ? (trueNetProfit / totalOmzet) * 100 : 0;

  const chartMarketplace = {
    series: [stats.omzetShopee, stats.omzetTikTok],
    options: {
      chart: { type: "donut", fontFamily: "inherit" },
      labels: ["Shopee", "TikTok Shop"],
      colors: ["#EE4D2D", "#000000"],
      dataLabels: { enabled: false },
      plotOptions: { pie: { donut: { size: "75%" } } },
      stroke: { width: 0 },
      legend: { show: false },
      tooltip: {
        style: { fontSize: "13px" },
        y: { formatter: (value: number) => formatRp(value) }
      }
    } as ApexCharts.ApexOptions
  };

  const chartTrend = {
    series: [
      { name: "Total Omzet", data: stats.trendData.map((item) => item.total) },
      { name: "Shopee", data: stats.trendData.map((item) => item.shopee) },
      { name: "TikTok", data: stats.trendData.map((item) => item.tiktok) }
    ],
    options: {
      chart: {
        type: "area",
        toolbar: { show: false },
        fontFamily: "inherit",
        zoom: { enabled: false }
      },
      colors: ["#8B5CF6", "#EE4D2D", "#000000"],
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: [3, 2, 2] },
      fill: {
        type: "gradient",
        gradient: { shadeIntensity: 1, opacityFrom: 0.2, opacityTo: 0, stops: [0, 90, 100] }
      },
      xaxis: {
        categories: stats.trendData.map((item) => item.name),
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { fontSize: "12px", colors: "#94A3B8" } }
      },
      yaxis: {
        labels: {
          style: { fontSize: "12px", colors: "#94A3B8" },
          formatter: (value: number) => `Rp ${(value / 1000000).toFixed(1)}M`
        }
      },
      grid: { borderColor: "#F1F5F9", strokeDashArray: 4 },
      legend: { show: false },
      tooltip: {
        style: { fontSize: "13px" },
        y: { formatter: (value: number) => formatRp(value) }
      }
    } as ApexCharts.ApexOptions
  };

  const chartProfitMargin = {
    series: [
      { name: "Profit Bersih", type: "column", data: stats.profitMarginData.map((item) => item.profit) },
      { name: "Margin (%)", type: "line", data: stats.profitMarginData.map((item) => item.margin) }
    ],
    options: {
      chart: { type: "line", toolbar: { show: false }, fontFamily: "inherit" },
      colors: ["#10B981", "#8B5CF6"],
      stroke: { width: [0, 3], curve: "smooth" },
      xaxis: {
        categories: stats.profitMarginData.map((item) => item.name),
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { fontSize: "12px", colors: "#94A3B8" } }
      },
      yaxis: [
        {
          title: { text: "Profit", style: { fontSize: "12px" } },
          labels: {
            style: { fontSize: "12px", colors: "#94A3B8" },
            formatter: (value: number) => `Rp ${(value / 1000000).toFixed(1)}M`
          }
        },
        {
          opposite: true,
          title: { text: "Margin %", style: { fontSize: "12px" } },
          labels: {
            style: { fontSize: "12px", colors: "#94A3B8" },
            formatter: (value: number) => `${value}%`
          }
        }
      ],
      grid: { borderColor: "#F1F5F9", strokeDashArray: 4 },
      legend: { show: false },
      tooltip: {
        shared: true,
        intersect: false,
        style: { fontSize: "13px" },
        y: {
          formatter: (value: number, { seriesIndex }: any) => seriesIndex === 0 ? formatRp(value) : `${value}%`
        }
      }
    } as ApexCharts.ApexOptions
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center p-10 text-[15px] font-medium text-slate-500">
        Menyiapkan Data Dashboard...
      </div>
    );
  }

  return (
    <main className="min-h-screen flex-1 bg-[#F8FAFC] p-8 font-sans text-slate-800">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-[15px] font-medium text-slate-500">Ringkasan keuangan performa toko gabungan berbasis data real</p>
        </div>

        <div className="flex items-center gap-4">
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
                        <input
                          type="date"
                          value={tempDateRange.start}
                          onChange={(event) => setTempDateRange((prev) => ({ ...prev, start: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="mb-1.5 block text-xs font-medium text-slate-500">Sampai Tanggal</label>
                        <input
                          type="date"
                          value={tempDateRange.end}
                          onChange={(event) => setTempDateRange((prev) => ({ ...prev, end: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                      <button
                        onClick={() => {
                          setDateRange({ start: "", end: "" });
                          setTempDateRange({ start: "", end: "" });
                          setIsDatePickerOpen(false);
                        }}
                        className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-red-600 transition-colors hover:bg-red-100"
                      >
                        Reset
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsDatePickerOpen(false)}
                          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            setDateRange(tempDateRange);
                            setIsDatePickerOpen(false);
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

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <TopCard title="Total Omzet" value={formatRp(totalOmzet)} icon={<ShoppingBag />} iconBg="bg-blue-100" iconColor="text-blue-600" data={stats.trendData.map((item) => item.total)} stroke="#2563EB" />
        <TopCard title="Dana Cair" value={formatRp(totalNet)} icon={<Banknote />} iconBg="bg-emerald-100" iconColor="text-emerald-600" data={stats.trendData.map((item) => item.total)} stroke="#10B981" />
        <TopCard title="Total HPP" value={formatRp(totalHpp)} icon={<Package />} iconBg="bg-orange-100" iconColor="text-orange-600" data={stats.trendData.map((item) => item.total)} stroke="#F97316" />
        <TopCard title="Potongan MP" value={formatRp(totalPengeluaranMP)} icon={<Receipt />} iconBg="bg-red-100" iconColor="text-red-600" data={stats.trendData.map((item) => item.total)} stroke="#EF4444" />
        <TopCard title="Internal Operasional" value={formatRp(totalPengeluaranInternalOperasional)} icon={<Briefcase />} iconBg="bg-amber-100" iconColor="text-amber-600" data={stats.trendData.map((item) => item.total)} stroke="#F59E0B" />
        <TopCard title="Laba Bersih" value={formatRp(trueNetProfit)} icon={<CircleDollarSign />} iconBg="bg-emerald-100" iconColor="text-emerald-600" data={stats.trendData.map((item) => item.profit)} stroke={trueNetProfit < 0 ? "#EF4444" : "#10B981"} isHighlight tone={trueNetProfit < 0 ? "red" : "green"} />
        <TopCard title="Margin Bersih" value={`${marginBersih.toFixed(1)}%`} icon={<TrendingUp />} iconBg="bg-violet-100" iconColor="text-violet-600" data={stats.trendData.map((item) => item.margin)} stroke="#8B5CF6" />
        <TopCard title="Total Order" value={totalOrder.toLocaleString("id-ID")} icon={<Package />} iconBg="bg-slate-100" iconColor="text-slate-700" data={stats.trendData.map((item) => item.total)} stroke="#64748B" />
      </section>

      <section className="mb-8">
        <h3 className="mb-4 text-[14px] font-bold uppercase tracking-wider text-slate-500">Operasional Internal & Pembelian Stok</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 xl:grid-cols-7">
          <MiniMetricCard label="Operasional" value={formatRp(stats.internalCosts.operasional)} icon={<Briefcase />} color="text-amber-500 bg-amber-50" />
          <MiniMetricCard label="Marketing" value={formatRp(stats.internalCosts.marketing)} icon={<Megaphone />} color="text-amber-500 bg-amber-50" />
          <MiniMetricCard label="Maintenance" value={formatRp(stats.internalCosts.maintenance)} icon={<Wrench />} color="text-amber-500 bg-amber-50" />
          <MiniMetricCard label="Karyawan" value={formatRp(stats.internalCosts.karyawan)} icon={<Users2 />} color="text-amber-500 bg-amber-50" />
          <MiniMetricCard label="Beli Bahan / Stok" value={formatRp(stats.internalCosts.beliBahan)} icon={<Truck />} color="text-blue-500 bg-blue-50" />
          <MiniMetricCard label="Biaya Gaji" value={formatRp(stats.internalCosts.gaji)} icon={<Wallet />} color="text-amber-500 bg-amber-50" />
          <MiniMetricCard label="Perlengkapan" value={formatRp(stats.internalCosts.perlengkapan)} icon={<FileBox />} color="text-amber-500 bg-amber-50" />
        </div>
      </section>

      <div className="mb-8 flex w-full flex-col gap-6 xl:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="flex w-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:w-1/3">
              <h3 className="mb-4 text-[16px] font-bold text-slate-900">Omzet per Marketplace</h3>
              <div className="relative -mt-4 flex flex-1 items-center justify-center">
                <ReactApexChart options={chartMarketplace.options} series={chartMarketplace.series} type="donut" height={240} />
                <div className="pointer-events-none absolute inset-0 mt-2 flex flex-col items-center justify-center">
                  <span className="text-[12px] font-medium text-slate-500">Total Omzet</span>
                  <span className="text-[16px] font-black text-slate-800">{formatRp(totalOmzet)}</span>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <LegendAmount color="bg-[#EE4D2D]" label="Shopee" value={formatRp(stats.omzetShopee)} />
                <LegendAmount color="bg-black" label="TikTok Shop" value={formatRp(stats.omzetTikTok)} />
              </div>
            </div>

            <div className="flex flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[16px] font-bold text-slate-900">Tren Omzet Berjalan</h3>
                <div className="flex items-center gap-4 text-[12px] font-bold">
                  <ChartLegend color="bg-[#EE4D2D]" label="Shopee" />
                  <ChartLegend color="bg-black" label="TikTok Shop" />
                  <ChartLegend color="bg-[#8B5CF6]" label="Total" />
                </div>
              </div>
              <div className="-ml-3 w-full flex-1">
                <ReactApexChart options={chartTrend.options} series={chartTrend.series} type="area" height={280} />
              </div>
            </div>
          </div>

          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-slate-900">Profit Bersih Harian & Margin</h3>
              <div className="flex items-center gap-4 text-[12px] font-bold">
                <ChartLegend color="bg-[#10B981]" label="Profit" />
                <ChartLegend color="bg-[#8B5CF6]" label="Margin (%)" />
              </div>
            </div>
            <div className="-ml-3 w-full">
              <ReactApexChart options={chartProfitMargin.options} series={chartProfitMargin.series} type="line" height={280} />
            </div>
          </div>
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-6 xl:w-[350px] 2xl:w-[400px]">
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-6 text-[16px] font-bold text-slate-900">Rincian Potongan MP</h3>
            <div className="mt-2 flex-1 space-y-6">
              <ProgressRow label="Admin & Komisi" value={stats.adminKomisi} total={totalPengeluaranMP} color="bg-orange-500" icon={<Receipt size={14} />} />
              <ProgressRow label="Iklan & GMV" value={stats.iklanPromosi} total={totalPengeluaranMP} color="bg-blue-500" icon={<TrendingUp size={14} />} />
              <ProgressRow label="Ongkir & Voucher" value={stats.ongkirVoucher} total={totalPengeluaranMP} color="bg-slate-800" icon={<Package size={14} />} />
              <ProgressRow label="Pajak" value={stats.pajak} total={totalPengeluaranMP} color="bg-emerald-500" icon={<Wallet size={14} />} />
              <ProgressRow label="Biaya Lainnya" value={stats.lainnya} total={totalPengeluaranMP} color="bg-violet-500" icon={<TrendingDown size={14} />} />
            </div>

            <div className="mt-8 border-t border-slate-200 pt-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[13px] font-bold text-slate-500">Diskon Penjual</span>
                <span className="text-[14px] font-black text-slate-800">{formatRp(stats.diskonPenjual)}</span>
              </div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[13px] font-bold text-slate-500">Biaya GMV / Iklan</span>
                <span className="text-[14px] font-black text-red-600">{formatRp(stats.biayaGmv)}</span>
              </div>
              <div className="mb-3 flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2">
                <span className="text-[13px] font-bold text-blue-700">Beli Bahan / Stok</span>
                <span className="text-[14px] font-black text-blue-700">{formatRp(totalPembelianBahan)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-[14px] font-bold text-slate-500">Total Potongan Marketplace</span>
                <span className="text-[16px] font-black text-red-600">-{formatRp(totalPengeluaranMP)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-5 text-[16px] font-bold text-slate-900">Kontrol Data</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatusMini title="Retur / Batal" value={stats.returBatal} tone={stats.returBatal > 0 ? "red" : "green"} />
              <StatusMini title="HPP Kosong" value={stats.hppKosong} tone={stats.hppKosong > 0 ? "red" : "green"} />
              <StatusMini title="Order Shopee" value={stats.orderShopee} tone="slate" />
              <StatusMini title="Order TikTok" value={stats.orderTikTok} tone="slate" />
            </div>
          </div>

          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-5 text-[16px] font-bold text-slate-900">Transaksi Laba Tertinggi</h3>
            <div className="mb-4 flex justify-between border-b pb-3 text-[11px] font-black uppercase tracking-wider text-slate-400">
              <span className="w-1/2">Order ID</span>
              <span className="w-1/4 text-right">Omzet</span>
              <span className="w-1/4 text-right">Profit</span>
            </div>

            <div className="scrollbar-hide max-h-[300px] space-y-5 overflow-y-auto pr-2">
              {stats.topOrders.length > 0 ? stats.topOrders.map((item, index) => (
                <div key={`${item.name}-${index}`} className="flex items-center justify-between text-[13px]">
                  <div className="flex w-1/2 items-center gap-3 pr-2">
                    <div className={`shrink-0 rounded-lg p-2 ${item.marketplace === "Shopee" ? "bg-orange-100 text-[#EE4D2D]" : "bg-slate-100 text-slate-800"}`}>
                      <Package size={16} />
                    </div>
                    <span className="truncate font-bold text-slate-700" title={item.name}>{item.name}</span>
                  </div>
                  <span className="w-1/4 text-right font-medium text-slate-600">{formatRp(item.omzet)}</span>
                  <span className={`w-1/4 text-right font-black ${item.profit < 0 ? "text-red-600" : "text-emerald-600"}`}>{formatRp(item.profit)}</span>
                </div>
              )) : (
                <p className="py-6 text-center text-sm font-bold text-slate-400">Belum ada transaksi profit.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function MiniMetricCard({ label, value, icon, color }: any) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-transform duration-300 hover:-translate-y-1">
      <div className={`shrink-0 rounded-xl p-2.5 ${color}`}>
        {React.cloneElement(icon, { size: 18 })}
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 truncate text-[10px] font-bold uppercase tracking-wider text-slate-400" title={label}>{label}</p>
        <p className="truncate text-[15px] font-black leading-none tracking-tight text-slate-900" title={value}>{value}</p>
      </div>
    </div>
  );
}

function TopCard({ title, value, icon, iconBg, iconColor, data, stroke, isHighlight = false, tone = "green" }: any) {
  const highlightClass = tone === "red"
    ? "bg-red-600 border-red-700 text-white shadow-md"
    : "bg-emerald-600 border-emerald-700 text-white shadow-md";

  const sparklineOptions = {
    chart: { type: "line", sparkline: { enabled: true }, animations: { enabled: true } },
    stroke: { curve: "smooth", width: 2 },
    colors: [stroke],
    tooltip: {
      fixed: { enabled: false },
      x: { show: false },
      y: { title: { formatter: () => "" } },
      marker: { show: false }
    }
  } as ApexCharts.ApexOptions;

  return (
    <div className={`flex min-w-0 flex-col justify-between rounded-xl border p-4 transition-shadow hover:shadow-md ${isHighlight ? highlightClass : "border-slate-200 bg-white text-slate-900 shadow-sm"}`}>
      <div className="mb-3 flex min-w-0 items-center gap-2.5">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isHighlight ? "bg-white/20 text-white" : `${iconBg} ${iconColor}`}`}>
          {React.cloneElement(icon, { size: 16 })}
        </div>
        <span className={`flex-1 truncate text-[12px] font-bold tracking-tight ${isHighlight ? "text-white/90" : "text-slate-500"}`} title={title}>
          {title}
        </span>
      </div>
      <div className="min-w-0">
        <h3 className={`mb-1.5 truncate text-[20px] font-black leading-none tracking-tight ${isHighlight ? "text-white" : "text-slate-900"}`} title={value}>
          {value}
        </h3>
        <div className="h-8 w-full opacity-80">
          <ReactApexChart options={sparklineOptions} series={[{ data }]} type="line" height={32} />
        </div>
      </div>
    </div>
  );
}

function ProgressRow({ label, value, total, color, icon }: any) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const safePercentage = Math.max(0, Math.min(100, percentage));
  const formatRp = (angka: number) => new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(angka) || 0);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[13px]">
        <div className="flex items-center gap-2 font-medium text-slate-700">
          <div className={`rounded-md p-1.5 text-white shadow-sm ${color}`}>{icon}</div>
          {label}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-800">{formatRp(value)}</span>
          <span className="w-10 text-right font-bold text-slate-400">{percentage.toFixed(1)}%</span>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${safePercentage}%` }} />
      </div>
    </div>
  );
}

function LegendAmount({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`h-3 w-3 rounded-sm ${color}`} />
        <span className="text-[14px] font-medium text-slate-600">{label}</span>
      </div>
      <p className="text-right text-[14px] font-bold text-slate-800">{value}</p>
    </div>
  );
}

function ChartLegend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-slate-600">
      <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function StatusMini({ title, value, tone }: { title: string; value: number; tone: "red" | "green" | "slate" }) {
  const styles = {
    red: "bg-red-50 text-red-700 border-red-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100"
  };

  return (
    <div className={`rounded-xl border p-3 ${styles[tone]}`}>
      <p className="text-[11px] font-black uppercase tracking-wider opacity-70">{title}</p>
      <p className="mt-1 text-xl font-black">{value.toLocaleString("id-ID")}</p>
    </div>
  );
}