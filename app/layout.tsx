// FILE: app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import { AuthProvider } from "./context/AuthContext"; // <-- TAMBAHAN
import { Toaster } from "react-hot-toast";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        <AuthProvider> {/* <-- TAMBAHAN: Bungkus dengan AuthProvider */}
          {/* Tambahan pt-16 (padding-top) khusus untuk HP (lg:pt-0 untuk PC) */}
          <div className="flex bg-[#F8FAFC] min-h-screen">
            <Sidebar /> 
            <main className="flex-1 overflow-y-auto min-h-screen w-full pt-16 lg:pt-0">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}