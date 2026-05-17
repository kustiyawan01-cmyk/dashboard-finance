"use client";

import React, { useState, useEffect, useRef } from "react";
import { Printer, RotateCcw, Trash2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface ScannedItem {
  id: number;
  resi: string;
  orderId: string;
  customerName: string;
  expedition: string;
  scannedAt: Date;
}

interface Message {
  type: "success" | "error" | "warning" | "info" | "";
  text: string;
}

const ScanManifestPage = () => {
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [currentInput, setCurrentInput] = useState<string>("");
  const [lastMessage, setLastMessage] = useState<Message>({ type: "", text: "Silakan mulai scan resi." });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleScan = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const resi = currentInput.trim().toUpperCase();
    if (!resi) return;

    if (scannedItems.some(item => item.resi === resi)) {
      setLastMessage({ type: "warning", text: `PERINGATAN: Resi ${resi} sudah di-scan sebelumnya.` });
      setCurrentInput("");
      return;
    }

    setLastMessage({ type: "info", text: `Memvalidasi resi ${resi}...` });

    setTimeout(() => {
      const isFound = Math.random() > 0.2; 
      if (isFound) {
        const newItem: ScannedItem = {
          id: Date.now(),
          resi: resi,
          orderId: `TIK-${Math.floor(10000000 + Math.random() * 90000000)}`,
          customerName: "Pelanggan Acak",
          expedition: "JNE Express",
          scannedAt: new Date(),
        };
        setScannedItems(prevItems => [newItem, ...prevItems]);
        setLastMessage({ type: "success", text: `SUKSES: Order ID ${newItem.orderId} berhasil divalidasi.` });
      } else {
        setLastMessage({ type: "error", text: `ERROR: Resi ${resi} tidak ditemukan di sistem!` });
      }
      setCurrentInput("");
      inputRef.current?.focus();
    }, 300);
  };

  const handleRemoveItem = (idToRemove: number) => {
    setScannedItems(prevItems => prevItems.filter(item => item.id !== idToRemove));
  };
  
  const handleResetSession = () => {
    setScannedItems([]);
    setLastMessage({ type: "", text: "Sesi telah direset. Silakan mulai scan baru." });
    setCurrentInput("");
    inputRef.current?.focus();
  };

  const handlePrintManifest = () => {
    window.print();
  };

  const MessageCard = () => {
    const messageConfig = {
      success: { icon: CheckCircle, classes: "bg-emerald-50 border-emerald-500 text-emerald-800" },
      error: { icon: XCircle, classes: "bg-red-50 border-red-500 text-red-800" },
      warning: { icon: AlertTriangle, classes: "bg-amber-50 border-amber-500 text-amber-800" },
      info: { icon: AlertTriangle, classes: "bg-sky-50 border-sky-500 text-sky-800" },
      "": { icon: null, classes: "bg-slate-100 border-slate-300 text-slate-600" }
    };
    const config = messageConfig[lastMessage.type] || messageConfig[""];
    const Icon = config.icon;

    return (
      <div className={`mt-4 p-4 border-l-4 rounded-md flex items-start gap-3 ${config.classes}`}>
        {Icon && <Icon className="w-5 h-5 mt-0.5 shrink-0" />}
        <span className="text-sm font-medium">{lastMessage.text}</span>
      </div>
    );
  };

  return (
    <>
      <main className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
        <div className="printable-content">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Scan & Manifest Pengiriman</h1>
              <p className="text-slate-500 mt-1">Scan resi pada paket yang siap dikirim untuk validasi internal.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200 gap-4">
                  <span className="font-bold text-lg text-indigo-600">Total Paket di-Scan: {scannedItems.length}</span>
                  <div className="flex gap-2">
                      <button onClick={handlePrintManifest} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm font-semibold transition-colors disabled:bg-slate-300" disabled={scannedItems.length === 0}>
                        <Printer size={16} /> Cetak
                      </button>
                      <button onClick={handleResetSession} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm font-semibold transition-colors disabled:bg-slate-300" disabled={scannedItems.length === 0}>
                        <RotateCcw size={16} /> Reset
                      </button>
                  </div>
              </div>
              <div className="overflow-auto max-h-[60vh] border rounded-lg">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Waktu Scan</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nomor Resi</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Order ID</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {scannedItems.length > 0 ? (
                      scannedItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">{item.scannedAt.toLocaleTimeString('id-ID')}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">{item.resi}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{item.orderId}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                            <button onClick={() => handleRemoveItem(item.id)} className="text-red-600 hover:text-red-900 p-1" title="Hapus item">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center py-12 text-slate-500">Belum ada paket yang di-scan.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 sticky top-6">
                <h2 className="text-lg font-semibold mb-2 text-slate-800">Area Scan</h2>
                <form onSubmit={handleScan}>
                  <label htmlFor="resi-input" className="block text-sm font-medium text-slate-700 mb-2">SCAN RESI DI SINI</label>
                  <input
                    ref={inputRef}
                    id="resi-input"
                    type="text"
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    placeholder="Arahkan scanner ke barcode..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg font-mono"
                    autoFocus
                  />
                </form>
                <MessageCard />
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <div id="manifest-to-print" className="hidden">
        <h1 className="text-2xl font-bold mb-2 text-slate-900">MANIFEST SERAH TERIMA PAKET</h1>
        <div className="flex justify-between items-end mb-4">
          <p className="text-sm text-slate-700"><strong>Tanggal Cetak:</strong> {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p className="text-lg font-bold text-slate-800">Total: {scannedItems.length} Paket</p>
        </div>
        <table className="w-full border-collapse border border-slate-400 text-sm">
            <thead>
                <tr className="bg-slate-200">
                    <th className="border border-slate-400 p-2 text-left w-12">No.</th>
                    <th className="border border-slate-400 p-2 text-left">Nomor Resi</th>
                    <th className="border border-slate-400 p-2 text-left">Order ID</th>
                </tr>
            </thead>
            <tbody>
                {scannedItems.map((item, index) => (
                    <tr key={item.id}>
                        <td className="border border-slate-400 p-2 text-center font-mono">{index + 1}</td>
                        <td className="border border-slate-400 p-2 font-mono">{item.resi}</td>
                        <td className="border border-slate-400 p-2 font-mono">{item.orderId}</td>
                    </tr>
                ))}
            </tbody>
        </table>
        <div className="mt-12 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
                <p className="mb-16">Diserahkan oleh,</p>
                <p className="border-t border-slate-400 pt-1">(_________________________)</p>
                <p className="font-semibold">Tim Gudang</p>
            </div>
            <div>
                <p>Diterima oleh Kurir,</p>
                <p className="mb-1">Pukul: ______ : ______</p>
                <p className="mt-12 border-t border-slate-400 pt-1">(_________________________)</p>
                <p className="font-semibold">Nama & Tanda Tangan</p>
            </div>
        </div>
      </div>
    </>
  );
};

export default ScanManifestPage;


