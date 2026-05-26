"use client";

import React, { useState, useEffect } from "react";
import { 
  Package, Layers, ClipboardList, Plus, RefreshCw, 
  CheckCircle2, AlertTriangle, ArrowDownLeft, Sliders, FolderPlus
} from "lucide-react";

interface BahanBaku {
  id: number;
  nama_bahan: string;
  stok_meter: number;
  kategori: string;
  updatedAt: string;
}

interface BarangJadi {
  id: number;
  nama_produk: string;
  stok_pcs: number;
  kode_sku: string;
  updatedAt: string;
}

interface WorkOrder {
  id: number;
  nomor_wo: string;
  barang_jadi_id: number;
  nama_produk: string;
  kode_sku: string;
  jumlah_produksi: number;
  status: "PROSES" | "SELESAI";
  createdAt: string;
}

export default function InventoryManagementPage() {
  const [activeTab, setActiveTab] = useState<"bahan" | "produk" | "wo">("bahan");
  const [loading, setLoading] = useState(true);
  
  const [bahanList, setBahanList] = useState<BahanBaku[]>([]);
  const [produkList, setProdukList] = useState<BarangJadi[]>([]);
  const [woList, setWorkOrders] = useState<WorkOrder[]>([]);

  // State Form Modal
  const [modalType, setModalType] = useState<"inbound" | "opname" | "create_wo" | "add_bahan" | "add_produk" | null>(null);
  
  // Data State Form Input
  const [selectedBahanId, setSelectedBahanId] = useState<string>("");
  const [selectedProdukId, setSelectedProdukId] = useState<string>("");
  const [inputJumlah, setInputJumlah] = useState<string>("");
  const [inputNomorWO, setInputNomorWO] = useState<string>("");
  
  // Input Master Baru
  const [newBahanName, setNewBahanName] = useState("");
  const [newBahanCategory, setNewBahanCategory] = useState("Kulit Sintetis");
  const [newBahanStokAwal, setNewBahanStokAwal] = useState("0");
  
  const [newProdukName, setNewProdukName] = useState("");
  const [newProdukSKU, setNewProdukSKU] = useState("");
  // Resep BOM dinamis (sementara kita buat 1 bahan utama untuk simplisitas form)
  const [bomBahanId, setBomBahanId] = useState("");
  const [bomMeter, setBomMeter] = useState("");

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchAllInventoryData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory");
      if (res.ok) {
        const data = await res.json();
        setBahanList(data.bahan || []);
        setProdukList(data.produk || []);
        setWorkOrders(data.wo || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllInventoryData();
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    let payload: any = {};
    if (modalType === "inbound") {
      payload = { action: "INBOUND", bahan_baku_id: Number(selectedBahanId), jumlah_meter: Number(inputJumlah) };
    } else if (modalType === "opname") {
      payload = { action: "OPNAME", bahan_baku_id: Number(selectedBahanId), stok_fisik_meter: Number(inputJumlah) };
    } else if (modalType === "create_wo") {
      payload = { action: "CREATE_WO", nomor_wo: inputNomorWO.trim().toUpperCase(), barang_jadi_id: Number(selectedProdukId), jumlah_produksi: Number(inputJumlah) };
    } else if (modalType === "add_bahan") {
      payload = { action: "ADD_BAHAN", nama_bahan: newBahanName.trim(), kategori: newBahanCategory, stok_awal: Number(newBahanStokAwal) };
    } else if (modalType === "add_produk") {
      payload = { 
        action: "ADD_PRODUK", 
        nama_produk: newProdukName.trim(), 
        kode_sku: newProdukSKU.trim().toUpperCase(),
        resep: bomBahanId ? [{ bahan_baku_id: Number(bomBahanId), jumlah_butuh_meter: Number(bomMeter || 0) }] : []
      };
    }

    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: result.message || "Aksi berhasil dieksekusi!" });
        setTimeout(() => {
          setModalType(null);
          setMessage(null);
          clearForm();
          fetchAllInventoryData();
        }, 1500);
      } else {
        setMessage({ type: "error", text: result.error || "Gagal memproses." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Terjadi kesalahan server." });
    }
  };

  const handleCompleteWO = async (woId: number) => {
    if (!confirm("Apakah Anda yakin produksi untuk WO ini sudah selesai?")) return;
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "COMPLETE_WO", id: woId })
      });
      if (res.ok) {
        alert("Produksi selesai! Stok barang jadi bertambah.");
        fetchAllInventoryData();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (e) {
      alert("Error.");
    }
  };

  const clearForm = () => {
    setSelectedBahanId("");
    setSelectedProdukId("");
    setInputJumlah("");
    setInputNomorWO("");
    setNewBahanName("");
    setNewBahanStokAwal("0");
    setNewProdukName("");
    setNewProdukSKU("");
    setBomBahanId("");
    setBomMeter("");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col w-full">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2 rounded-lg"><Sliders size={20} /></div>
          <div>
            <h1 className="text-lg font-black text-slate-800 leading-tight">Sistem ERP Konveksi Alas Jok</h1>
            <p className="text-xs text-slate-500 font-medium">Modul Inventaris Bahan Baku & Perintah Kerja</p>
          </div>
        </div>
        <button onClick={fetchAllInventoryData} className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-600"><RefreshCw size={16} /></button>
      </header>

      <main className="p-4 md:p-8 max-w-[1400px] mx-auto w-full flex-1 space-y-6">
        
        {/* ROW 1: SUMMARY METRICS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Jenis Bahan</p>
            <h3 className="text-2xl font-black text-slate-800">{bahanList.length} <span className="text-xs font-normal text-slate-400">Varian</span></h3>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
            <p className="text-[11px] font-bold text-blue-500 uppercase tracking-wider mb-1">Total Bahan di Gudang</p>
            <h3 className="text-2xl font-black text-slate-800">{bahanList.reduce((acc, curr) => acc + Number(curr.stok_meter), 0).toFixed(1)} <span className="text-xs font-normal text-slate-400">Meter</span></h3>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-orange-500">
            <p className="text-[11px] font-bold text-orange-500 uppercase tracking-wider mb-1">WO Sedang Berjalan</p>
            <h3 className="text-2xl font-black text-slate-800">{woList.filter(w => w.status === 'PROSES').length} <span className="text-xs font-normal text-slate-400">Antrean</span></h3>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Stok Jok Siap Jual</p>
            <h3 className="text-2xl font-black text-slate-800">{produkList.reduce((acc, curr) => acc + curr.stok_pcs, 0)} <span className="text-xs font-normal text-slate-400">Pcs</span></h3>
          </div>
        </div>

        {/* CONTROLLER PANEL */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white">
            
            <div className="flex bg-slate-100 p-1 rounded-xl w-max">
              <button onClick={() => setActiveTab("bahan")} className={`text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 ${activeTab === "bahan" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
                <Package size={14} /> Bahan Baku ({bahanList.length})
              </button>
              <button onClick={() => setActiveTab("produk")} className={`text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 ${activeTab === "produk" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
                <Layers size={14} /> Varian Produk ({produkList.length})
              </button>
              <button onClick={() => setActiveTab("wo")} className={`text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 ${activeTab === "wo" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
                <ClipboardList size={14} /> Work Order ({woList.length})
              </button>
            </div>

            {/* ACTION CONTROLLERS */}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { clearForm(); setModalType("add_bahan"); }} className="text-xs font-bold flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-lg hover:bg-indigo-100">
                <FolderPlus size={14} /> + Master Bahan
              </button>
              <button onClick={() => { clearForm(); setModalType("add_produk"); }} className="text-xs font-bold flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-lg hover:bg-indigo-100">
                <FolderPlus size={14} /> + Master Produk
              </button>
              <span className="w-[1px] bg-slate-200 h-8 hidden md:block mx-1"></span>
              <button onClick={() => { clearForm(); setModalType("inbound"); }} className="text-xs font-bold flex items-center gap-1 bg-white text-slate-700 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50">
                <ArrowDownLeft size={14} className="text-blue-500" /> Inbound Bahan
              </button>
              <button onClick={() => { clearForm(); setModalType("opname"); }} className="text-xs font-bold flex items-center gap-1 bg-white text-slate-700 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50">
                <AlertTriangle size={14} className="text-amber-500" /> Opname Fisik
              </button>
              <button onClick={() => { clearForm(); setModalType("create_wo"); }} className="text-xs font-bold flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                <Plus size={14} /> Buat WO
              </button>
            </div>
          </div>

          {/* TABLES */}
          <div className="overflow-x-auto w-full">
            {activeTab === "bahan" && (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">ID</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">Nama Bahan Baku</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">Kategori</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">Stok Logistik</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {bahanList.map((bahan) => (
                    <tr key={bahan.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-xs text-slate-400">#{bahan.id}</td>
                      <td className="px-6 py-4 text-sm font-black text-slate-800">{bahan.nama_bahan}</td>
                      <td className="px-6 py-4 text-xs"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold">{bahan.kategori}</span></td>
                      <td className="px-6 py-4 text-sm font-black text-indigo-600">{Number(bahan.stok_meter).toFixed(2)} Meter</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "produk" && (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">Kode SKU</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">Nama Pola Alas Jok</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">Stok Siap Jual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {produkList.map((produk) => (
                    <tr key={produk.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-xs font-mono font-bold text-indigo-600">{produk.kode_sku}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-800">{produk.nama_produk}</td>
                      <td className="px-6 py-4 text-sm font-black text-slate-800">{produk.stok_pcs} Set</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "wo" && (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">No. Perintah WO</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">Produk Target</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">Jumlah Target</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase text-center">Aksi Konveksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {woList.map((wo) => (
                    <tr key={wo.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-sm font-black text-indigo-700">{wo.nomor_wo}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-800">{wo.nama_produk}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-700">{wo.jumlah_produksi} Set</td>
                      <td className="px-6 py-4 text-xs">
                        <span className={`px-2 py-1 rounded font-bold ${wo.status === 'PROSES' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>{wo.status}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {wo.status === "PROSES" ? (
                          <button onClick={() => handleCompleteWO(wo.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-md">Selesai Jahit</button>
                        ) : (
                          <span className="text-emerald-500 text-xs font-bold">✓ Masuk Rak</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* POPUP DYNAMIC MODAL CONTAINER */}
      {modalType && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h2 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                {modalType === "add_bahan" && "Daftarkan Jenis Bahan Baku Baru"}
                {modalType === "add_produk" && "Daftarkan Pola Model Jok Baru"}
                {modalType === "inbound" && "Inbound Stok Masuk Gudang"}
                {modalType === "opname" && "Form Audit Selisih Opname"}
                {modalType === "create_wo" && "Buat Surat Perintah Kerja (WO)"}
              </h2>
              <button type="button" onClick={() => setModalType(null)} className="text-slate-400 font-bold hover:text-slate-600">X</button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              
              {/* MODAL 1: INPUT MASTER BAHAN BAKU BARU */}
              {modalType === "add_bahan" && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Material Bahan</label>
                    <input required type="text" placeholder="Contoh: Kulit Sintetis MBtech Merah" value={newBahanName} onChange={(e) => setNewBahanName(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kategori Kelompok</label>
                    <select value={newBahanCategory} onChange={(e) => setNewBahanCategory(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg outline-none bg-white">
                      <option value="Kulit Sintetis">Kulit Sintetis</option>
                      <option value="Busa">Busa Lapis</option>
                      <option value="Benang">Benang Nilon</option>
                      <option value="Aksesoris">Resleting / Kancing</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stok Gulungan Awal (Meter)</label>
                    <input type="number" value={newBahanStokAwal} onChange={(e) => setNewBahanStokAwal(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg outline-none font-bold" />
                  </div>
                </>
              )}

              {/* MODAL 2: INPUT MASTER FINISHED GOOD + RESEP BOM */}
              {modalType === "add_produk" && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Pola Model Jok</label>
                    <input required type="text" placeholder="Contoh: Jok Avanza Hitam Benang Merah" value={newProdukName} onChange={(e) => setNewProdukName(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kode SKU</label>
                    <input required type="text" placeholder="Contoh: JOK-AVNZ-RED" value={newProdukSKU} onChange={(e) => setNewProdukSKU(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg outline-none font-mono uppercase" />
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-dashed border-slate-200">
                    <p className="text-[10px] font-black text-indigo-600 uppercase mb-2">Setting Resep Potongan (BOM)</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Bahan Utama</label>
                        <select value={bomBahanId} onChange={(e) => setBomBahanId(e.target.value)} className="w-full p-1.5 text-xs border rounded bg-white">
                          <option value="">-- Tanpa Resep --</option>
                          {bahanList.map(b => <option key={b.id} value={b.id}>{b.nama_bahan}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Kebutuhan (Meter/Pcs)</label>
                        <input type="number" step="0.01" placeholder="Misal: 4.5" value={bomMeter} onChange={(e) => setBomMeter(e.target.value)} className="w-full p-1.5 text-xs border rounded font-bold" />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* MODAL 3: INBOUND STOK */}
              {modalType === "inbound" && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pilih Material Bahan</label>
                    <select required value={selectedBahanId} onChange={(e) => setSelectedBahanId(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg outline-none bg-white">
                      <option value="">-- PILIH BAHAN --</option>
                      {bahanList.map(b => <option key={b.id} value={b.id}>{b.nama_bahan} (Sisa: {Number(b.stok_meter).toFixed(1)}m)</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jumlah Meter Masuk</label>
                    <input required type="number" step="0.01" placeholder="0.00" value={inputJumlah} onChange={(e) => setInputJumlah(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg outline-none font-bold" />
                  </div>
                </>
              )}

              {/* MODAL 4: OPNAME FISIK */}
              {modalType === "opname" && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pilih Material Bahan</label>
                    <select required value={selectedBahanId} onChange={(e) => setSelectedBahanId(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg outline-none bg-white">
                      <option value="">-- PILIH BAHAN --</option>
                      {bahanList.map(b => <option key={b.id} value={b.id}>{b.nama_bahan} (Sisa: {Number(b.stok_meter).toFixed(1)}m)</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Meter Hasil Ukur Fisik Gudang</label>
                    <input required type="number" step="0.01" placeholder="0.00" value={inputJumlah} onChange={(e) => setInputJumlah(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg outline-none font-bold" />
                  </div>
                </>
              )}

              {/* MODAL 5: BUAT WORK ORDER */}
              {modalType === "create_wo" && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nomor Surat WO</label>
                    <input required type="text" placeholder="CONTOH: WO-2026-001" value={inputNomorWO} onChange={(e) => setInputNomorWO(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg outline-none font-bold uppercase" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Model Alas Jok Jadi</label>
                    <select required value={selectedProdukId} onChange={(e) => setSelectedProdukId(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg outline-none bg-white">
                      <option value="">-- PILIH MODEL JOK --</option>
                      {produkList.map(p => <option key={p.id} value={p.id}>{p.nama_produk} ({p.kode_sku})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Kuantitas Produksi (Set)</label>
                    <input required type="number" min="1" placeholder="0" value={inputJumlah} onChange={(e) => setInputJumlah(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg outline-none font-bold" />
                  </div>
                </>
              )}

              {message && (
                <div className={`text-xs font-bold p-3 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                  {message.text}
                </div>
              )}

              <div className="pt-4 border-t flex justify-end gap-2">
                <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg">Batal</button>
                <button type="submit" className="px-5 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold shadow-sm">Simpan Data</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}