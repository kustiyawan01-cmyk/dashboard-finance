// FILE: app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, EyeOff, Eye } from "lucide-react";
import { useAuth } from "../context/AuthContext"; // <-- TAMBAHAN IMPORT

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { setUser } = useAuth(); // <-- TAMBAHAN PANGGIL CONTEXT

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // --- BAGIAN INI YANG DIREPLACE LOGIKANYA ---
        // Asumsi: Jika API mengembalikan data.role, gunakan itu. 
        // Jika tidak, kita buat deteksi otomatis: kalau username-nya "admin" maka role "admin", sisanya "user"
        const userRole = data.role || (username.toLowerCase() === 'admin' ? 'admin' : 'user');
        
        const userData = { username: username, role: userRole as "admin" | "user" };
        
        setUser(userData); // Simpan ke state global
        localStorage.setItem("authUser", JSON.stringify(userData)); // Simpan ke memori browser
        
        router.push("/");
        // ------------------------------------------
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("Server error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // ... SISA KODE DESAIN UI LOGIN ANDA DI SINI (TIDAK ADA YANG BERUBAH) ...
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center font-sans bg-[#006CD0]">
      {/* SHAPES BACKGROUND */}
      <div className="absolute -bottom-32 -left-32 w-[600px] h-[600px] bg-[#005AB5] rounded-full mix-blend-multiply opacity-80 pointer-events-none"></div>
      <div className="absolute -bottom-64 -right-10 w-[800px] h-[800px] bg-[#005AB5] rounded-full mix-blend-multiply opacity-80 pointer-events-none"></div>
      <div className="absolute -top-64 -left-20 w-[900px] h-[900px] bg-[#004A9E] rounded-full mix-blend-multiply opacity-90 pointer-events-none"></div>
      <div className="absolute -top-32 -right-32 w-[800px] h-[800px] bg-white rounded-full mix-blend-overlay opacity-20 pointer-events-none"></div>
      <div className="absolute bg-white/10 backdrop-blur-sm w-[90%] max-w-[1000px] h-[600px] rounded-[40px] shadow-2xl z-0 hidden lg:block overflow-hidden">
         <div className="absolute top-0 right-0 w-1/2 h-full bg-white"></div>
         <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#006CD0] rounded-tl-full rounded-bl-full translate-x-32 translate-y-20"></div>
      </div>

      {/* KARTU LOGIN UTAMA */}
      <div className="bg-white w-full max-w-[400px] rounded-[30px] p-10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] z-10 relative animate-in fade-in duration-500">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-[#0B3D7B] mb-2 tracking-tight">Sign in</h2>
          <p className="text-[12px] text-slate-500 font-medium mt-2">Silakan masukkan kredensial admin Anda</p>
        </div>
        <form className="space-y-4" onSubmit={handleLogin}>
          {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-[13px] font-medium text-center">{error}</div>}
          <div>
            <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-5 py-3.5 bg-[#F4F4F4] border-transparent rounded-[14px] text-[13px] text-slate-800 focus:bg-white focus:border-[#006CD0] focus:ring-1 focus:ring-[#006CD0] outline-none transition-all placeholder:text-slate-400 font-medium" placeholder="User Name" />
          </div>
          <div className="relative">
            <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-5 pr-12 py-3.5 bg-[#F4F4F4] border-transparent rounded-[14px] text-[13px] text-slate-800 focus:bg-white focus:border-[#006CD0] focus:ring-1 focus:ring-[#006CD0] outline-none transition-all placeholder:text-slate-400 font-medium" placeholder="Password" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none">
               {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>
          <div className="pt-1 pb-2">
            <a href="#" className="text-[11px] font-bold text-[#006CD0] hover:underline">Forgot Password?</a>
          </div>
          <button type="submit" disabled={isLoading} className="w-full flex justify-center items-center py-3.5 px-4 rounded-[14px] text-sm font-bold text-white bg-[#006CD0] hover:bg-[#005AB5] focus:outline-none disabled:opacity-70 transition-all shadow-md shadow-[#006CD0]/30">
            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}