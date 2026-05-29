import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL!);

const text = (value: unknown, fallback = "") => String(value ?? fallback).trim();
const num = (value: unknown, fallback = 0) => Number(value) || fallback;

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS tiktok_order_items (
      item_key VARCHAR(300) PRIMARY KEY,
      order_id VARCHAR(120) NOT NULL,
      date VARCHAR(80),
      product_name TEXT,
      variation_name TEXT,
      marketplace_sku VARCHAR(180),
      sku_id VARCHAR(180),
      variation_id VARCHAR(180),
      quantity NUMERIC DEFAULT 1,
      amount NUMERIC DEFAULT 0,
      status VARCHAR(100),
      raw_data JSONB,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;
}

export async function GET() {
  try {
    await ensureTable();
    const data = await sql`SELECT * FROM tiktok_order_items ORDER BY date DESC, order_id DESC`;
    return NextResponse.json(data.map((row) => ({
      platform: "TikTok",
      orderId: row.order_id,
      date: row.date || "-",
      orderDate: row.date || "-",
      productName: row.product_name || "-",
      variationName: row.variation_name || "-",
      sku: row.marketplace_sku || row.sku_id || "-",
      marketplaceSku: row.marketplace_sku || "",
      skuId: row.sku_id || "",
      variationId: row.variation_id || "",
      quantity: Number(row.quantity) || 1,
      qty: Number(row.quantity) || 1,
      amount: Number(row.amount) || 0,
      itemAmount: Number(row.amount) || 0,
      status: row.status || "Unknown",
      rawData: row.raw_data || null,
    })));
  } catch (error: any) {
    console.error("TikTok GET Error:", error?.message || error);
    return NextResponse.json({ error: "Gagal mengambil data TikTok", detail: error?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureTable();
    const body = await request.json();
    const orders = Array.isArray(body) ? body : body.orders;
    if (!Array.isArray(orders)) return NextResponse.json({ error: "Format data tidak valid" }, { status: 400 });

    for (const order of orders) {
      const orderId = text(order.orderId || order.order_id);
      if (!orderId || orderId === "-") continue;
      const marketplaceSku = text(order.marketplaceSku || order.sku || order.sellerSku);
      const skuId = text(order.skuId || order.sku_id || order.idSku);
      const variationId = text(order.variationId || order.variation_id || order.idVariasi);
      const productName = text(order.productName || order.product_name || order.namaProduk, "-");
      const itemKey = [orderId, marketplaceSku || skuId || productName, variationId || "default"].join("::");
      const rawData = JSON.stringify(order || {});

      await sql`
        INSERT INTO tiktok_order_items (
          item_key, order_id, date, product_name, variation_name, marketplace_sku, sku_id, variation_id,
          quantity, amount, status, raw_data, updated_at
        ) VALUES (
          ${itemKey}, ${orderId}, ${text(order.date || order.orderDate, "-")}, ${productName},
          ${text(order.variationName || order.variation_name, "-")}, ${marketplaceSku}, ${skuId}, ${variationId},
          ${num(order.quantity || order.qty, 1)}, ${num(order.amount || order.itemAmount)}, ${text(order.status, "Unknown")},
          ${rawData}::jsonb, NOW()
        )
        ON CONFLICT (item_key) DO UPDATE SET
          date = EXCLUDED.date,
          product_name = EXCLUDED.product_name,
          variation_name = EXCLUDED.variation_name,
          marketplace_sku = EXCLUDED.marketplace_sku,
          sku_id = EXCLUDED.sku_id,
          variation_id = EXCLUDED.variation_id,
          quantity = EXCLUDED.quantity,
          amount = EXCLUDED.amount,
          status = EXCLUDED.status,
          raw_data = EXCLUDED.raw_data,
          updated_at = NOW();
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("TikTok POST Error:", error?.message || error);
    return NextResponse.json({ error: "Gagal menyimpan data TikTok", detail: error?.message }, { status: 500 });
  }
}
