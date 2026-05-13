"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { 
  Megaphone, TrendingUp, TrendingDown, Target, Percent, Wallet, Calendar, 
  ShoppingBag, CheckCircle2, AlertTriangle, Info, ChevronDown
} from "lucide-react";

// WAJIB: Import ApexCharts secara dinamis
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function RoasAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [shopeeData, setShopeeData] = useState<any[]>([]);
  const [tiktokData, setTikTokData] = useState<any[]>([]);

  // Filter & Manual Input State
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [manualShopeeAds, setManualShopeeAds] = useState<number | ''>('');
  const [manualTikTokAds, setManualTikTokAds] = useState<number | ''>('');

  useEffect(() => {
    const fetchRealData = async () => {
      setLoading(true);
      try {
        const [resShopee, resTikTok] = await Promise.all([
          fetch('/api/finance-shopee').catch(() => null),
          fetch('/api/finance-tiktok').catch(() => null)
        ]);

        if (resShopee && resShopee.ok) setShopeeData(await resShopee.json());
        if (resTikTok && resTikTok.ok) setTikTokData(await resTikTok.json());
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchRealData();
  }, []);

  // Filter Tanggal Data
  const filteredShopee = useMemo(() => {
    return shopeeData.filter(item => {
      if (!dateRange.start || !dateRange.end) return true;
      const d = item.date?.split(" ")[0].replace(/\//g, "-") || "";
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [shopeeData, dateRange]);

  const filteredTikTok = useMemo(() => {
    return tiktokData.filter(item => {
      if (!dateRange.start || !dateRange.end) return true;
      const d = item.date?.split(" ")[0].replace(/\//g, "-") || "";
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [tiktokData, dateRange]);

  // Kalkulasi Metrik Shopee
  const shopeeMetrics = useMemo(() => {
    const omzet = filteredShopee.reduce((sum, item) => sum + (Number(item.hargaProduk) || 0), 0);
    const orderCount = filteredShopee.length;
    // Biaya iklan ditarik dari database ATAU dari input manual Top-Up user
    const dbAds = filteredShopee.reduce((sum, item) => sum + (Number(item.shopeeAds) || 0), 0);
    const totalAds = manualShopeeAds !== '' ? Number(manualShopeeAds) : dbAds;

    const roas = totalAds > 0 ? omzet / totalAds : 0;
    const cir = omzet > 0 ? (totalAds / omzet) * 100 : 0;
    const cpa = orderCount > 0 ? totalAds / orderCount : 0;

    return { omzet, orderCount, totalAds, roas, cir, cpa };
  }, [filteredShopee, manualShopeeAds]);

  // Kalkulasi Metrik TikTok
  const tiktokMetrics = useMemo(() => {
    const omzet = filteredTikTok.reduce((sum, item) => sum + (Number(item.subtotal || item.revenue) || 0), 0);
    const orderCount = filteredTikTok.length;
    // TikTok biasanya ads di Top-up terpisah, maka manualAds sangat diprioritaskan
    const dbAds = filteredTikTok.reduce((sum, item) => {
      if (item.orderStatus?.toLowerCase().includes('iklan')) return sum + Math.abs(Number(item.net) || 0);
      return sum;
    }, 0);
    const totalAds = manualTikTokAds !== '' ? Number(manualTikTokAds) : dbAds;

    const roas = totalAds > 0 ? omzet / totalAds : 0;
    const cir = omzet > 0 ? (totalAds / omzet) * 100 : 0;
    const cpa = orderCount > 0 ? totalAds / orderCount : 0;

    return { omzet, orderCount, totalAds, roas, cir, cpa };
  }, [filteredTikTok, manualTikTokAds]);

  // Metrik Gabungan
  const globalMetrics = {
    omzet: shopeeMetrics.omzet + tiktokMetrics.omzet,
    totalAds: shopeeMetrics.totalAds + tiktokMetrics.totalAds,
    orderCount: shopeeMetrics.orderCount + tiktokMetrics.orderCount,
    get roas() { return this.totalAds > 0 ? this.omzet / this.totalAds : 0; },
    get cir() { return this.omzet > 0 ? (this.totalAds / this.omzet) * 100 : 0; },
    get cpa() { return this.orderCount > 0 ? this.totalAds / this.orderCount : 0; }
  };

  const formatRp = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);

  // Chart Configuration
  const chartOptions = {
    chart: { type: 'bar', fontFamily: 'inherit', toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 6, horizontal: false, columnWidth: '45%' } },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: { categories: ['Shopee', 'TikTok Shop', 'Total Gabungan'] },
    yaxis: { labels: { formatter: (val: number) => `Rp ${(val/1000000).toFixed(1)}M` } },
    colors: ['#3B82F6', '#EF4444'], // Biru (Omzet), Merah (Iklan)
    fill: { opacity: 1 },
    legend: { position: 'top', horizontalAlign: 'left' },
    tooltip: { y: { formatter: (val: number) => formatRp(val) } }
  } as ApexCharts.ApexOptions;

  const chartSeries = [
    { name: 'Omzet Pendapatan', data: [shopeeMetrics.omzet, tiktokMetrics.omzet, globalMetrics.omzet] },
    { name: 'Biaya Iklan (Ad Spend)', data: [shopeeMetrics.totalAds, tiktokMetrics.totalAds, globalMetrics.totalAds] }
  ];

  if (loading) return <div className="p-10 flex justify-center items-center h-screen text-slate-500 font-medium">Menyiapkan Mesin Analitik ROAS...</div>;

  return (
    <main className="flex-1 p-8 bg-[#F8FAFC] min-h-screen font-sans text-slate-800">
      
      {/* HEADER */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Megaphone className="text-indigo-600" size={32} /> Marketing & ROAS Analytics
          </h1>
          <p className="text-[15px] text-slate-500 mt-2 font-medium">
            Analisis Return on Ad Spend (ROAS) dan efektivitas iklan marketplace Anda secara akurat.
          </p>
        </div>
        
        {/* FILTER TANGGAL */}
        <div className="flex gap-4">
          <input 
            type="date" 
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-indigo-500"
          />
          <span className="flex items-center text-slate-400">s/d</span>
          <input 
            type="date" 
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* INPUT MANUAL TOP-UP IKLAN */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-8 flex items-center gap-6">
        <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white shrink-0 shadow-md">
          <Wallet size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-indigo-900 mb-1">Input Top-up Iklan Manual (Opsional)</h3>
          <p className="text-xs text-indigo-700 font-medium">Jika Anda melakukan Top-up iklan di luar potongan otomatis orderan, masukkan nominalnya di sini agar ROAS 100% akurat.</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">Rp</span>
            <input 
              type="number" 
              placeholder="Shopee Ads Spend"
              value={manualShopeeAds}
              onChange={(e) => setManualShopeeAds(e.target.value === '' ? '' : Number(e.target.value))}
              className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm font-bold w-48 focus:outline-none focus:border-[#EE4D2D] focus:ring-1 focus:ring-[#EE4D2D]"
            />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">Rp</span>
            <input 
              type="number" 
              placeholder="TikTok Ads Spend"
              value={manualTikTokAds}
              onChange={(e) => setManualTikTokAds(e.target.value === '' ? '' : Number(e.target.value))}
              className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm font-bold w-48 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>
      </div>

      {/* GLOBAL METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <MetricCard label="Total Omzet (Revenue)" value={formatRp(globalMetrics.omzet)} icon={<TrendingUp />} color="text-emerald-600 bg-emerald-50 border-emerald-200" />
        <MetricCard label="Total Biaya Iklan (Cost)" value={formatRp(globalMetrics.totalAds)} icon={<TrendingDown />} color="text-red-600 bg-red-50 border-red-200" />
        
        {/* KARTU ROAS CANGGIH */}
        <div className={`p-6 rounded-2xl border flex flex-col justify-center relative overflow-hidden ${globalMetrics.roas >= 5 ? 'bg-emerald-600 border-emerald-700 text-white' : globalMetrics.roas >= 2.5 ? 'bg-amber-500 border-amber-600 text-white' : 'bg-red-600 border-red-700 text-white'}`}>
          <div className="absolute right-4 top-4 bg-white/20 p-2 rounded-xl"><Target size={24} /></div>
          <p className="text-sm font-bold opacity-90 mb-1">Global ROAS</p>
          <h3 className="text-4xl font-black">{globalMetrics.roas.toFixed(2)}x</h3>
          <p className="text-xs mt-2 font-medium bg-white/20 self-start px-2 py-1 rounded-md">
            {globalMetrics.roas >= 5 ? "Kinerja Iklan Sangat Baik 🔥" : globalMetrics.roas >= 2.5 ? "Kinerja Standar / Balik Modal ⚖️" : "Iklan Boncos / Rugi ⚠️"}
          </p>
        </div>

        {/* KARTU A/S RATIO CANGGIH */}
        <div className="bg-slate-900 border-slate-800 text-white p-6 rounded-2xl border flex flex-col justify-center relative shadow-lg">
          <div className="absolute right-4 top-4 bg-white/10 p-2 rounded-xl"><Percent size={24} /></div>
          <p className="text-sm font-bold text-slate-400 mb-1">A/S Ratio (CIR)</p>
          <h3 className="text-4xl font-black">{globalMetrics.cir.toFixed(2)}%</h3>
          <p className="text-xs text-slate-400 mt-2 font-medium">Batas aman sehat: Dibawah 15%</p>
        </div>
      </div>

      {/* MARKETPLACE COMPARISON */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* SHOPEE CARD */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 bg-orange-100 text-[#EE4D2D] rounded-xl flex items-center justify-center"><ShoppingBag size={20}/></div>
            <h2 className="text-xl font-bold text-slate-900">Shopee Analytics</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div><p className="text-xs font-bold text-slate-400 mb-1">Omzet Shopee</p><p className="text-lg font-bold text-slate-800">{formatRp(shopeeMetrics.omzet)}</p></div>
            <div><p className="text-xs font-bold text-slate-400 mb-1">Shopee Ads Spend</p><p className="text-lg font-bold text-red-600">{formatRp(shopeeMetrics.totalAds)}</p></div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 flex justify-between items-center border border-slate-100">
            <div className="text-center w-1/3">
              <p className="text-[10px] font-bold text-slate-500 uppercase">ROAS</p>
              <p className={`text-2xl font-black ${shopeeMetrics.roas >= 4 ? 'text-emerald-600' : 'text-red-500'}`}>{shopeeMetrics.roas.toFixed(2)}x</p>
            </div>
            <div className="w-px h-10 bg-slate-200"></div>
            <div className="text-center w-1/3">
              <p className="text-[10px] font-bold text-slate-500 uppercase">A/S Ratio</p>
              <p className="text-2xl font-black text-slate-800">{shopeeMetrics.cir.toFixed(1)}%</p>
            </div>
            <div className="w-px h-10 bg-slate-200"></div>
            <div className="text-center w-1/3">
              <p className="text-[10px] font-bold text-slate-500 uppercase">CPA / Order</p>
              <p className="text-xl font-black text-slate-800">{formatRp(shopeeMetrics.cpa)}</p>
            </div>
          </div>
        </div>

        {/* TIKTOK CARD */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 bg-slate-100 text-slate-900 rounded-xl flex items-center justify-center"><ShoppingBag size={20}/></div>
            <h2 className="text-xl font-bold text-slate-900">TikTok Analytics</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div><p className="text-xs font-bold text-slate-400 mb-1">Omzet TikTok</p><p className="text-lg font-bold text-slate-800">{formatRp(tiktokMetrics.omzet)}</p></div>
            <div><p className="text-xs font-bold text-slate-400 mb-1">TikTok Ads Spend</p><p className="text-lg font-bold text-red-600">{formatRp(tiktokMetrics.totalAds)}</p></div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 flex justify-between items-center border border-slate-100">
            <div className="text-center w-1/3">
              <p className="text-[10px] font-bold text-slate-500 uppercase">ROAS</p>
              <p className={`text-2xl font-black ${tiktokMetrics.roas >= 4 ? 'text-emerald-600' : 'text-red-500'}`}>{tiktokMetrics.roas.toFixed(2)}x</p>
            </div>
            <div className="w-px h-10 bg-slate-200"></div>
            <div className="text-center w-1/3">
              <p className="text-[10px] font-bold text-slate-500 uppercase">A/S Ratio</p>
              <p className="text-2xl font-black text-slate-800">{tiktokMetrics.cir.toFixed(1)}%</p>
            </div>
            <div className="w-px h-10 bg-slate-200"></div>
            <div className="text-center w-1/3">
              <p className="text-[10px] font-bold text-slate-500 uppercase">CPA / Order</p>
              <p className="text-xl font-black text-slate-800">{formatRp(tiktokMetrics.cpa)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* CHART SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-[16px] font-bold text-slate-900 mb-6">Komparasi Omzet vs Biaya Iklan</h3>
        <div className="h-80 w-full">
          <ReactApexChart options={chartOptions} series={chartSeries} type="bar" height={320} />
        </div>
      </div>

    </main>
  );
}

function MetricCard({ label, value, icon, color }: any) {
  return (
    <div className={`p-6 rounded-2xl border shadow-sm flex flex-col justify-center relative overflow-hidden ${color}`}>
      <div className="absolute right-4 top-4 bg-white/50 p-2 rounded-xl text-slate-700">{icon}</div>
      <p className="text-sm font-bold opacity-80 mb-1">{label}</p>
      <h3 className="text-3xl font-black tracking-tight">{value}</h3>
    </div>
  );
}