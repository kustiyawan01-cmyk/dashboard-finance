import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Mencegah Next.js melakukan caching pada route ini
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    // AUTO-CREATE KOLOM BARU: Tambahkan kolom jika belum ada di database
    await sql`
      ALTER TABLE tiktok_finances 
      ADD COLUMN IF NOT EXISTS hpp_per_item NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_hpp NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS laba_bersih NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS order_status VARCHAR(50) DEFAULT 'Selesai';
    `;

    const data = await sql`SELECT * FROM tiktok_finances ORDER BY settled_date DESC`;
    
    return NextResponse.json(data.map(item => ({
      orderId: item.order_id,
      createdDate: item.created_date,
      date: item.settled_date,
      qty: item.qty,
      subtotal: Number(item.subtotal),
      shippingBuyer: Number(item.shipping_buyer),
      shippingSubsidy: Number(item.shipping_subsidy),
      adjustment: Number(item.adjustment_amount),
      sellerDiscount: Number(item.seller_discount),
      platformFee: Number(item.platform_fee),
      paymentFee: Number(item.payment_fee),
      affiliateFee: Number(item.affiliate_fee),
      freeShippingFee: Number(item.free_shipping_fee),
      tax: Number(item.tax),
      codFee: Number(item.cod_fee),
      fees: Number(item.total_fees),
      net: Number(item.net_settlement),
      revenue: Number(item.total_revenue),
      orderStatus: item.order_status || "Selesai",
      hppPerItem: Number(item.hpp_per_item || 0),
      totalHpp: Number(item.total_hpp || 0),
      labaBersih: Number(item.laba_bersih || item.net_settlement)
    })));
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json({ error: "Gagal ambil data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    
    // Pastikan kolom baru juga di-generate saat melakukan POST
    await sql`
      ALTER TABLE tiktok_finances 
      ADD COLUMN IF NOT EXISTS hpp_per_item NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_hpp NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS laba_bersih NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS order_status VARCHAR(50) DEFAULT 'Selesai';
    `;

    const finances = await request.json();

    for (const item of finances) {
      await sql`
        INSERT INTO tiktok_finances (
          order_id, created_date, settled_date, qty, subtotal, 
          shipping_buyer, shipping_subsidy, adjustment_amount, 
          seller_discount, platform_fee, payment_fee, 
          affiliate_fee, free_shipping_fee, tax, cod_fee, 
          total_fees, net_settlement, total_revenue,
          hpp_per_item, total_hpp, laba_bersih, order_status
        ) VALUES (
          ${item.orderId}, ${item.createdDate}, ${item.date}, ${item.qty}, ${item.subtotal},
          ${item.shippingBuyer}, ${item.shippingSubsidy}, ${item.adjustment},
          ${item.sellerDiscount}, ${item.platformFee}, ${item.paymentFee},
          ${item.affiliateFee}, ${item.freeShippingFee}, ${item.tax}, ${item.codFee},
          ${item.fees}, ${item.net}, ${item.revenue},
          ${item.hppPerItem || 0}, ${item.totalHpp || 0}, ${item.labaBersih || item.net}, ${item.orderStatus || 'Selesai'}
        )
        ON CONFLICT (order_id) DO UPDATE SET
          total_revenue = EXCLUDED.total_revenue,
          subtotal = EXCLUDED.subtotal,
          shipping_buyer = EXCLUDED.shipping_buyer,
          shipping_subsidy = EXCLUDED.shipping_subsidy,
          adjustment_amount = EXCLUDED.adjustment_amount,
          seller_discount = EXCLUDED.seller_discount,
          platform_fee = EXCLUDED.platform_fee,
          payment_fee = EXCLUDED.payment_fee,
          affiliate_fee = EXCLUDED.affiliate_fee,
          free_shipping_fee = EXCLUDED.free_shipping_fee,
          tax = EXCLUDED.tax,
          cod_fee = EXCLUDED.cod_fee,
          total_fees = EXCLUDED.total_fees,
          net_settlement = EXCLUDED.net_settlement,
          hpp_per_item = EXCLUDED.hpp_per_item,
          total_hpp = EXCLUDED.total_hpp,
          laba_bersih = EXCLUDED.laba_bersih,
          order_status = EXCLUDED.order_status;
      `;
    }
    return NextResponse.json({ message: "Data rincian berhasil diperbarui!" });
  } catch (error: any) {
    console.error("=== DETAIL ERROR DATABASE ===", error);
    return NextResponse.json({ error: error.message || "Gagal simpan ke database" }, { status: 500 });
  }
}