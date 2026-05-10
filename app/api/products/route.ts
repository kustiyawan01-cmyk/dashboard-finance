import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum di-set di .env");
    const sql = neon(process.env.DATABASE_URL);
    
    const data = await sql`SELECT * FROM products ORDER BY id DESC`;
    
    return NextResponse.json(data.map(item => ({
      id: item.id,
      sku: item.sku,
      kategori: item.kategori,
      name: item.nama_produk,
      variation: item.variasi,
      hargaModal: Number(item.harga_modal) || 0,
      hargaJual: Number(item.harga_jual) || 0,
      stokAwal: Number(item.stok_awal) || 0,
      status: item.status || 'Aktif',
      penjualan: Number(item.penjualan) || 0,
      stokTersedia: Number(item.stok_tersedia) || 0
    })));
  } catch (error: any) {
    console.error("🚨 ERROR API GET PRODUCTS:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum di-set di .env");
    const sql = neon(process.env.DATABASE_URL);
    const products = await request.json();

    for (const item of products) {
      await sql`
        INSERT INTO products (
          sku, kategori, nama_produk, variasi, harga_modal, harga_jual, stok_awal, status, penjualan, stok_tersedia
        ) VALUES (
          ${item.sku}, ${item.kategori}, ${item.name}, ${item.variation}, ${item.hargaModal}, ${item.hargaJual},
          ${item.stokAwal}, ${item.status}, ${item.penjualan}, ${item.stokTersedia}
        )
        ON CONFLICT (sku) DO UPDATE SET
          kategori = EXCLUDED.kategori,
          nama_produk = EXCLUDED.nama_produk,
          variasi = EXCLUDED.variasi,
          harga_modal = EXCLUDED.harga_modal,
          harga_jual = EXCLUDED.harga_jual,
          stok_awal = EXCLUDED.stok_awal,
          status = EXCLUDED.status,
          penjualan = EXCLUDED.penjualan,
          stok_tersedia = EXCLUDED.stok_tersedia;
      `;
    }
    return NextResponse.json({ message: "Berhasil Simpan!" });
  } catch (error: any) {
    console.error("🚨 ERROR API POST PRODUCTS:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}