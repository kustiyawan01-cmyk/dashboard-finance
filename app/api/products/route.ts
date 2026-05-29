import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL!);

const safeText = (value: unknown, fallback = "") => String(value ?? fallback).trim();
const safeNumber = (value: unknown) => Number(value) || 0;

const normalizePlatform = (value: unknown) => {
  const text = safeText(value, "Internal");

  if (!text || text === "-" || text.toLowerCase() === "undefined" || text.toLowerCase() === "null") {
    return "Internal";
  }

  return text;
};

const resolvePlatforms = (platformValue: unknown) => {
  const platform = normalizePlatform(platformValue);

  if (platform.toLowerCase() === "internal") {
    return ["Internal", "Shopee", "TikTok"];
  }

  return [platform];
};

const resolveSku = (item: any) => {
  return safeText(
    item.internal_sku ||
    item.marketplace_sku ||
    item.marketplace_sku_id ||
    item.marketplace_variation_id,
    ""
  );
};

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS product_cost_mappings (
      id SERIAL PRIMARY KEY,
      platform VARCHAR(50) NOT NULL DEFAULT 'Internal',
      internal_sku VARCHAR(150),
      marketplace_sku VARCHAR(150) NOT NULL,
      marketplace_sku_id VARCHAR(150),
      marketplace_variation_id VARCHAR(150),
      kategori VARCHAR(150),
      nama_produk TEXT,
      variasi TEXT,
      harga_modal NUMERIC DEFAULT 0,
      harga_jual NUMERIC DEFAULT 0,
      effective_from VARCHAR(30),
      effective_to VARCHAR(30),
      status VARCHAR(50) DEFAULT 'Aktif',
      stok_awal NUMERIC DEFAULT 0,
      penjualan NUMERIC DEFAULT 0,
      stok_tersedia NUMERIC DEFAULT 0,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS product_cost_mappings_unique_idx ON product_cost_mappings (platform, marketplace_sku, COALESCE(effective_from, ''));`;
}

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum di-set di .env");
    await ensureTable();

    const data = await sql`SELECT * FROM product_cost_mappings ORDER BY id DESC`;

    return NextResponse.json(data.map((item) => ({
      id: item.id,
      platform: normalizePlatform(item.platform || "Internal"),
      platforms: resolvePlatforms(item.platform || "Internal"),
      sku: resolveSku(item),
      internalSku: item.internal_sku || resolveSku(item),
      marketplaceSku: item.marketplace_sku || resolveSku(item),
      marketplaceSkuId: item.marketplace_sku_id || "",
      marketplaceVariationId: item.marketplace_variation_id || "",
      kategori: item.kategori || "-",
      name: item.nama_produk || "-",
      variation: item.variasi || "-",
      hargaModal: Number(item.harga_modal) || 0,
      hargaJual: Number(item.harga_jual) || 0,
      effectiveFrom: item.effective_from || "",
      effectiveTo: item.effective_to || "",
      status: item.status || "Aktif",
      stokAwal: Number(item.stok_awal) || 0,
      penjualan: Number(item.penjualan) || 0,
      stokTersedia: Number(item.stok_tersedia) || 0,
    })));
  } catch (error: any) {
    console.error("ERROR API GET PRODUCTS:", error?.message || error);
    return NextResponse.json({ error: error?.message || "Gagal ambil data produk" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum di-set di .env");
    await ensureTable();

    const body = await request.json();
    const products = Array.isArray(body) ? body : body.products;

    if (!Array.isArray(products)) {
      return NextResponse.json({ error: "Format data products tidak valid" }, { status: 400 });
    }

    for (const item of products) {
      const platform = normalizePlatform(item.platform || item.marketplace || (Array.isArray(item.platforms) ? item.platforms[0] : "Internal"));
      const marketplaceSku = safeText(item.marketplaceSku || item.marketplace_sku || item.sellerSku || item.sku || item.internalSku || item.marketplaceSkuId || item.marketplaceVariationId);
      if (!marketplaceSku) continue;

      const effectiveFrom = safeText(item.effectiveFrom || item.effective_from || item.berlakuMulai);

      await sql`
        INSERT INTO product_cost_mappings (
          platform, internal_sku, marketplace_sku, marketplace_sku_id, marketplace_variation_id,
          kategori, nama_produk, variasi, harga_modal, harga_jual,
          effective_from, effective_to, status, stok_awal, penjualan, stok_tersedia, updated_at
        ) VALUES (
          ${platform},
          ${safeText(item.internalSku || item.internal_sku || item.sku)},
          ${marketplaceSku},
          ${safeText(item.marketplaceSkuId || item.marketplace_sku_id || item.skuId || item.sku_id)},
          ${safeText(item.marketplaceVariationId || item.marketplace_variation_id || item.variationId || item.variation_id)},
          ${safeText(item.kategori, "-")},
          ${safeText(item.name || item.namaProduk || item.nama_produk, "-")},
          ${safeText(item.variation || item.variationName || item.variasi, "-")},
          ${safeNumber(item.hargaModal || item.harga_modal || item.hpp)},
          ${safeNumber(item.hargaJual || item.harga_jual)},
          ${effectiveFrom},
          ${safeText(item.effectiveTo || item.effective_to || item.berlakuSampai)},
          ${safeText(item.status, "Aktif")},
          ${safeNumber(item.stokAwal || item.stok_awal)},
          ${safeNumber(item.penjualan)},
          ${safeNumber(item.stokTersedia || item.stok_tersedia)},
          NOW()
        )
        ON CONFLICT (platform, marketplace_sku, COALESCE(effective_from, '')) DO UPDATE SET
          internal_sku = EXCLUDED.internal_sku,
          marketplace_sku_id = EXCLUDED.marketplace_sku_id,
          marketplace_variation_id = EXCLUDED.marketplace_variation_id,
          kategori = EXCLUDED.kategori,
          nama_produk = EXCLUDED.nama_produk,
          variasi = EXCLUDED.variasi,
          harga_modal = EXCLUDED.harga_modal,
          harga_jual = EXCLUDED.harga_jual,
          effective_to = EXCLUDED.effective_to,
          status = EXCLUDED.status,
          stok_awal = EXCLUDED.stok_awal,
          penjualan = EXCLUDED.penjualan,
          stok_tersedia = EXCLUDED.stok_tersedia,
          updated_at = NOW();
      `;
    }

    return NextResponse.json({ message: "Master HPP berhasil disimpan" });
  } catch (error: any) {
    console.error("ERROR API POST PRODUCTS:", error?.message || error);
    return NextResponse.json({ error: error?.message || "Gagal simpan Master HPP" }, { status: 500 });
  }
}
