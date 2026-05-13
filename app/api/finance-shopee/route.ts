import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    // 1. AUTO-CREATE: Akan otomatis membuat tabel baru dengan struktur yang 100% benar
    await sql`
      CREATE TABLE IF NOT EXISTS shopee_finances (
        order_id VARCHAR(100) PRIMARY KEY,
        order_status VARCHAR(50),
        created_date VARCHAR(50),
        date VARCHAR(50),
        qty INTEGER,
        sku VARCHAR(100),
        product_name TEXT,
        hpp_per_item NUMERIC,
        total_hpp NUMERIC,
        net NUMERIC,
        laba_bersih NUMERIC,
        fees NUMERIC,
        harga_produk NUMERIC,
        details JSONB
      );
    `;

    const data = await sql`SELECT * FROM shopee_finances ORDER BY date DESC`;
    
    const formattedData = data.map(row => ({
      orderId: row.order_id,
      orderStatus: row.order_status,
      createdDate: row.created_date,
      date: row.date,
      qty: row.qty,
      sku: row.sku,
      productName: row.product_name,
      hppPerItem: Number(row.hpp_per_item),
      totalHpp: Number(row.total_hpp),
      net: Number(row.net),
      labaBersih: Number(row.laba_bersih),
      fees: Number(row.fees),
      hargaProduk: Number(row.harga_produk),
      ...(row.details || {}) 
    }));

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const finances = await request.json();

    for (const item of finances) {
      // JSONB untuk merapikan puluhan data potongan tanpa membuat kolom satu-satu
      const detailsJson = {
        ongkirPembeli: item.ongkirPembeli || 0,
        subsidiOngkir: item.subsidiOngkir || 0,
        voucherShopee: item.voucherShopee || 0,
        cashbackShopee: item.cashbackShopee || 0,
        penyesuaianSaldo: item.penyesuaianSaldo || 0,
        codPembeli: item.codPembeli || 0,
        kompensasi: item.kompensasi || 0,
        admin: item.admin || 0,
        layanan: item.layanan || 0,
        ongkirXtra: item.ongkirXtra || 0,
        cashbackXtra: item.cashbackXtra || 0,
        ams: item.ams || 0,
        komisiAffiliate: item.komisiAffiliate || 0,
        pajak: item.pajak || 0,
        biayaCod: item.biayaCod || 0,
        voucherPenjual: item.voucherPenjual || 0,
        cashbackPenjual: item.cashbackPenjual || 0,
        shopeeAds: item.shopeeAds || 0,
        penalti: item.penalti || 0,
        refund: item.refund || 0,
        retur: item.retur || 0,
        transfer: item.transfer || 0,
        materai: item.materai || 0,
        penyesuaianSistem: item.penyesuaianSistem || 0
      };

      await sql`
        INSERT INTO shopee_finances (
          order_id, order_status, created_date, date, qty, sku, product_name, 
          hpp_per_item, total_hpp, net, laba_bersih, fees, harga_produk, details
        ) VALUES (
          ${item.orderId}, ${item.orderStatus}, ${item.createdDate}, ${item.date}, 
          ${item.qty}, ${item.sku}, ${item.productName}, ${item.hppPerItem}, 
          ${item.totalHpp}, ${item.net}, ${item.labaBersih}, ${item.fees}, ${item.hargaProduk}, ${detailsJson}
        )
        ON CONFLICT (order_id) DO UPDATE SET 
          order_status = EXCLUDED.order_status,
          created_date = EXCLUDED.created_date,
          date = EXCLUDED.date,
          qty = EXCLUDED.qty,
          sku = EXCLUDED.sku,
          product_name = EXCLUDED.product_name,
          hpp_per_item = EXCLUDED.hpp_per_item,
          total_hpp = EXCLUDED.total_hpp,
          net = EXCLUDED.net,
          laba_bersih = EXCLUDED.laba_bersih,
          fees = EXCLUDED.fees,
          harga_produk = EXCLUDED.harga_produk,
          details = EXCLUDED.details;
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST Error:", error);
    return NextResponse.json({ error: "Gagal menyimpan data" }, { status: 500 });
  }
}