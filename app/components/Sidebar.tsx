"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, BarChart3, Calculator, LogOut, Receipt, Box, TrendingUp, Target, Truck, Menu, X
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  
  // State untuk mengontrol Sidebar buka/tutup di Mobile
  const [isOpen, setIsOpen] = useState(false);

  // Tutup sidebar otomatis kalau pindah halaman (di HP)
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  if (pathname === '/login') return null;

  const menuGroups = [
    {
      title: "OVERVIEW",
      items: [
        { name: "Dashboard", href: "/", icon: LayoutDashboard },
        { name: "Analytics", href: "/analytics", icon: BarChart3 },
        { name: "ROAS Analyzer", href: "/roas", icon: Target },
      ]
    },
    {
      title: "DATA PENJUALAN",
      items: [
        { name: "TikTok Sales", href: "/tiktok", imgSrc: "/tiktok-logo.png" },
        { name: "Shopee Sales", href: "/shopee", imgSrc: "/shopee-logo.png" },
        { name: "Lacak Retur", href: "/lacak-retur", icon: Truck },
      ]
    },
    {
      title: "REKAP KEUANGAN",
      items: [
        { name: "Keuangan TikTok", href: "/finance-tiktok", imgSrc: "/tiktok-logo.png" },
        { name: "Keuangan Shopee", href: "/finance-shopee", imgSrc: "/shopee-logo.png" },
        { name: "Pengeluaran", href: "/expenses", icon: Receipt },
      ]
    },
    {
      title: "INVENTORY & ALAT",
      items: [
        { name: "Master Produk", href: "/products", icon: Box },
        { name: "Kalkulator HPP", href: "/kalkulator-hpp", icon: Calculator },
      ]
    }
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      logout();
    } catch (error) {
      logout();
    }
  };

  const getActiveStyle = (href: string) => {
    if (href.includes('shopee')) return "bg-orange-50 text-[#EE4D2D] border-r-4 border-[#EE4D2D] font-bold";
    if (href.includes('tiktok')) return "bg-slate-100 text-slate-900 border-r-4 border-slate-900 font-bold";
    if (href.includes('products') || href.includes('kalkulator')) return "bg-indigo-50 text-indigo-700 border-r-4 border-indigo-600 font-bold";
    return "bg-emerald-50 text-emerald-700 border-r-4 border-emerald-500 font-bold"; 
  };

  return (
    <>
      {/* --- TOP BAR KHUSUS MOBILE --- */}
      <div className="lg:hidden fixed top-0 left-0 w-full h-16 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="text-white" size={16} />
          </div>
          <span className="font-black text-slate-800 tracking-tight">Marketplace<span className="text-emerald-600">Finance</span></span>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 bg-slate-50 text-slate-600 rounded-lg border border-slate-200">
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* --- OVERLAY GELAP (Khusus Mobile saat sidebar terbuka) --- */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* --- SIDEBAR UTAMA --- */}
      {/* Class penjelasan: 
          - fixed (di HP) / sticky (di PC)
          - -translate-x-full (sembunyi di HP) / translate-x-0 (muncul)
          - lg:translate-x-0 (Selalu muncul di PC)
      */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen w-[260px] bg-white border-r border-slate-200 flex flex-col 
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        
        {/* HEADER LOGO (Disembunyikan di Mobile karena sudah ada Top Bar) */}
        <div className="hidden lg:flex h-20 items-center px-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 w-full">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-md shadow-emerald-200 shrink-0">
              <TrendingUp className="text-white" size={18} />
            </div>
            <h1 className="text-[17px] font-black text-slate-800 tracking-tight leading-tight">
              Marketplace <br />
              <span className="text-emerald-600 font-bold">Finance</span>
            </h1>
          </div>
        </div>

        {/* Tambahan padding top di HP agar tidak tertutup Top Bar */}
        <div className="lg:hidden h-16 shrink-0 flex items-center px-6 border-b border-slate-100">
           <span className="text-xs font-bold text-slate-400">MENU NAVIGASI</span>
        </div>

        {/* MENU LIST (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
          <nav className="space-y-7">
            {menuGroups.map((group, groupIdx) => (
              <div key={groupIdx}>
                <h3 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  {group.title}
                </h3>
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <li key={item.href}>
                        <Link 
                          href={item.href} 
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                            isActive ? getActiveStyle(item.href) : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium border-r-4 border-transparent"
                          }`}
                        >
                          {item.imgSrc ? (
                            <img src={item.imgSrc} alt={item.name} className={`w-[24px] h-[24px] object-contain transition-all ${!isActive && 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100'}`} />
                          ) : Icon ? (
                            <Icon size={18} className={`transition-colors ${isActive ? '' : 'text-slate-400 group-hover:text-slate-600'}`} />
                          ) : null}
                          <span className="text-[14px]">{item.name}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* FOOTER / USER PROFILE CARD */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 shrink-0">
          <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm flex items-center justify-between group hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-slate-800 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm shrink-0 uppercase">
                {user?.username ? user.username.substring(0, 2) : "US"}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-bold text-slate-800 truncate capitalize">{user?.username || "User"}</span>
                <span className="text-[11px] font-medium text-slate-400 truncate">{user?.role === 'admin' ? 'Administrator' : 'Staff Online'}</span>
              </div>
            </div>
            <button onClick={handleLogout} title="Logout" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shrink-0">
              <LogOut size={16} />
            </button>
          </div>
        </div>

      </aside>
    </>
  );
}