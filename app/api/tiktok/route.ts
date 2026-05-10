import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

// Menghubungkan ke Neon menggunakan URL dari .env.local
const sql = neon(process.env.DATABASE_URL!);

// GET: Mengambil data dari Database
export async function GET() {
  try {
    // Kita ubah nama kolom database menjadi camelCase agar cocok dengan frontend
    const data = await sql`
      SELECT 
        order_id AS "orderId", 
        date, 
        product_name AS "productName", 
        sku, 
        quantity, 
        amount, 
        status 
      FROM tiktok_orders 
      ORDER BY date DESC
    `;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

// POST: Menyimpan data baru ke Database
export async function POST(request: Request) {
  try {
    const { orders } = await request.json();

    // Looping untuk menyimpan setiap baris Excel ke Neon Database
    // Kita gunakan trik UPSERT (ON CONFLICT DO UPDATE)
    // Jika Order ID sudah ada di database, ia hanya akan mengupdate statusnya (mencegah data ganda!)
    for (const order of orders) {
      await sql`
        INSERT INTO tiktok_orders (order_id, date, product_name, sku, quantity, amount, status)
        VALUES (${order.orderId}, ${order.date}, ${order.productName}, ${order.sku}, ${order.quantity}, ${order.amount}, ${order.status})
        ON CONFLICT (order_id) 
        DO UPDATE SET 
          status = EXCLUDED.status, 
          amount = EXCLUDED.amount,
          sku = EXCLUDED.sku,
          product_name = EXCLUDED.product_name;
      `;
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: "Gagal menyimpan data" }, { status: 500 });
  }
}