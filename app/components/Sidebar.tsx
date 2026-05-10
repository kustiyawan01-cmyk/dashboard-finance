"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Table as TableIcon, 
  WalletCards, 
  BarChart3,
  ShoppingBag,
  Calculator,
  LogOut
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  // Jika sedang di halaman login, sembunyikan sidebar
  if (pathname === '/login') return null;

  const menuItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "TikTok Sales", href: "/tiktok", icon: TableIcon },
    { name: "Shopee Sales", href: "/shopee", icon: TableIcon },
    { name: "Keuangan TikTok", href: "/finance-tiktok", icon: WalletCards },
    { name: "Keuangan Shopee", href: "/finance-shopee", icon: WalletCards },
    { name: "Master Produk", href: "/products", icon: ShoppingBag },
    { name: "Kalkulator HPP", href: "/kalkulator-hpp", icon: Calculator },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (error) {
      console.error("Gagal logout:", error);
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col h-screen sticky top-0">
      <h1 className="text-xl font-bold text-slate-900 mb-8 tracking-tight">Marketplace Finance</h1>
      <nav className="space-y-1.5 flex-1 text-sm font-medium">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          // Warna khusus untuk membedakan Shopee (Oranye), TikTok (Emerald), dan Produk (Indigo)
          const activeStyle = item.href.includes('shopee') 
            ? "bg-orange-50 text-[#EE4D2D] font-bold" 
            : item.href.includes('products')
            ? "bg-indigo-50 text-indigo-700 font-bold"
            : "bg-emerald-50 text-emerald-700 font-bold";

          return (
            <Link 
              key={item.href}
              href={item.href} 
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive ? activeStyle : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Icon size={18} /> {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bagian Bawah Sidebar - Tombol Logout */}
      <div className="mt-auto pt-6 border-t border-slate-200">
        <button 
          onClick={handleLogout} 
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-slate-500 hover:text-red-600 hover:bg-red-50 text-sm font-medium"
        >
          <LogOut size={18} /> Logout
        </button>
      </div>
    </aside>
  );
}