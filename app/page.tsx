"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { 
  LayoutDashboard, Upload, BarChart3, Settings, 
  Table as TableIcon, ChevronLeft, ChevronRight, CheckCircle2,
  WalletCards, TrendingDown, CircleDollarSign, ArrowUpDown, ArrowUp, ArrowDown,
  Eye, X, Search, Calendar, Save, Check, LogOut, Bell, ChevronDown, Package, Receipt, Wallet, TrendingUp, Briefcase, Megaphone, Wrench, Users2, Truck, FileBox, ShoppingBag, RefreshCcw
} from "lucide-react";

// WAJIB: Import ApexCharts secara dinamis
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    omzetShopee: 0, omzetTikTok: 0,
    netShopee: 0, netTikTok: 0,
    pengeluaranShopee: 0, pengeluaranTikTok: 0,
    orderShopee: 0, orderTikTok: 0,
    adminKomisi: 0, iklanPromosi: 0, ongkirVoucher: 0, pajak: 0, lainnya: 0,
    refundRetur: 0,
    trendData: [] as any[],
    profitMarginData: [] as any[],
    topOrders: [] as any[],

    // STATE BARU: Biaya Operasional Internal (Sesuai Referensi Gambar)
    internalCosts: {
      operasional: 0,
      marketing: 0,
      maintenance: 0,
      karyawan: 0,
      beliBahan: 0,
      gaji: 0,
      perlengkapan: 0
    }
  });

  useEffect(() => {
    const fetchRealData = async () => {
      try {
        const [resShopee, resTikTok] = await Promise.all([
          fetch('/api/finance-shopee'),
          fetch('/api/finance-tiktok')
        ]);

        let sOmzet = 0, sNet = 0, sOrders = 0, sPengeluaran = 0;
        let tOmzet = 0, tNet = 0, tOrders = 0, tPengeluaran = 0;
        
        let cAdminKomisi = 0, cIklan = 0, cOngkirVoucher = 0, cPajak = 0, cLainnya = 0, cRefundRetur = 0;
        const trendMap = new Map();
        const topOrdersList: any[] = [];

        if (resShopee.ok) {
          const shopee = await resShopee.json();
          sOrders = shopee.length;
          
          shopee.forEach((item: any, index: number) => {
            const omzet = Number(item.originalPrice || 0);
            const net = Number(item.net || 0);
            const potongan = omzet - net;
            
            sOmzet += omzet;
            sNet += net;
            sPengeluaran += potongan;

            cAdminKomisi += Math.abs(item.adminFee || 0) + Math.abs(item.serviceFee || 0) + Math.abs(item.ams || 0) + Math.abs(item.affiliate || 0);
            cIklan += Math.abs(item.shopeeAds || 0);
            cOngkirVoucher += Math.abs(item.freeOngkirXtra || 0) + Math.abs(item.voucherSeller || 0) + Math.abs(item.cashbackSeller || 0) + Math.abs(item.cashbackXtra || 0);
            cPajak += Math.abs(item.pajak || 0);
            cRefundRetur += Math.abs(item.refund || 0) + Math.abs(item.retur || 0);
            cLainnya += Math.abs(item.biayaCod || 0) + Math.abs(item.transferBank || 0) + Math.abs(item.penalti || 0) + Math.abs(item.penyesuaianSistem || 0);

            if (omzet > 0) {
              topOrdersList.push({
                name: item.orderId || `Shopee Order #${index + 1}`,
                marketplace: 'Shopee',
                omzet: omzet,
                profit: net * 0.7,
              });
            }

            const period = Math.floor((index / sOrders) * 10);
            const tData = trendMap.get(period) || { name: `P-${period+1}`, shopee: 0, tiktok: 0, total: 0, profit: 0 };
            tData.shopee += omzet;
            tData.total += omzet;
            tData.profit += (net * 0.7);
            trendMap.set(period, tData);
          });
        }

        if (resTikTok.ok) {
          const tiktok = await resTikTok.json();
          tOrders = tiktok.length;

          tiktok.forEach((item: any, index: number) => {
            const omzet = Number(item.originalPrice || 0);
            const net = Number(item.net || 0);
            const potongan = omzet - net;

            tOmzet += omzet;
            tNet += net;
            tPengeluaran += potongan;

            cAdminKomisi += (potongan * 0.8);
            cLainnya += (potongan * 0.2);

            if (omzet > 0) {
              topOrdersList.push({
                name: item.orderId || `TikTok Order #${index + 1}`,
                marketplace: 'TikTok',
                omzet: omzet,
                profit: net * 0.7,
              });
            }

            const period = Math.floor((index / Math.max(tOrders, 1)) * 10);
            const tData = trendMap.get(period) || { name: `P-${period+1}`, shopee: 0, tiktok: 0, total: 0, profit: 0 };
            tData.tiktok += omzet;
            tData.total += omzet;
            tData.profit += (net * 0.7);
            trendMap.set(period, tData);
          });
        }

        const finalTrendData = Array.from(trendMap.values()).map(d => ({
          ...d,
          margin: d.total > 0 ? Number(((d.profit / d.total) * 100).toFixed(1)) : 0
        })).sort((a, b) => a.name.localeCompare(b.name));

        setStats({
          omzetShopee: sOmzet, omzetTikTok: tOmzet,
          netShopee: sNet, netTikTok: tNet,
          pengeluaranShopee: sPengeluaran, pengeluaranTikTok: tPengeluaran,
          orderShopee: sOrders, orderTikTok: tOrders,
          adminKomisi: cAdminKomisi, iklanPromosi: cIklan, ongkirVoucher: cOngkirVoucher, pajak: cPajak, lainnya: cLainnya,
          refundRetur: cRefundRetur,
          trendData: finalTrendData.length > 0 ? finalTrendData : [{ name: 'Data', shopee: 0, tiktok: 0, total: 0, profit: 0, margin: 0 }],
          profitMarginData: finalTrendData,
          topOrders: topOrdersList.sort((a, b) => b.profit - a.profit).slice(0, 4),
          internalCosts: {
            operasional: 0, // Siap disambung API Internal
            marketing: 0,
            maintenance: 0,
            karyawan: 0,
            beliBahan: 0,
            gaji: 0,
            perlengkapan: 0
          }
        });

      } catch (error) { console.error(error); }
      finally { setLoading(false); }
    };
    fetchRealData();
  }, []);

  const formatRp = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);

  // Perhitungan Global
  const totalOmzet = stats.omzetShopee + stats.omzetTikTok;
  
  // Total Pengeluaran Gabungan (Marketplace + Internal)
  const totalPengeluaranMP = stats.pengeluaranShopee + stats.pengeluaranTikTok;
  const totalPengeluaranInternal = Object.values(stats.internalCosts).reduce((a, b) => a + b, 0);
  const totalPengeluaranAll = totalPengeluaranMP + totalPengeluaranInternal;
  
  // Asumsi Laba Bersih = Dana Diterima - Total Pengeluaran Internal
  const totalDanaDiterima = stats.netShopee + stats.netTikTok;
  const totalUangBersih = totalDanaDiterima - totalPengeluaranInternal;
  
  const totalOrder = stats.orderShopee + stats.orderTikTok;

  // ==========================================
  // CONFIGURASI APEXCHARTS
  // ==========================================
  const chartMarketplace = {
    series: [stats.omzetShopee, stats.omzetTikTok],
    options: {
      chart: { type: 'donut', fontFamily: 'inherit' },
      labels: ['Shopee', 'TikTok Shop'],
      colors: ['#FF5722', '#000000'],
      dataLabels: { enabled: false },
      plotOptions: { pie: { donut: { size: '75%' } } },
      stroke: { width: 0 },
      legend: { show: false },
      tooltip: { style: { fontSize: '13px' }, y: { formatter: (val: number) => formatRp(val) } }
    } as ApexCharts.ApexOptions
  };

  const chartBiaya = {
    series: [stats.adminKomisi, stats.iklanPromosi, stats.ongkirVoucher, stats.pajak, stats.lainnya],
    options: {
      chart: { type: 'donut', fontFamily: 'inherit' },
      labels: ['Admin & Komisi', 'Iklan & Promosi', 'Ongkir & Voucher', 'Pajak', 'Lainnya'],
      colors: ['#FF5722', '#3B82F6', '#8B5CF6', '#EAB308', '#94A3B8'],
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
      colors: ['#8B5CF6', '#FF5722', '#000000'],
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

  if (loading) return <div className="p-10 text-[15px] text-slate-500 font-medium flex justify-center items-center h-screen">Menyiapkan Grafik ApexCharts...</div>;

  return (
    <main className="flex-1 p-8 bg-[#F8FAFC] min-h-screen font-sans text-slate-800">
      
      {/* --- HEADER --- */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-[15px] text-slate-500 mt-1 font-medium">Ringkasan keuangan performa toko gabungan</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-lg text-[14px] text-slate-600 font-medium shadow-sm">
            <Calendar size={18} /> <span>Data Semua Periode</span>
          </div>
          <div className="w-11 h-11 bg-white border border-slate-200 rounded-full flex items-center justify-center relative shadow-sm">
            <Bell size={20} className="text-slate-600" />
            <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
          </div>

          <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-full shadow-sm">
            <div className="w-8 h-8 bg-indigo-100 text-indigo-600 font-bold rounded-full flex items-center justify-center text-[13px]">AD</div>
            <div className="flex flex-col">
              <span className="text-[14px] font-bold text-slate-800">Administrator</span>
            </div>
            <ChevronDown size={16} className="text-slate-400" />
          </div>
        </div>
      </div>

      {/* =====================================================================
          SECTION BARU: RINGKASAN BUKU KAS & OPERASIONAL INTERNAL 
          (Sesuai Poin dari Gambar image_29cbb5.png tapi desain Light Mode)
          ===================================================================== */}
      <div className="mb-10">
        <h3 className="text-[14px] font-bold text-slate-500 uppercase tracking-wider mb-4">Ringkasan Operasional & Bisnis</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          
          {/* Baris 1: Biaya Internal */}
          <MiniMetricCard label="Biaya Operasional" value={formatRp(stats.internalCosts.operasional)} icon={<Briefcase />} color="text-amber-500 bg-amber-50" />
          <MiniMetricCard label="Biaya Marketing" value={formatRp(stats.internalCosts.marketing)} icon={<Megaphone />} color="text-amber-500 bg-amber-50" />
          <MiniMetricCard label="Biaya Maintenance" value={formatRp(stats.internalCosts.maintenance)} icon={<Wrench />} color="text-amber-500 bg-amber-50" />
          <MiniMetricCard label="Biaya Karyawan" value={formatRp(stats.internalCosts.karyawan)} icon={<Users2 />} color="text-amber-500 bg-amber-50" />
          <MiniMetricCard label="Biaya Beli Bahan" value={formatRp(stats.internalCosts.beliBahan)} icon={<Truck />} color="text-amber-500 bg-amber-50" />
          <MiniMetricCard label="Biaya Gaji" value={formatRp(stats.internalCosts.gaji)} icon={<Wallet />} color="text-amber-500 bg-amber-50" />
          <MiniMetricCard label="Biaya Perlengkapan" value={formatRp(stats.internalCosts.perlengkapan)} icon={<FileBox />} color="text-amber-500 bg-amber-50" />

          {/* Baris 2: Data Real Marketplace Gabungan */}
          <MiniMetricCard label="Produk Terjual (QTY)" value={totalOrder.toLocaleString()} icon={<Package />} color="text-emerald-600 bg-emerald-50" isHighlight />
          <MiniMetricCard label="Total Biaya Admin" value={formatRp(stats.adminKomisi)} icon={<Receipt />} color="text-red-500 bg-red-50" isHighlight />
          <MiniMetricCard label="Total Pengeluaran" value={formatRp(totalPengeluaranAll)} icon={<TrendingDown />} color="text-red-600 bg-red-100" isHighlight />
          <MiniMetricCard label="Total Uang Bersih" value={formatRp(totalUangBersih)} icon={<Wallet />} color="text-blue-600 bg-blue-50" isHighlight />
          <MiniMetricCard label="Total Pendapatan" value={formatRp(totalOmzet)} icon={<TrendingUp />} color="text-indigo-600 bg-indigo-50" isHighlight />
        
        </div>
      </div>

      {/* --- ROW 1: TOP 5 METRICS --- */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-8">
        <TopCard title="Total Omzet Shopee" value={formatRp(stats.omzetShopee)} icon={<ShoppingBag />} iconBg="bg-orange-100" iconColor="text-orange-500" data={stats.trendData.map(d=>d.shopee)} stroke="#FF5722" />
        <TopCard title="Total Omzet TikTok" value={formatRp(stats.omzetTikTok)} icon={<ShoppingBag />} iconBg="bg-slate-200" iconColor="text-slate-900" data={stats.trendData.map(d=>d.tiktok)} stroke="#000000" />
        <TopCard title="Total Pengeluaran MP" value={formatRp(totalPengeluaranMP)} icon={<Wallet />} iconBg="bg-purple-100" iconColor="text-purple-600" data={stats.trendData.map(d=>d.total)} stroke="#8B5CF6" />
        <TopCard title="Estimasi Profit Kotor" value={formatRp((stats.netShopee + stats.netTikTok) * 0.7)} icon={<RefreshCcw />} iconBg="bg-emerald-100" iconColor="text-emerald-600" data={stats.trendData.map(d=>d.profit)} stroke="#10B981" />
        <TopCard title="Total Order" value={totalOrder.toLocaleString()} icon={<Package />} iconBg="bg-blue-100" iconColor="text-blue-600" data={stats.trendData.map(d=>d.total)} stroke="#3B82F6" />
      </div>

      {/* --- ROW 2: OMZET, TREND, PENGELUARAN --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-[16px] font-bold text-slate-900 mb-4">Omzet per Marketplace</h3>
          <div className="flex-1 relative flex items-center justify-center -mt-4">
            <ReactApexChart options={chartMarketplace.options} series={chartMarketplace.series} type="donut" height={240} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
              <span className="text-[12px] text-slate-500 font-medium">Total Omzet</span>
              <span className="text-[16px] font-black text-slate-800">{formatRp(totalOmzet)}</span>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            <div className="flex justify-between items-center"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#FF5722]" /><span className="text-[14px] font-medium text-slate-600">Shopee</span></div><div className="text-right"><p className="text-[14px] font-bold text-slate-800">{formatRp(stats.omzetShopee)}</p></div></div>
            <div className="flex justify-between items-center"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#000000]" /><span className="text-[14px] font-medium text-slate-600">TikTok Shop</span></div><div className="text-right"><p className="text-[14px] font-bold text-slate-800">{formatRp(stats.omzetTikTok)}</p></div></div>
          </div>
        </div>

        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[16px] font-bold text-slate-900">Tren Omzet Berjalan</h3>
            <div className="flex items-center gap-4 text-[12px] font-bold">
              <span className="flex items-center gap-1.5 text-slate-600"><div className="w-2.5 h-2.5 rounded-full bg-[#FF5722]" /> Shopee</span>
              <span className="flex items-center gap-1.5 text-slate-600"><div className="w-2.5 h-2.5 rounded-full bg-[#000000]" /> TikTok Shop</span>
              <span className="flex items-center gap-1.5 text-slate-600"><div className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" /> Total</span>
            </div>
          </div>
          <div className="flex-1 w-full -ml-3">
            <ReactApexChart options={chartTrend.options} series={chartTrend.series} type="area" height={280} />
          </div>
        </div>

        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-[16px] font-bold text-slate-900 mb-6">Ringkasan Pengeluaran MP</h3>
          <div className="space-y-6 flex-1 mt-2">
            <ProgressRow label="Biaya Admin & Komisi" value={stats.adminKomisi} total={totalPengeluaranMP} color="bg-orange-500" icon={<Receipt size={14}/>} />
            <ProgressRow label="Iklan & Promosi" value={stats.iklanPromosi} total={totalPengeluaranMP} color="bg-blue-500" icon={<TrendingUp size={14}/>} />
            <ProgressRow label="Ongkir & Voucher" value={stats.ongkirVoucher} total={totalPengeluaranMP} color="bg-slate-800" icon={<Package size={14}/>} />
            <ProgressRow label="Biaya Lainnya" value={stats.lainnya + stats.pajak} total={totalPengeluaranMP} color="bg-emerald-500" icon={<Wallet size={14}/>} />
          </div>
          <div className="mt-8 pt-5 border-t border-slate-200 flex justify-between items-center">
            <span className="text-[14px] font-bold text-slate-500">Total Pengeluaran MP</span>
            <span className="text-[16px] font-black text-slate-900">{formatRp(totalPengeluaranMP)}</span>
          </div>
        </div>
      </div>

      {/* --- ROW 3: PERFORMA MP, PROFIT MARGIN, TOP PRODUK --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-[16px] font-bold text-slate-900 mb-6">Performa Marketplace</h3>
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-orange-100 text-orange-500 rounded-md flex items-center justify-center"><ShoppingBag size={16}/></div>
              <span className="text-[15px] font-bold text-slate-800">Shopee</span>
            </div>
            <div className="space-y-3 text-[13px]">
              <div className="flex justify-between"><span className="text-slate-500 font-medium">Omzet</span><span className="font-bold text-slate-800">{formatRp(stats.omzetShopee)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-medium">Order</span><span className="font-bold text-slate-800">{stats.orderShopee}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-medium">Net Diterima</span><span className="font-bold text-emerald-600">{formatRp(stats.netShopee)}</span></div>
            </div>
          </div>
          <div className="pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-slate-200 text-slate-900 rounded-md flex items-center justify-center"><ShoppingBag size={16}/></div>
              <span className="text-[15px] font-bold text-slate-800">TikTok Shop</span>
            </div>
            <div className="space-y-3 text-[13px]">
              <div className="flex justify-between"><span className="text-slate-500 font-medium">Omzet</span><span className="font-bold text-slate-800">{formatRp(stats.omzetTikTok)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-medium">Order</span><span className="font-bold text-slate-800">{stats.orderTikTok}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-medium">Net Diterima</span><span className="font-bold text-emerald-600">{formatRp(stats.netTikTok)}</span></div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[16px] font-bold text-slate-900">Profit & Margin</h3>
            <div className="flex items-center gap-4 text-[12px] font-bold">
              <span className="flex items-center gap-1.5 text-slate-600"><div className="w-2.5 h-2.5 rounded bg-[#10B981]" /> Profit Bersih</span>
              <span className="flex items-center gap-1.5 text-slate-600"><div className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" /> Margin (%)</span>
            </div>
          </div>
          <div className="flex-1 w-full -ml-3">
            <ReactApexChart options={chartProfitMargin.options} series={chartProfitMargin.series} type="line" height={280} />
          </div>
        </div>

        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-[16px] font-bold text-slate-900 mb-5">Top Order (Berdasarkan Profit)</h3>
          <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-wider border-b pb-3 mb-4">
            <span className="w-1/2">Order Info</span>
            <span className="w-1/4 text-right">Omzet</span>
            <span className="w-1/4 text-right">Profit</span>
          </div>
          <div className="space-y-5 flex-1">
            {stats.topOrders.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-[13px]">
                <div className="w-1/2 flex items-center gap-3 pr-2">
                  <div className={`p-2 rounded-lg ${item.marketplace === 'Shopee' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-800'}`}>
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
      </div>
    </main>
  );
}

// ==========================================
// Sub-Komponen UI (Tanpa Recharts)
// ==========================================

// Komponen Card Baru untuk Section Referensi Gambar
function MiniMetricCard({ label, value, icon, color, isHighlight = false }: any) {
  return (
    <div className={`p-5 rounded-[20px] border ${isHighlight ? 'border-transparent shadow-md shadow-slate-200' : 'border-slate-200 shadow-sm bg-white'} flex items-center gap-4 hover:-translate-y-1 transition-transform duration-300`}>
      <div className={`p-3 rounded-xl ${color}`}>
        {React.cloneElement(icon, { size: 22 })}
      </div>
      <div>
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{label}</p>
        <p className="text-[18px] font-black text-slate-900 leading-none tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function TopCard({ title, value, icon, iconBg, iconColor, data, stroke }: any) {
  const sparklineOptions = {
    chart: { type: 'line', sparkline: { enabled: true }, animations: { enabled: true } },
    stroke: { curve: 'smooth', width: 2.5 },
    colors: [stroke],
    tooltip: { fixed: { enabled: false }, x: { show: false }, y: { title: { formatter: () => '' } }, marker: { show: false } }
  } as ApexCharts.ApexOptions;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg} ${iconColor}`}>
          {React.cloneElement(icon, { size: 20 })}
        </div>
        <span className="text-[13px] font-bold text-slate-500">{title}</span>
      </div>
      <div>
        <h3 className="text-[28px] font-black text-slate-900 tracking-tight mb-3 leading-none">{value}</h3>
        <div className="h-12 w-full">
          <ReactApexChart options={sparklineOptions} series={[{ data: data }]} type="line" height={48} />
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