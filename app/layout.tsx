// FILE: app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientSidebar from "./components/ClientSidebar";
import ClientProviders from "./components/ClientProviders";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "MarketplaceFinance",
  description: "Dashboard outbound marketplace finance",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        <ClientProviders>
          {/* Tambahan pt-16 (padding-top) khusus untuk HP (lg:pt-0 untuk PC) */}
          <div className="flex bg-[#F8FAFC] min-h-screen print:bg-white">
            <div className="fixed inset-x-0 top-0 z-50 lg:static lg:z-auto lg:inset-auto print:hidden">
              <ClientSidebar /> 
            </div>
            <main className="flex-1 min-w-0 max-w-full overflow-x-hidden overflow-y-auto min-h-screen w-full pt-16 lg:pt-0 print:pt-0 print:overflow-visible print:min-h-0 print:h-auto print:block">
              {children}
            </main>
          </div>
        </ClientProviders>
      </body>
    </html>
  );
}