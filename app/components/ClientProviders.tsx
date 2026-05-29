"use client";

import React, { useEffect, useState } from "react";
import { AuthProvider } from "../context/AuthContext";
import { Toaster } from "react-hot-toast";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-[#F8FAFC]" />;
  }

  return (
    <AuthProvider>
      <Toaster position="top-right" />
      {children}
    </AuthProvider>
  );
}