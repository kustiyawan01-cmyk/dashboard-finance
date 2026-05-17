import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

export const dynamic = "force-dynamic"; // WAJIB: Mencegah Next.js melakukan cache mati pada route ini

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
      FROM shopee_orders 
      ORDER BY date DESC
    `;
    return NextResponse.json(data);
  } catch (error: any) {
    // Tampilkan pesan error ASLI dari database ke Terminal VS Code
    console.error("Database GET Error Detail:", error?.message || error);
    return NextResponse.json({ error: "Gagal mengambil data", detail: error?.message }, { status: 500 });
  }
}

// POST: Menyimpan data baru ke Database
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 1. Cek apakah frontend mengirim Array langsung [...] atau Object { orders: [...] }
    const orders = Array.isArray(body) ? body : body.orders;

    if (!orders || !Array.isArray(orders)) {
      return NextResponse.json({ error: "Format data tidak valid" }, { status: 400 });
    }

    // Looping untuk menyimpan setiap baris Excel ke Neon Database
    // Kita gunakan trik UPSERT (ON CONFLICT DO UPDATE)
    for (const order of orders) {
      // Pastikan mendukung camelCase atau snake_case dari frontend
      const orderId = order.order_id || order.orderId;
      
      // 2. Skip/abaikan jika baris excel kosong (tidak ada Order ID)
      if (!orderId) continue;

      // 3. Beri nilai default (||) agar database tidak crash karena nilai 'undefined'
      await sql`
        INSERT INTO shopee_orders (order_id, date, product_name, sku, quantity, amount, status)
        VALUES (
          ${orderId}, 
          ${order.date || new Date().toISOString()}, 
          ${order.product_name || order.productName || '-'}, 
          ${order.sku || '-'}, 
          ${Number(order.quantity) || 1}, 
          ${Number(order.amount) || 0}, 
          ${order.status || 'Pending'}
        )
        ON CONFLICT (order_id) 
        DO UPDATE SET 
          status = EXCLUDED.status, 
          amount = EXCLUDED.amount,
          sku = EXCLUDED.sku,
          product_name = EXCLUDED.product_name;
      `;
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    // 4. Log error lebih detail ke console server agar tahu apa yang salah
    console.error("Database Error Detail:", error?.message || error);
    return NextResponse.json({ error: "Gagal menyimpan data", detail: error?.message }, { status: 500 });
  }
}