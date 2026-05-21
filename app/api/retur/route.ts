import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// Menginisialisasi koneksi Neon database menggunakan env DATABASE_URL
const sql = neon(process.env.DATABASE_URL!);

// 1. GET: Mengambil semua data retur dari Neon DB
export async function GET() {
  try {
    const data = await sql`SELECT * FROM "ReturnOrder" ORDER BY "orderId" DESC`;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. POST: Menyimpan atau memperbarui data secara otomatis (Upsert)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data } = body;

    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Format data harus berupa array" }, { status: 400 });
    }

    // Melakukan loop untuk mendeteksi konflik; jika orderId sudah ada, data akan diperbarui (Upsert)
    for (const item of data) {
      await sql`
        INSERT INTO "ReturnOrder" ("orderId", "resi", "kurir", "buyer", "produk", "apiStatus", "apiLastUpdate", "statusGudang", "tglDiterima")
        VALUES (${item.orderId}, ${item.resi}, ${item.kurir}, ${item.buyer || '-'}, ${item.produk || '-'}, ${item.apiStatus || 'Menunggu Sinkronisasi'}, ${item.apiLastUpdate || '-'}, ${item.statusGudang || 'PENDING'}, ${item.tglDiterima || null})
        ON CONFLICT ("orderId") 
        DO UPDATE SET 
          "resi" = EXCLUDED."resi",
          "kurir" = EXCLUDED."kurir",
          "buyer" = EXCLUDED."buyer",
          "produk" = EXCLUDED."produk",
          "apiStatus" = EXCLUDED."apiStatus",
          "apiLastUpdate" = EXCLUDED."apiLastUpdate",
          "statusGudang" = EXCLUDED."statusGudang",
          "tglDiterima" = EXCLUDED."tglDiterima"
      `;
    }

    return NextResponse.json({ success: true, message: "Data berhasil disinkronisasi ke Neon Database!" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}