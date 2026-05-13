"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { 
  Calendar, Bell, ChevronDown, Package, Receipt, Wallet, TrendingUp, 
  Briefcase, Megaphone, Wrench, Users2, Truck, FileBox, ShoppingBag, TrendingDown, CircleDollarSign
} from "lucide-react";

// WAJIB: Import ApexCharts secara dinamis
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  
  // STATE FILTER TANGGAL
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState({ start: '', end: '' });

  const [stats, setStats] = useState({
    omzetShopee: 0, omzetTikTok: 0,
    netShopee: 0, netTikTok: 0,
    labaShopee: 0, labaTikTok: 0,
    pengeluaranShopee: 0, pengeluaranTikTok: 0,
    orderShopee: 0, orderTikTok: 0,
    adminKomisi: 0, iklanPromosi: 0, ongkirVoucher: 0, pajak: 0, lainnya: 0,
    trendData: [] as any[],
    profitMarginData: [] as any[],
    topOrders: [] as any[],
    internalCosts: { operasional: 0, marketing: 0, maintenance: 0, karyawan: 0, beliBahan: 0, gaji: 0, perlengkapan: 0 }
  });

  const handlePresetDate = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    setTempDateRange({ start: formatDate(start), end: formatDate(end) });
  };

  useEffect(() => {
    const fetchRealData = async () => {
      setLoading(true);
      try {
        const [resShopee, resTikTok, resExpenses] = await Promise.all([
          fetch('/api/finance-shopee').catch(() => null),
          fetch('/api/finance-tiktok').catch(() => null),
          fetch('/api/expenses').catch(() => null)
        ]);

        let sOmzet = 0, sNet = 0, sLaba = 0, sOrders = 0, sPengeluaran = 0;
        let tOmzet = 0, tNet = 0, tLaba = 0, tOrders = 0, tPengeluaran = 0;
        let cAdminKomisi = 0, cIklan = 0, cOngkirVoucher = 0, cPajak = 0, cLainnya = 0;
        
        const trendMap = new Map();
        const topOrdersList: any[] = [];

        // Helper: Standarisasi format tanggal ke YYYY-MM-DD untuk filter
        const normalizeDate = (dateStr: string) => {
          if (!dateStr || dateStr === "-") return null;
          const d = dateStr.split(" ")[0];
          if (d.includes("/")) {
            const parts = d.split("/");
            if (parts.length === 3 && parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
          }
          return d;
        };

        // 1. OLAH DATA SHOPEE
        if (resShopee && resShopee.ok) {
          const shopee = await resShopee.json();
          shopee.forEach((item: any) => {
            const nd = normalizeDate(item.date || item.createdDate);
            if (dateRange.start && dateRange.end && nd) {
              if (nd < dateRange.start || nd > dateRange.end) return; // Skip jika di luar tanggal
            }

            sOrders++;
            const omzet = Number(item.hargaProduk || 0);
            const net = Number(item.net || 0);
            const laba = Number(item.labaBersih || 0);
            const fees = Number(item.fees || 0);
            
            sOmzet += omzet; sNet += net; sLaba += laba; sPengeluaran += fees;

            cAdminKomisi += (Number(item.admin) || 0) + (Number(item.layanan) || 0) + (Number(item.ams) || 0) + (Number(item.komisiAffiliate) || 0);
            cIklan += (Number(item.shopeeAds) || 0);
            cOngkirVoucher += (Number(item.ongkirXtra) || 0) + (Number(item.cashbackXtra) || 0) + (Number(item.voucherPenjual) || 0) + (Number(item.cashbackPenjual) || 0);
            cPajak += (Number(item.pajak) || 0);
            cLainnya += (Number(item.biayaCod) || 0) + (Number(item.transfer) || 0) + (Number(item.materai) || 0) + (Number(item.penalti) || 0) + (Number(item.penyesuaianSistem) || 0) + (Number(item.refund) || 0) + (Number(item.retur) || 0);

            if (omzet > 0) topOrdersList.push({ name: item.orderId, marketplace: 'Shopee', omzet, profit: laba });

            if (nd) {
              const tData = trendMap.get(nd) || { name: nd, shopee: 0, tiktok: 0, total: 0, profit: 0 };
              tData.shopee += omzet; tData.total += omzet; tData.profit += laba;
              trendMap.set(nd, tData);
            }
          });
        }

        // 2. OLAH DATA TIKTOK
        if (resTikTok && resTikTok.ok) {
          const tiktok = await resTikTok.json();
          tiktok.forEach((item: any) => {
            const nd = normalizeDate(item.date || item.createdDate);
            if (dateRange.start && dateRange.end && nd) {
              if (nd < dateRange.start || nd > dateRange.end) return; // Skip jika di luar tanggal
            }

            tOrders++;
            const omzet = Number(item.subtotal || item.revenue || 0);
            const net = Number(item.net || 0);
            const laba = Number(item.labaBersih || 0);
            const fees = Number(item.fees || 0);

            tOmzet += omzet; tNet += net; tLaba += laba; tPengeluaran += fees;

            cAdminKomisi += (Number(item.platformFee) || 0) + (Number(item.paymentFee) || 0) + (Number(item.affiliateFee) || 0);
            cOngkirVoucher += (Number(item.freeShippingFee) || 0) + (Number(item.sellerDiscount) || 0);
            cPajak += (Number(item.tax) || 0);
            cLainnya += (Number(item.codFee) || 0) + (Number(item.adjustment) || 0);

            if (omzet > 0) topOrdersList.push({ name: item.orderId, marketplace: 'TikTok', omzet, profit: laba });

            if (nd) {
              const tData = trendMap.get(nd) || { name: nd, shopee: 0, tiktok: 0, total: 0, profit: 0 };
              tData.tiktok += omzet; tData.total += omzet; tData.profit += laba;
              trendMap.set(nd, tData);
            }
          });
        }

        // 3. OLAH PENGELUARAN KANTOR INTERNAL (DIHUBUNGKAN KE DATA REAL)
        let op=0, mkt=0, mtc=0, krw=0, bhn=0, gj=0, plg=0;
        if (resExpenses && resExpenses.ok) {
          const exps = await resExpenses.json();
          exps.forEach((ex: any) => {
            // Coba ambil dari berbagai kemungkinan nama kolom database
            const rawDate = ex.tanggal || ex.date || ex.created_at;
            let nd = null;
            if (rawDate) {
              // Jika formatnya sudah standar ISO (2026-05-12T...)
              nd = rawDate.split('T')[0];
            }
            
            if (dateRange.start && dateRange.end && nd) {
              if (nd < dateRange.start || nd > dateRange.end) return; // Skip jika di luar tanggal
            }

            const val = Number(ex.jumlah || ex.amount || 0);
            const cat = String(ex.kategori || ex.category || "").toLowerCase();
            
            if(cat.includes("operasional")) op+=val;
            else if(cat.includes("marketing") || cat.includes("iklan")) mkt+=val;
            else if(cat.includes("maintenance") || cat.includes("perbaikan")) mtc+=val;
            else if(cat.includes("karyawan") && !cat.includes("gaji")) krw+=val;
            else if(cat.includes("bahan") || cat.includes("produksi")) bhn+=val;
            else if(cat.includes("gaji")) gj+=val;
            else if(cat.includes("perlengkapan") || cat.includes("atk")) plg+=val;
            else op+=val; // Jika kategorinya "Lainnya" atau tidak dikenali, masuk ke Operasional
          });
        }

        // 4. SUSUN TREND DATA
        const finalTrendData = Array.from(trendMap.values())
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(d => ({
            ...d,
            margin: d.total > 0 ? Number(((d.profit / d.total) * 100).toFixed(1)) : 0
          }));

        setStats({
          omzetShopee: sOmzet, omzetTikTok: tOmzet,
          netShopee: sNet, netTikTok: tNet,
          labaShopee: sLaba, labaTikTok: tLaba,
          pengeluaranShopee: sPengeluaran, pengeluaranTikTok: tPengeluaran,
          orderShopee: sOrders, orderTikTok: tOrders,
          adminKomisi: cAdminKomisi, iklanPromosi: cIklan, ongkirVoucher: cOngkirVoucher, pajak: cPajak, lainnya: cLainnya,
          trendData: finalTrendData.length > 0 ? finalTrendData : [{ name: '-', shopee: 0, tiktok: 0, total: 0, profit: 0, margin: 0 }],
          profitMarginData: finalTrendData,
          // Menampilkan Top Orders berdasarkan urutan waktu masuknya ke sistem (Terbaru)
          topOrders: topOrdersList.reverse().sort((a, b) => b.profit - a.profit).slice(0, 5),
          internalCosts: { operasional: op, marketing: mkt, maintenance: mtc, karyawan: krw, beliBahan: bhn, gaji: gj, perlengkapan: plg }
        });

      } catch (error) { console.error(error); }
      finally { setLoading(false); }
    };
    fetchRealData();
  }, [dateRange]); // Re-fetch data saat Filter Tanggal berubah

  const formatRp = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);

  // Perhitungan Global Dashboard
  const totalOmzet = stats.omzetShopee + stats.omzetTikTok;
  const totalPengeluaranMP = stats.pengeluaranShopee + stats.pengeluaranTikTok;
  const totalPengeluaranInternal = Object.values(stats.internalCosts).reduce((a, b) => a + b, 0);
  const totalPengeluaranAll = totalPengeluaranMP + totalPengeluaranInternal;
  
  const totalLabaBersihMp = stats.labaShopee + stats.labaTikTok;
  const trueNetProfit = totalLabaBersihMp - totalPengeluaranInternal;
  const totalOrder = stats.orderShopee + stats.orderTikTok;

  // ==========================================
  // CONFIGURASI APEXCHARTS
  // ==========================================
  const chartMarketplace = {
    series: [stats.omzetShopee, stats.omzetTikTok],
    options: {
      chart: { type: 'donut', fontFamily: 'inherit' },
      labels: ['Shopee', 'TikTok Shop'],
      colors: ['#EE4D2D', '#000000'],
      dataLabels: { enabled: false },
      plotOptions: { pie: { donut: { size: '75%' } } },
      stroke: { width: 0 },
      legend: { show: false },
      tooltip: { style: { fontSize: '13px' }, y: { formatter: (val: number) => formatRp(val) } }
    } as ApexCharts.ApexOptions
  };

  const chartTrend = {
    series: [
      { name: 'Total Omzet', data: stats.trendData.map(d => d.total) },
      { name: 'Shopee', data: stats.trendData.map(d => d.shopee) },
      { name: 'TikTok', data: stats.trendData.map(d => d.tiktok) }
    ],
    options: {
      chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit', zoom: { enabled: false } },
      colors: ['#8B5CF6', '#EE4D2D', '#000000'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: [3, 2, 2] },
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.2, opacityTo: 0, stops: [0, 90, 100] } },
      xaxis: { categories: stats.trendData.map(d => d.name), axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '12px', colors: '#94A3B8' } } },
      yaxis: { labels: { style: { fontSize: '12px', colors: '#94A3B8' }, formatter: (val: number) => `Rp ${(val/1000000).toFixed(1)}M` } },
      grid: { borderColor: '#F1F5F9', strokeDashArray: 4 },
      legend: { show: false },
      tooltip: { style: { fontSize: '13px' }, y: { formatter: (val: number) => formatRp(val) } }
    } as ApexCharts.ApexOptions
  };

  const chartProfitMargin = {
    series: [
      { name: 'Profit Bersih', type: 'column', data: stats.profitMarginData.map(d => d.profit) },
      { name: 'Margin (%)', type: 'line', data: stats.profitMarginData.map(d => d.margin) }
    ],
    options: {
      chart: { type: 'line', toolbar: { show: false }, fontFamily: 'inherit' },
      colors: ['#10B981', '#8B5CF6'],
      stroke: { width: [0, 3], curve: 'smooth' },
      xaxis: { categories: stats.profitMarginData.map(d => d.name), axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '12px', colors: '#94A3B8' } } },
      yaxis: [
        { title: { text: "Profit", style: { fontSize: '12px' } }, labels: { style: { fontSize: '12px', colors: '#94A3B8' }, formatter: (val: number) => `Rp ${(val/1000000).toFixed(1)}M` } },
        { opposite: true, title: { text: "Margin %", style: { fontSize: '12px' } }, labels: { style: { fontSize: '12px', colors: '#94A3B8' }, formatter: (val: number) => val + '%' } }
      ],
      grid: { borderColor: '#F1F5F9', strokeDashArray: 4 },
      legend: { show: false },
      tooltip: { shared: true, intersect: false, style: { fontSize: '13px' }, y: { formatter: (val: number, { seriesIndex }: any) => seriesIndex === 0 ? formatRp(val) : val + '%' } }
    } as ApexCharts.ApexOptions
  };

  if (loading) return <div className="p-10 text-[15px] text-slate-500 font-medium flex justify-center items-center h-screen">Menyiapkan Data Dashboard...</div>;

  return (
    <main className="flex-1 p-8 bg-[#F8FAFC] min-h-screen font-sans text-slate-800">
      
      {/* --- HEADER --- */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-[15px] text-slate-500 mt-1 font-medium">Ringkasan keuangan performa toko gabungan (Real-Data)</p>
        </div>
        <div className="flex items-center gap-4">
          
          {/* DATE PICKER CUSTOM (Pop-up) */}
          <div className="relative z-50">
            <button 
              onClick={() => {
                setTempDateRange(dateRange);
                setIsDatePickerOpen(!isDatePickerOpen);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors text-[14px] font-medium text-slate-700"
            >
              <Calendar size={18} className="text-indigo-500" />
              {dateRange.start && dateRange.end 
                ? `${dateRange.start} - ${dateRange.end}` 
                : "Semua Waktu"}
            </button>

            {isDatePickerOpen && (
              <div className="absolute right-0 top-full mt-2 w-[500px] bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col overflow-hidden">
                <div className="flex flex-row h-[280px]">
                  {/* Sidebar Preset */}
                  <div className="w-40 border-r border-slate-100 bg-slate-50/50 p-2 flex flex-col gap-1 overflow-y-auto">
                    <button onClick={() => handlePresetDate(0)} className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors">Hari ini</button>
                    <button onClick={() => handlePresetDate(1)} className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors">Kemarin</button>
                    <button onClick={() => handlePresetDate(7)} className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors">7 hari terakhir</button>
                    <button onClick={() => handlePresetDate(30)} className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors">30 hari terakhir</button>
                    <button onClick={() => handlePresetDate(90)} className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors">3 bulan terakhir</button>
                    <button onClick={() => setTempDateRange({start: '', end: ''})} className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors">Semua waktu</button>
                  </div>
                  
                  {/* Input Area */}
                  <div className="flex-1 p-5 flex flex-col">
                    <h4 className="font-medium text-slate-900 mb-4">Atur Tanggal Kustom</h4>
                    <div className="flex items-center gap-4 mb-auto">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Mulai Tanggal</label>
                        <input 
                          type="date" 
                          value={tempDateRange.start}
                          onChange={(e) => setTempDateRange(prev => ({...prev, start: e.target.value}))}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Sampai Tanggal</label>
                        <input 
                          type="date" 
                          value={tempDateRange.end}
                          onChange={(e) => setTempDateRange(prev => ({...prev, end: e.target.value}))}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Aksi Bawah */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <button 
                        onClick={() => { setDateRange({start: '', end: ''}); setIsDatePickerOpen(false); }}
                        className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-md uppercase tracking-wider transition-colors"
                      >
                        Reset
                      </button>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setIsDatePickerOpen(false)}
                          className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => {
                            setDateRange(tempDateRange);
                            setIsDatePickerOpen(false);
                          }}
                          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
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

          <div className="w-11 h-11 bg-white border border-slate-200 rounded-full flex items-center justify-center relative shadow-sm">
            <Bell size={20} className="text-slate-600" />
            <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
          </div>
        </div>
      </div>

      {/* --- RINGKASAN BUKU KAS & OPERASIONAL INTERNAL --- */}
      <div className="mb-10">
        <h3 className="text-[14px] font-bold text-slate-500 uppercase tracking-wider mb-4">Pengeluaran Internal Bisnis</h3>
        {/* Responsive Grid: Bertahap dari 2 -> 3 -> 4 -> 7 kolom */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3 md:gap-4">
          <MiniMetricCard label="Operasional" value={formatRp(stats.internalCosts.operasional)} icon={<Briefcase />} color="text-amber-500 bg-amber-50" />
          <MiniMetricCard label="Marketing" value={formatRp(stats.internalCosts.marketing)} icon={<Megaphone />} color="text-amber-500 bg-amber-50" />
          <MiniMetricCard label="Maintenance" value={formatRp(stats.internalCosts.maintenance)} icon={<Wrench />} color="text-amber-500 bg-amber-50" />
          <MiniMetricCard label="Karyawan" value={formatRp(stats.internalCosts.karyawan)} icon={<Users2 />} color="text-amber-500 bg-amber-50" />
          <MiniMetricCard label="Beli Bahan" value={formatRp(stats.internalCosts.beliBahan)} icon={<Truck />} color="text-amber-500 bg-amber-50" />
          <MiniMetricCard label="Biaya Gaji" value={formatRp(stats.internalCosts.gaji)} icon={<Wallet />} color="text-amber-500 bg-amber-50" />
          <MiniMetricCard label="Perlengkapan" value={formatRp(stats.internalCosts.perlengkapan)} icon={<FileBox />} color="text-amber-500 bg-amber-50" />
        </div>
      </div>

      {/* --- ROW 1: TOP 5 METRICS --- */}
      {/* Responsive Grid: Bertahap dari 1 -> 2 -> 3 -> 5 kolom */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-5 mb-8">
        <TopCard title="Total Omzet Shopee" value={formatRp(stats.omzetShopee)} icon={<ShoppingBag />} iconBg="bg-orange-100" iconColor="text-[#EE4D2D]" data={stats.trendData.map(d=>d.shopee)} stroke="#EE4D2D" />
        <TopCard title="Total Omzet TikTok" value={formatRp(stats.omzetTikTok)} icon={<ShoppingBag />} iconBg="bg-slate-200" iconColor="text-slate-900" data={stats.trendData.map(d=>d.tiktok)} stroke="#000000" />
        <TopCard title="Total Pengeluaran (Semua)" value={formatRp(totalPengeluaranAll)} icon={<TrendingDown />} iconBg="bg-red-100" iconColor="text-red-600" data={stats.trendData.map(d=>d.total)} stroke="#EF4444" />
        <TopCard title="Laba Bersih Bisnis" value={formatRp(trueNetProfit)} icon={<CircleDollarSign />} iconBg="bg-emerald-100" iconColor="text-emerald-600" data={stats.trendData.map(d=>d.profit)} stroke="#10B981" isHighlight />
        <TopCard title="Total Order Gabungan" value={totalOrder.toLocaleString()} icon={<Package />} iconBg="bg-blue-100" iconColor="text-blue-600" data={stats.trendData.map(d=>d.total)} stroke="#3B82F6" />
      </div>

      {/* --- HOLY GRAIL RESPONSIVE LAYOUT (MAIN & RIGHT ASIDE) --- */}
      <div className="flex flex-col xl:flex-row gap-6 mb-8">
        
        {/* MAIN CONTENT (Kiri / Tengah - Mengambil sisa ruang) */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          
          {/* Baris Atas Main: Donut Chart & Area Chart */}
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-1/3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <h3 className="text-[16px] font-bold text-slate-900 mb-4">Omzet per Marketplace</h3>
              <div className="flex-1 relative flex items-center justify-center -mt-4">
                <ReactApexChart options={chartMarketplace.options} series={chartMarketplace.series} type="donut" height={240} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
                  <span className="text-[12px] text-slate-500 font-medium">Total Omzet</span>
                  <span className="text-[16px] font-black text-slate-800">{formatRp(totalOmzet)}</span>
                </div>
              </div>
              <div className="mt-4 space-y-4">
                <div className="flex justify-between items-center"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#EE4D2D]" /><span className="text-[14px] font-medium text-slate-600">Shopee</span></div><div className="text-right"><p className="text-[14px] font-bold text-slate-800">{formatRp(stats.omzetShopee)}</p></div></div>
                <div className="flex justify-between items-center"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#000000]" /><span className="text-[14px] font-medium text-slate-600">TikTok Shop</span></div><div className="text-right"><p className="text-[14px] font-bold text-slate-800">{formatRp(stats.omzetTikTok)}</p></div></div>
              </div>
            </div>

            <div className="flex-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[16px] font-bold text-slate-900">Tren Omzet Berjalan</h3>
                <div className="flex items-center gap-4 text-[12px] font-bold">
                  <span className="flex items-center gap-1.5 text-slate-600"><div className="w-2.5 h-2.5 rounded-full bg-[#EE4D2D]" /> Shopee</span>
                  <span className="flex items-center gap-1.5 text-slate-600"><div className="w-2.5 h-2.5 rounded-full bg-[#000000]" /> TikTok Shop</span>
                  <span className="flex items-center gap-1.5 text-slate-600"><div className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" /> Total</span>
                </div>
              </div>
              <div className="flex-1 w-full -ml-3">
                <ReactApexChart options={chartTrend.options} series={chartTrend.series} type="area" height={280} />
              </div>
            </div>
          </div>

          {/* Baris Bawah Main: Line Chart Profit */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[16px] font-bold text-slate-900">Profit Bersih Harian & Margin</h3>
              <div className="flex items-center gap-4 text-[12px] font-bold">
                <span className="flex items-center gap-1.5 text-slate-600"><div className="w-2.5 h-2.5 rounded bg-[#10B981]" /> Profit</span>
                <span className="flex items-center gap-1.5 text-slate-600"><div className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" /> Margin (%)</span>
              </div>
            </div>
            <div className="w-full -ml-3">
              <ReactApexChart options={chartProfitMargin.options} series={chartProfitMargin.series} type="line" height={280} />
            </div>
          </div>

        </div>

        {/* RIGHT ASIDE (Bilah Kanan - Ukuran Fix) */}
        <aside className="w-full xl:w-[350px] 2xl:w-[400px] flex flex-col gap-6 shrink-0">
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-[16px] font-bold text-slate-900 mb-6">Rincian Potongan MP</h3>
            <div className="space-y-6 flex-1 mt-2">
              <ProgressRow label="Biaya Admin & Komisi" value={stats.adminKomisi} total={totalPengeluaranMP} color="bg-orange-500" icon={<Receipt size={14}/>} />
              <ProgressRow label="Iklan & Promosi" value={stats.iklanPromosi} total={totalPengeluaranMP} color="bg-blue-500" icon={<TrendingUp size={14}/>} />
              <ProgressRow label="Ongkir & Voucher" value={stats.ongkirVoucher} total={totalPengeluaranMP} color="bg-slate-800" icon={<Package size={14}/>} />
              <ProgressRow label="Pajak & Biaya Lainnya" value={stats.lainnya + stats.pajak} total={totalPengeluaranMP} color="bg-emerald-500" icon={<Wallet size={14}/>} />
            </div>
            <div className="mt-8 pt-5 border-t border-slate-200 flex justify-between items-center">
              <span className="text-[14px] font-bold text-slate-500">Total Potongan MP</span>
              <span className="text-[16px] font-black text-red-600">-{formatRp(totalPengeluaranMP)}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-[16px] font-bold text-slate-900 mb-5">Transaksi Laba Tertinggi</h3>
            <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-wider border-b pb-3 mb-4">
              <span className="w-1/2">Order ID</span>
              <span className="w-1/4 text-right">Omzet</span>
              <span className="w-1/4 text-right">Profit</span>
            </div>
            <div className="space-y-5 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
              {stats.topOrders.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-[13px]">
                  <div className="w-1/2 flex items-center gap-3 pr-2">
                    <div className={`p-2 rounded-lg shrink-0 ${item.marketplace === 'Shopee' ? 'bg-orange-100 text-[#EE4D2D]' : 'bg-slate-100 text-slate-800'}`}>
                      <Package size={16} />
                    </div>
                    <span className="font-bold text-slate-700 truncate" title={item.name}>{item.name}</span>
                  </div>
                  <span className="w-1/4 text-right font-medium text-slate-600">{formatRp(item.omzet)}</span>
                  <span className="w-1/4 text-right font-black text-emerald-600">{formatRp(item.profit)}</span>
                </div>
              ))}
            </div>
          </div>

        </aside>

      </div>
    </main>
  );
}

// ==========================================
// Sub-Komponen UI (Komponen Kecil)
// ==========================================

function MiniMetricCard({ label, value, icon, color }: any) {
  return (
    <div className={`p-4 rounded-2xl border border-slate-200 shadow-sm bg-white flex items-center gap-3 hover:-translate-y-1 transition-transform duration-300 min-w-0`}>
      <div className={`p-2.5 rounded-xl shrink-0 ${color}`}>
        {React.cloneElement(icon, { size: 18 })}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 truncate" title={label}>{label}</p>
        <p className="text-[15px] font-black text-slate-900 leading-none tracking-tight truncate" title={value}>{value}</p>
      </div>
    </div>
  );
}

function TopCard({ title, value, icon, iconBg, iconColor, data, stroke, isHighlight = false }: any) {
  const sparklineOptions = {
    chart: { type: 'line', sparkline: { enabled: true }, animations: { enabled: true } },
    stroke: { curve: 'smooth', width: 2 },
    colors: [stroke],
    tooltip: { fixed: { enabled: false }, x: { show: false }, y: { title: { formatter: () => '' } }, marker: { show: false } }
  } as ApexCharts.ApexOptions;

  return (
    <div className={`p-4 rounded-xl border ${isHighlight ? 'bg-emerald-600 border-emerald-700 text-white shadow-md' : 'bg-white border-slate-200 text-slate-900 shadow-sm'} flex flex-col justify-between hover:shadow-md transition-shadow min-w-0`}>
      <div className="flex items-center gap-2.5 mb-3 min-w-0">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isHighlight ? 'bg-white/20 text-white' : `${iconBg} ${iconColor}`}`}>
          {React.cloneElement(icon, { size: 16 })}
        </div>
        <span className={`text-[12px] font-bold tracking-tight truncate flex-1 ${isHighlight ? 'text-emerald-100' : 'text-slate-500'}`} title={title}>
          {title}
        </span>
      </div>
      <div className="min-w-0">
        <h3 className={`text-[20px] font-black tracking-tight mb-1.5 leading-none truncate ${isHighlight ? 'text-white' : 'text-slate-900'}`} title={value}>
          {value}
        </h3>
        <div className="h-8 w-full opacity-80">
          <ReactApexChart options={sparklineOptions} series={[{ data: data }]} type="line" height={32} />
        </div>
      </div>
    </div>
  );
}

function ProgressRow({ label, value, total, color, icon }: any) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const formatRp = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);
  return (
    <div>
      <div className="flex justify-between items-center text-[13px] mb-2">
        <div className="flex items-center gap-2 font-medium text-slate-700">
           <div className={`p-1.5 rounded-md text-white ${color} shadow-sm`}>{icon}</div> {label}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-800">{formatRp(value)}</span>
          <span className="text-slate-400 font-bold w-10 text-right">{percentage.toFixed(1)}%</span>
        </div>
      </div>
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}