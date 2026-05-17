"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, BarChart3, Calculator, LogOut, Receipt, Box, TrendingUp, Target, Truck, Menu, X, ChevronLeft, ChevronRight, ScanLine
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  
  // State untuk Mobile (Drawer)
  const [isOpen, setIsOpen] = useState(false);
  // State untuk Desktop (Collapse/Menciut)
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    },
    {
      title: "GUDANG & PENGIRIMAN",
      items: [
        { name: "Scan & Manifest", href: "/scan-manifest", icon: ScanLine },
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

      {/* --- OVERLAY GELAP (Khusus Mobile) --- */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* --- SIDEBAR UTAMA --- */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen bg-white border-r border-slate-200 flex flex-col 
        transition-all duration-300 ease-in-out relative
        ${isOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-[88px]' : 'lg:w-[260px]'}
      `}>
        
        {/* TOMBOL TOGGLE COLLAPSE (Khusus Desktop) */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-8 w-6 h-6 bg-white border border-slate-200 rounded-full items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-200 shadow-sm z-50 transition-transform"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* HEADER LOGO */}
        <div className={`hidden lg:flex h-20 items-center border-b border-slate-100 shrink-0 transition-all ${isCollapsed ? 'px-0 justify-center' : 'px-6'}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-md shadow-emerald-200 shrink-0">
              <TrendingUp className="text-white" size={18} />
            </div>
            {!isCollapsed && (
              <h1 className="text-[17px] font-black text-slate-800 tracking-tight leading-tight whitespace-nowrap">
                Marketplace <br />
                <span className="text-emerald-600 font-bold">Finance</span>
              </h1>
            )}
          </div>
        </div>

        {/* Spacer Mobile */}
        <div className="lg:hidden h-16 shrink-0 flex items-center px-6 border-b border-slate-100">
           <span className="text-xs font-bold text-slate-400">MENU NAVIGASI</span>
        </div>

        {/* MENU LIST */}
        <div className={`flex-1 overflow-y-auto py-6 scrollbar-hide transition-all ${isCollapsed ? 'px-3' : 'px-4'}`}>
          <nav className="space-y-7">
            {menuGroups.map((group, groupIdx) => (
              <div key={groupIdx}>
                {!isCollapsed ? (
                  <h3 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 whitespace-nowrap">
                    {group.title}
                  </h3>
                ) : (
                  <div className="w-full border-t border-slate-100 mb-3 mt-1" />
                )}
                
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <li key={item.href}>
                        <Link 
                          href={item.href} 
                          title={isCollapsed ? item.name : ""} // Menampilkan Tooltip saat dihover di mode Collapse
                          className={`flex items-center ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'} rounded-lg transition-all duration-200 group ${
                            isActive ? getActiveStyle(item.href) : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium border-r-4 border-transparent"
                          }`}
                        >
                          {item.imgSrc ? (
                            <img src={item.imgSrc} alt={item.name} className={`w-[22px] h-[22px] object-contain transition-all shrink-0 ${!isActive && 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100'}`} />
                          ) : Icon ? (
                            <Icon size={isCollapsed ? 22 : 18} className={`shrink-0 transition-colors ${isActive ? '' : 'text-slate-400 group-hover:text-slate-600'}`} />
                          ) : null}
                          
                          {!isCollapsed && (
                            <span className="text-[14px] whitespace-nowrap">{item.name}</span>
                          )}
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
        <div className={`p-4 border-t border-slate-200 bg-slate-50/50 shrink-0 transition-all ${isCollapsed ? 'px-2' : ''}`}>
          <div className={`bg-white border border-slate-200 rounded-xl shadow-sm flex items-center group hover:border-slate-300 transition-colors ${isCollapsed ? 'flex-col p-2 gap-3' : 'p-3 justify-between'}`}>
            
            {/* User Avatar & Text */}
            <div className={`flex items-center gap-3 min-w-0 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="w-9 h-9 bg-slate-800 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm shrink-0 uppercase">
                {user?.username ? user.username.substring(0, 2) : "US"}
              </div>
              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-bold text-slate-800 truncate capitalize">{user?.username || "User"}</span>
                  <span className="text-[11px] font-medium text-slate-400 truncate">{user?.role === 'admin' ? 'Administrator' : 'Staff Online'}</span>
                </div>
              )}
            </div>

            {/* Logout Button */}
            <button 
              onClick={handleLogout} 
              title="Logout" 
              className={`text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shrink-0 ${isCollapsed ? 'p-2 w-full flex justify-center' : 'p-2'}`}
            >
              <LogOut size={16} />
            </button>

          </div>
        </div>

      </aside>
    </>
  );
}