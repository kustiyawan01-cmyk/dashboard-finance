"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { 
  Calendar, Bell, Package, Receipt, Wallet, TrendingUp, 
  ShoppingBag, TrendingDown, CircleDollarSign, BarChart2, PieChart
} from "lucide-react";

// WAJIB: Import ApexCharts secara dinamis untuk menghindari error SSR di Next.js
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  
  // STATE FILTER TANGGAL
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState({ start: '', end: '' });

  // STATE DATA ANALITIK
  const [stats, setStats] = useState({
    omzetShopee: 0, omzetTikTok: 0,
    labaShopee: 0, labaTikTok: 0,
    pengeluaranShopee: 0, pengeluaranTikTok: 0,
    orderShopee: 0, orderTikTok: 0,
    adminKomisi: 0, iklanPromosi: 0, ongkirVoucher: 0, pajak: 0, lainnya: 0,
    trendData: [] as any[],
    profitMarginData: [] as any[],
    internalCosts: { operasional: 0, marketing: 0, maintenance: 0, karyawan: 0, beliBahan: 0, gaji: 0, perlengkapan: 0 }
  });

  const handlePresetDate = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    setTempDateRange({ start: formatDate(start), end: formatDate(end) });
  };

  // MESIN PENGAMBIL DATA (Sama persis dengan Dashboard agar sinkron)
  useEffect(() => {
    const fetchRealData = async () => {
      setLoading(true);
      try {
        const [resShopee, resTikTok, resExpenses] = await Promise.all([
          fetch('/api/finance-shopee').catch(() => null),
          fetch('/api/finance-tiktok').catch(() => null),
          fetch('/api/expenses').catch(() => null)
        ]);

        let sOmzet = 0, sLaba = 0, sOrders = 0, sPengeluaran = 0;
        let tOmzet = 0, tLaba = 0, tOrders = 0, tPengeluaran = 0;
        let cAdminKomisi = 0, cIklan = 0, cOngkirVoucher = 0, cPajak = 0, cLainnya = 0;
        
        const trendMap = new Map();

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
              if (nd < dateRange.start || nd > dateRange.end) return;
            }

            sOrders++;
            const omzet = Number(item.hargaProduk || 0);
            const laba = Number(item.labaBersih || 0);
            const fees = Number(item.fees || 0);
            
            sOmzet += omzet; sLaba += laba; sPengeluaran += fees;

            cAdminKomisi += (Number(item.admin) || 0) + (Number(item.layanan) || 0) + (Number(item.ams) || 0) + (Number(item.komisiAffiliate) || 0);
            cIklan += (Number(item.shopeeAds) || 0);
            cOngkirVoucher += (Number(item.ongkirXtra) || 0) + (Number(item.cashbackXtra) || 0) + (Number(item.voucherPenjual) || 0) + (Number(item.cashbackPenjual) || 0);
            cPajak += (Number(item.pajak) || 0);
            cLainnya += (Number(item.biayaCod) || 0) + (Number(item.transfer) || 0) + (Number(item.materai) || 0) + (Number(item.penalti) || 0) + (Number(item.penyesuaianSistem) || 0) + (Number(item.refund) || 0) + (Number(item.retur) || 0);

            if (nd) {
              const tData = trendMap.get(nd) || { name: nd, shopee: 0, tiktok: 0, total: 0, profit: 0, shopeeOrders: 0, tiktokOrders: 0 };
              tData.shopee += omzet; tData.total += omzet; tData.profit += laba; tData.shopeeOrders += 1;
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
              if (nd < dateRange.start || nd > dateRange.end) return;
            }

            tOrders++;
            const omzet = Number(item.subtotal || item.revenue || 0);
            const laba = Number(item.labaBersih || 0);
            const fees = Number(item.fees || 0);

            tOmzet += omzet; tLaba += laba; tPengeluaran += fees;

            cAdminKomisi += (Number(item.platformFee) || 0) + (Number(item.paymentFee) || 0) + (Number(item.affiliateFee) || 0);
            cOngkirVoucher += (Number(item.freeShippingFee) || 0) + (Number(item.sellerDiscount) || 0);
            cPajak += (Number(item.tax) || 0);
            cLainnya += (Number(item.codFee) || 0) + (Number(item.adjustment) || 0);

            if (nd) {
              const tData = trendMap.get(nd) || { name: nd, shopee: 0, tiktok: 0, total: 0, profit: 0, shopeeOrders: 0, tiktokOrders: 0 };
              tData.tiktok += omzet; tData.total += omzet; tData.profit += laba; tData.tiktokOrders += 1;
              trendMap.set(nd, tData);
            }
          });
        }

        // 3. OLAH PENGELUARAN INTERNAL
        let op=0, mkt=0, mtc=0, krw=0, bhn=0, gj=0, plg=0;
        if (resExpenses && resExpenses.ok) {
          const exps = await resExpenses.json();
          exps.forEach((ex: any) => {
            const rawDate = ex.tanggal || ex.date || ex.created_at;
            let nd = rawDate ? rawDate.split('T')[0] : null;
            if (dateRange.start && dateRange.end && nd && (nd < dateRange.start || nd > dateRange.end)) return;

            const val = Number(ex.jumlah || ex.amount || 0);
            const cat = String(ex.kategori || ex.category || "").toLowerCase();
            
            if(cat.includes("operasional")) op+=val;
            else if(cat.includes("marketing") || cat.includes("iklan")) mkt+=val;
            else if(cat.includes("maintenance") || cat.includes("perbaikan")) mtc+=val;
            else if(cat.includes("karyawan") && !cat.includes("gaji")) krw+=val;
            else if(cat.includes("bahan") || cat.includes("produksi")) bhn+=val;
            else if(cat.includes("gaji")) gj+=val;
            else if(cat.includes("perlengkapan") || cat.includes("atk")) plg+=val;
            else op+=val;
          });
        }

        const finalTrendData = Array.from(trendMap.values())
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(d => ({
            ...d,
            margin: d.total > 0 ? Number(((d.profit / d.total) * 100).toFixed(1)) : 0
          }));

        setStats({
          omzetShopee: sOmzet, omzetTikTok: tOmzet,
          labaShopee: sLaba, labaTikTok: tLaba,
          pengeluaranShopee: sPengeluaran, pengeluaranTikTok: tPengeluaran,
          orderShopee: sOrders, orderTikTok: tOrders,
          adminKomisi: cAdminKomisi, iklanPromosi: cIklan, ongkirVoucher: cOngkirVoucher, pajak: cPajak, lainnya: cLainnya,
          trendData: finalTrendData.length > 0 ? finalTrendData : [{ name: '-', shopee: 0, tiktok: 0, total: 0, profit: 0, margin: 0, shopeeOrders: 0, tiktokOrders: 0 }],
          profitMarginData: finalTrendData,
          internalCosts: { operasional: op, marketing: mkt, maintenance: mtc, karyawan: krw, beliBahan: bhn, gaji: gj, perlengkapan: plg }
        });

      } catch (error) { console.error(error); }
      finally { setLoading(false); }
    };
    fetchRealData();
  }, [dateRange]); 

  const formatRp = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);

  // Kalkulasi Global
  const totalOmzet = stats.omzetShopee + stats.omzetTikTok;
  const totalPengeluaranMP = stats.pengeluaranShopee + stats.pengeluaranTikTok;
  const totalInternal = Object.values(stats.internalCosts).reduce((a, b) => a + b, 0);
  const totalLabaMP = stats.labaShopee + stats.labaTikTok;
  const trueNetProfit = totalLabaMP - totalInternal;

  // ==========================================
  // KONFIGURASI GRAFIK APEXCHARTS UNTUK ANALYTICS
  // ==========================================
  
  // 1. Chart Komparasi Penjualan (Bar Chart Berdampingan)
  const chartSalesComparison = {
    series: [
      { name: 'Shopee', data: stats.trendData.map(d => d.shopee) },
      { name: 'TikTok', data: stats.trendData.map(d => d.tiktok) }
    ],
    options: {
      chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
      colors: ['#EE4D2D', '#000000'],
      plotOptions: { bar: { horizontal: false, columnWidth: '55%', borderRadius: 4 } },
      dataLabels: { enabled: false },
      stroke: { show: true, width: 2, colors: ['transparent'] },
      xaxis: { categories: stats.trendData.map(d => d.name), labels: { style: { colors: '#94A3B8' } } },
      yaxis: { labels: { formatter: (val: number) => `Rp ${(val/1000000).toFixed(1)}M`, style: { colors: '#94A3B8' } } },
      fill: { opacity: 1 },
      grid: { borderColor: '#F1F5F9', strokeDashArray: 4 },
      tooltip: { y: { formatter: (val: number) => formatRp(val) } },
      legend: { position: 'top', horizontalAlign: 'right' }
    } as ApexCharts.ApexOptions
  };

  // 2. Chart Proporsi Potongan Marketplace (Pie Chart)
  const chartFeesBreakdown = {
    series: [stats.adminKomisi, stats.iklanPromosi, stats.ongkirVoucher, stats.pajak + stats.lainnya],
    options: {
      chart: { type: 'pie', fontFamily: 'inherit' },
      labels: ['Admin & Komisi', 'Iklan & Promosi', 'Ongkir & Voucher', 'Pajak & Lainnya'],
      colors: ['#F97316', '#3B82F6', '#1E293B', '#10B981'],
      dataLabels: { enabled: true, formatter: (val: number) => val.toFixed(1) + '%' },
      legend: { position: 'bottom' },
      tooltip: { y: { formatter: (val: number) => formatRp(val) } }
    } as ApexCharts.ApexOptions
  };

  // 3. Chart Tren Order (Line Chart)
  const chartOrderTrend = {
    series: [
      { name: 'Order Shopee', data: stats.trendData.map(d => d.shopeeOrders) },
      { name: 'Order TikTok', data: stats.trendData.map(d => d.tiktokOrders) }
    ],
    options: {
      chart: { type: 'line', toolbar: { show: false }, fontFamily: 'inherit' },
      colors: ['#EE4D2D', '#000000'],
      stroke: { width: 3, curve: 'smooth' },
      xaxis: { categories: stats.trendData.map(d => d.name), labels: { style: { colors: '#94A3B8' } } },
      yaxis: { labels: { style: { colors: '#94A3B8' } } },
      grid: { borderColor: '#F1F5F9', strokeDashArray: 4 },
      tooltip: { y: { formatter: (val: number) => val + ' Pesanan' } },
      markers: { size: 4 }
    } as ApexCharts.ApexOptions
  };

  if (loading) return <div className="p-10 text-[15px] text-slate-500 font-medium flex justify-center items-center h-screen">Memuat Analitik Lanjutan...</div>;

  return (
    <main className="flex-1 p-8 bg-[#F8FAFC] min-h-screen font-sans text-slate-800">
      
      {/* --- HEADER --- */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Analytics & Laporan</h1>
          <p className="text-[15px] text-slate-500 mt-1 font-medium">Analisis mendalam performa penjualan dan metrik bisnis.</p>
        </div>
        
        {/* DATE PICKER (Sama dengan Dashboard) */}
        <div className="relative z-50">
            <button onClick={() => { setTempDateRange(dateRange); setIsDatePickerOpen(!isDatePickerOpen); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 text-[14px] font-medium text-slate-700"
            >
              <Calendar size={18} className="text-indigo-500" />
              {dateRange.start && dateRange.end ? `${dateRange.start} - ${dateRange.end}` : "Semua Waktu"}
            </button>

            {isDatePickerOpen && (
              <div className="absolute right-0 top-full mt-2 w-[500px] bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col overflow-hidden">
                <div className="flex flex-row h-[280px]">
                  <div className="w-40 border-r border-slate-100 bg-slate-50/50 p-2 flex flex-col gap-1 overflow-y-auto">
                    <button onClick={() => handlePresetDate(0)} className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md">Hari ini</button>
                    <button onClick={() => handlePresetDate(1)} className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md">Kemarin</button>
                    <button onClick={() => handlePresetDate(7)} className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md">7 hari terakhir</button>
                    <button onClick={() => handlePresetDate(30)} className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md">30 hari terakhir</button>
                    <button onClick={() => handlePresetDate(90)} className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md">3 bulan terakhir</button>
                    <button onClick={() => setTempDateRange({start: '', end: ''})} className="text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md">Semua waktu</button>
                  </div>
                  <div className="flex-1 p-5 flex flex-col">
                    <h4 className="font-medium text-slate-900 mb-4">Atur Tanggal Kustom</h4>
                    <div className="flex items-center gap-4 mb-auto">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Mulai Tanggal</label>
                        <input type="date" value={tempDateRange.start} onChange={(e) => setTempDateRange(prev => ({...prev, start: e.target.value}))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Sampai Tanggal</label>
                        <input type="date" value={tempDateRange.end} onChange={(e) => setTempDateRange(prev => ({...prev, end: e.target.value}))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <button onClick={() => { setDateRange({start: '', end: ''}); setIsDatePickerOpen(false); }} className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-md uppercase tracking-wider">Reset</button>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setIsDatePickerOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                        <button onClick={() => { setDateRange(tempDateRange); setIsDatePickerOpen(false); }} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm">Apply</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* --- ROW 1: KARTU METRIK UTAMA ANALYTICS --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <MetricBox title="Total Omzet Global" value={formatRp(totalOmzet)} sub={`${stats.orderShopee + stats.orderTikTok} Total Pesanan`} icon={<ShoppingBag/>} color="bg-blue-600" />
        <MetricBox title="Laba Bersih Keseluruhan" value={formatRp(trueNetProfit)} sub={`Margin: ${(totalOmzet > 0 ? (trueNetProfit/totalOmzet)*100 : 0).toFixed(1)}%`} icon={<CircleDollarSign/>} color="bg-emerald-600" />
        <MetricBox title="Total Potongan Marketplace" value={formatRp(totalPengeluaranMP)} sub={`Atau ${(totalOmzet > 0 ? (totalPengeluaranMP/totalOmzet)*100 : 0).toFixed(1)}% dari Omzet`} icon={<TrendingDown/>} color="bg-red-500" />
        <MetricBox title="Total Pengeluaran Internal" value={formatRp(totalInternal)} sub="Gaji, Ads, Operasional, dll." icon={<Wallet/>} color="bg-amber-500" />
      </div>

      {/* --- ROW 2: GRAFIK UTAMA (KOMPARASI & TREN) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Komparasi Penjualan Harian/Bulanan */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="text-indigo-500" size={20} />
            <h3 className="text-[16px] font-bold text-slate-900">Komparasi Omzet: Shopee vs TikTok</h3>
          </div>
          <div className="w-full">
            <ReactApexChart options={chartSalesComparison.options} series={chartSalesComparison.series} type="bar" height={320} />
          </div>
        </div>

        {/* Tren Volume Pesanan */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-indigo-500" size={20} />
            <h3 className="text-[16px] font-bold text-slate-900">Tren Volume Pesanan (Orders)</h3>
          </div>
          <div className="w-full">
            <ReactApexChart options={chartOrderTrend.options} series={chartOrderTrend.series} type="line" height={320} />
          </div>
        </div>
      </div>

      {/* --- ROW 3: ANALISIS BIAYA & RASIO --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Breakdown Biaya MP */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="text-slate-500" size={20} />
            <h3 className="text-[16px] font-bold text-slate-900">Struktur Potongan MP</h3>
          </div>
          <div className="flex justify-center mt-4">
            <ReactApexChart options={chartFeesBreakdown.options} series={chartFeesBreakdown.series} type="pie" height={280} />
          </div>
        </div>

        {/* List Detail Biaya */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-[16px] font-bold text-slate-900 mb-6">Analisis Rasio Biaya (Cost Ratio)</h3>
          <div className="space-y-6">
            <RatioBar label="Admin & Komisi Platform" value={stats.adminKomisi} total={totalOmzet} color="bg-orange-500" />
            <RatioBar label="Iklan & Promosi (Ads)" value={stats.iklanPromosi} total={totalOmzet} color="bg-blue-500" />
            <RatioBar label="Subsidi Ongkir & Voucher" value={stats.ongkirVoucher} total={totalOmzet} color="bg-slate-800" />
            <RatioBar label="Pajak & PenaltiLainnya" value={stats.pajak + stats.lainnya} total={totalOmzet} color="bg-emerald-500" />
            
            <div className="pt-4 border-t border-slate-100">
               <RatioBar label="Beban Operasional Internal" value={totalInternal} total={totalOmzet} color="bg-amber-500" />
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}

// ==========================================
// Sub-Komponen UI Khusus Halaman Analytics
// ==========================================

function MetricBox({ title, value, sub, icon, color }: any) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-colors">
      <div className={`absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform ${color.replace('bg-', 'text-')}`}>
        {React.cloneElement(icon, { size: 64 })}
      </div>
      <p className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-2 relative z-10">{title}</p>
      <h3 className="text-2xl font-black text-slate-900 mb-1 relative z-10">{value}</h3>
      <p className="text-[13px] font-medium text-slate-400 relative z-10">{sub}</p>
      <div className={`absolute bottom-0 left-0 w-full h-1 ${color}`}></div>
    </div>
  );
}

function RatioBar({ label, value, total, color }: any) {
  // Hitung persentase biaya terhadap TOTAL OMZET (bukan total biaya)
  // Untuk melihat seberapa besar % omzet yang habis untuk biaya ini
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const formatRp = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);
  
  return (
    <div>
      <div className="flex justify-between items-center text-[14px] mb-2">
        <span className="font-bold text-slate-700">{label}</span>
        <div className="flex items-center gap-4">
          <span className="font-bold text-slate-800">{formatRp(value)}</span>
          <span className={`text-[12px] font-bold px-2 py-0.5 rounded-md ${color} text-white w-14 text-center`}>
            {percentage.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}