import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL!);

const text = (value: unknown, fallback = "") => String(value ?? fallback).trim();
const num = (value: unknown) => Number(value) || 0;
const arr = (value: unknown) => Array.isArray(value) ? value : [];

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS shopee_finances (
      order_id VARCHAR(120) PRIMARY KEY,
      order_status VARCHAR(80),
      created_date VARCHAR(80),
      date VARCHAR(80),
      qty NUMERIC DEFAULT 0,
      sku VARCHAR(180),
      product_name TEXT,
      hpp_per_item NUMERIC DEFAULT 0,
      total_hpp NUMERIC DEFAULT 0,
      net NUMERIC DEFAULT 0,
      laba_bersih NUMERIC DEFAULT 0,
      fees NUMERIC DEFAULT 0,
      harga_produk NUMERIC DEFAULT 0,
      hpp_status VARCHAR(80) DEFAULT 'Valid',
      hpp_missing_skus JSONB DEFAULT '[]'::jsonb,
      hpp_rule TEXT,
      order_items JSONB DEFAULT '[]'::jsonb,
      details JSONB DEFAULT '{}'::jsonb,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  await sql`
    ALTER TABLE shopee_finances
    ADD COLUMN IF NOT EXISTS hpp_status VARCHAR(80) DEFAULT 'Valid',
    ADD COLUMN IF NOT EXISTS hpp_missing_skus JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS hpp_rule TEXT,
    ADD COLUMN IF NOT EXISTS order_items JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  `;
}

export async function GET() {
  try {
    await ensureTable();
    const data = await sql`SELECT * FROM shopee_finances ORDER BY date DESC`;

    return NextResponse.json(data.map((row) => ({
      platform: "Shopee",
      orderId: row.order_id,
      orderStatus: row.order_status || "Selesai",
      createdDate: row.created_date || "-",
      date: row.date || "-",
      qty: Number(row.qty) || 0,
      sku: row.sku || "-",
      productName: row.product_name || "-",
      hppPerItem: Number(row.hpp_per_item) || 0,
      totalHpp: Number(row.total_hpp) || 0,
      net: Number(row.net) || 0,
      labaBersih: Number(row.laba_bersih) || 0,
      fees: Number(row.fees) || 0,
      hargaProduk: Number(row.harga_produk) || 0,
      hppStatus: row.hpp_status || "Valid",
      hppMissingSkus: Array.isArray(row.hpp_missing_skus) ? row.hpp_missing_skus : [],
      hppRule: row.hpp_rule || "",
      orderItems: Array.isArray(row.order_items) ? row.order_items : [],
      isFinalProfit: (row.hpp_status || "Valid") !== "Belum Mapping",
      ...(row.details || {}),
    })));
  } catch (error: any) {
    console.error("GET finance-shopee error:", error?.message || error);
    return NextResponse.json({ error: "Gagal mengambil finance Shopee", detail: error?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureTable();
    const body = await request.json();
    const finances = Array.isArray(body) ? body : body.finances;
    if (!Array.isArray(finances)) return NextResponse.json({ error: "Format finance Shopee tidak valid" }, { status: 400 });

    for (const item of finances) {
      if (!item.orderId) continue;

      const missingSkusJson = JSON.stringify(arr(item.hppMissingSkus));
      const orderItemsJson = JSON.stringify(arr(item.orderItems));
      const detailsStr = JSON.stringify({
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
        penyesuaianSistem: item.penyesuaianSistem || 0,
      });

      await sql`
        INSERT INTO shopee_finances (
          order_id, order_status, created_date, date, qty, sku, product_name,
          hpp_per_item, total_hpp, net, laba_bersih, fees, harga_produk,
          hpp_status, hpp_missing_skus, hpp_rule, order_items, details, updated_at
        ) VALUES (
          ${text(item.orderId)}, ${text(item.orderStatus, "Selesai")}, ${text(item.createdDate, "-")}, ${text(item.date, "-")}, ${num(item.qty)}, ${text(item.sku, "-")}, ${text(item.productName, "-")},
          ${num(item.hppPerItem)}, ${num(item.totalHpp)}, ${num(item.net)}, ${num(item.labaBersih)}, ${num(item.fees)}, ${num(item.hargaProduk)},
          ${text(item.hppStatus, "Valid")}, ${missingSkusJson}::jsonb, ${text(item.hppRule)}, ${orderItemsJson}::jsonb, ${detailsStr}::jsonb, NOW()
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
          hpp_status = EXCLUDED.hpp_status,
          hpp_missing_skus = EXCLUDED.hpp_missing_skus,
          hpp_rule = EXCLUDED.hpp_rule,
          order_items = EXCLUDED.order_items,
          details = EXCLUDED.details,
          updated_at = NOW();
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST finance-shopee error:", error?.message || error);
    return NextResponse.json({ error: "Gagal menyimpan finance Shopee", detail: error?.message }, { status: 500 });
  }
}
