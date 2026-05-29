import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL!);

const text = (value: unknown, fallback = "") => String(value ?? fallback).trim();
const num = (value: unknown) => Number(value) || 0;
const arr = (value: unknown) => Array.isArray(value) ? value : [];

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS tiktok_finances (
      order_id VARCHAR(120) PRIMARY KEY,
      created_date VARCHAR(80),
      settled_date VARCHAR(80),
      qty NUMERIC DEFAULT 0,
      subtotal NUMERIC DEFAULT 0,
      shipping_buyer NUMERIC DEFAULT 0,
      shipping_subsidy NUMERIC DEFAULT 0,
      adjustment_amount NUMERIC DEFAULT 0,
      seller_discount NUMERIC DEFAULT 0,
      platform_fee NUMERIC DEFAULT 0,
      payment_fee NUMERIC DEFAULT 0,
      affiliate_fee NUMERIC DEFAULT 0,
      free_shipping_fee NUMERIC DEFAULT 0,
      tax NUMERIC DEFAULT 0,
      cod_fee NUMERIC DEFAULT 0,
      total_fees NUMERIC DEFAULT 0,
      net_settlement NUMERIC DEFAULT 0,
      total_revenue NUMERIC DEFAULT 0,
      order_status VARCHAR(80) DEFAULT 'Selesai',
      sku VARCHAR(180),
      product_name TEXT,
      hpp_per_item NUMERIC DEFAULT 0,
      total_hpp NUMERIC DEFAULT 0,
      laba_bersih NUMERIC DEFAULT 0,
      hpp_status VARCHAR(80) DEFAULT 'Valid',
      hpp_missing_skus JSONB DEFAULT '[]'::jsonb,
      hpp_rule TEXT,
      order_items JSONB DEFAULT '[]'::jsonb,
      detail_data JSONB DEFAULT '{}'::jsonb,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  await sql`
    ALTER TABLE tiktok_finances
    ADD COLUMN IF NOT EXISTS sku VARCHAR(180),
    ADD COLUMN IF NOT EXISTS product_name TEXT,
    ADD COLUMN IF NOT EXISTS hpp_status VARCHAR(80) DEFAULT 'Valid',
    ADD COLUMN IF NOT EXISTS hpp_missing_skus JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS hpp_rule TEXT,
    ADD COLUMN IF NOT EXISTS order_items JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS detail_data JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  `;
}

export async function GET() {
  try {
    await ensureTable();
    const data = await sql`SELECT * FROM tiktok_finances ORDER BY settled_date DESC`;

    return NextResponse.json(data.map((item) => ({
      platform: "TikTok",
      orderId: item.order_id,
      createdDate: item.created_date || "-",
      date: item.settled_date || "-",
      qty: Number(item.qty) || 0,
      subtotal: Number(item.subtotal) || 0,
      shippingBuyer: Number(item.shipping_buyer) || 0,
      shippingSubsidy: Number(item.shipping_subsidy) || 0,
      adjustment: Number(item.adjustment_amount) || 0,
      sellerDiscount: Number(item.seller_discount) || 0,
      platformFee: Number(item.platform_fee) || 0,
      paymentFee: Number(item.payment_fee) || 0,
      affiliateFee: Number(item.affiliate_fee) || 0,
      freeShippingFee: Number(item.free_shipping_fee) || 0,
      tax: Number(item.tax) || 0,
      codFee: Number(item.cod_fee) || 0,
      fees: Number(item.total_fees) || 0,
      net: Number(item.net_settlement) || 0,
      revenue: Number(item.total_revenue) || 0,
      orderStatus: item.order_status || "Selesai",
      sku: item.sku || "-",
      productName: item.product_name || "-",
      hppPerItem: Number(item.hpp_per_item) || 0,
      totalHpp: Number(item.total_hpp) || 0,
      labaBersih: Number(item.laba_bersih) || 0,
      hppStatus: item.hpp_status || "Valid",
      hppMissingSkus: Array.isArray(item.hpp_missing_skus) ? item.hpp_missing_skus : [],
      hppRule: item.hpp_rule || "",
      orderItems: Array.isArray(item.order_items) ? item.order_items : [],
      ...(item.detail_data && typeof item.detail_data === "object" && !Array.isArray(item.detail_data) ? item.detail_data : {}),
      isFinalProfit: (item.hpp_status || "Valid") !== "Belum Mapping",
    })));
  } catch (error: any) {
    console.error("GET finance-tiktok error:", error?.message || error);
    return NextResponse.json({ error: "Gagal ambil data finance TikTok", detail: error?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureTable();
    const body = await request.json();
    const finances = Array.isArray(body) ? body : body.finances;
    if (!Array.isArray(finances)) return NextResponse.json({ error: "Format finance TikTok tidak valid" }, { status: 400 });

    for (const item of finances) {
      if (!item.orderId) continue;
      const missingSkusJson = JSON.stringify(arr(item.hppMissingSkus));
      const orderItemsJson = JSON.stringify(arr(item.orderItems));
      const detailDataJson = JSON.stringify({
        tiktokSubtotalAfterDiscount: num(item.tiktokSubtotalAfterDiscount),
        tiktokSubtotalBeforeDiscount: num(item.tiktokSubtotalBeforeDiscount),
        tiktokSellerDiscount: num(item.tiktokSellerDiscount),
        tiktokBuyerPayment: num(item.tiktokBuyerPayment),
        tiktokRefundBuyer: num(item.tiktokRefundBuyer),
        tiktokTotalFee: num(item.tiktokTotalFee),
        tiktokPlatformCommission: num(item.tiktokPlatformCommission),
        tiktokPaymentFee: num(item.tiktokPaymentFee),
        tiktokAffiliateCommission: num(item.tiktokAffiliateCommission),
        tiktokPartnerAffiliateCommission: num(item.tiktokPartnerAffiliateCommission),
        tiktokShopAdsAffiliateCommission: num(item.tiktokShopAdsAffiliateCommission),
        tiktokAffiliateDeposit: num(item.tiktokAffiliateDeposit),
        tiktokAffiliateRefund: num(item.tiktokAffiliateRefund),
        tiktokShippingFee: num(item.tiktokShippingFee),
        tiktokLogisticsAdvance: num(item.tiktokLogisticsAdvance),
        tiktokBuyerShippingFee: num(item.tiktokBuyerShippingFee),
        tiktokPlatformShippingFee: num(item.tiktokPlatformShippingFee),
        tiktokShippingSubsidy: num(item.tiktokShippingSubsidy),
        tiktokLogisticsFee: num(item.tiktokLogisticsFee),
        tiktokFreeShippingProgramFee: num(item.tiktokFreeShippingProgramFee),
        tiktokDynamicCommission: num(item.tiktokDynamicCommission),
        tiktokCashbackBonusFee: num(item.tiktokCashbackBonusFee),
        tiktokLiveServiceFee: num(item.tiktokLiveServiceFee),
        tiktokVoucherXtraFee: num(item.tiktokVoucherXtraFee),
        tiktokOrderProcessingFee: num(item.tiktokOrderProcessingFee),
        tiktokEamsFee: num(item.tiktokEamsFee),
        tiktokTaxPph22: num(item.tiktokTaxPph22),
        tiktokCodFee: num(item.tiktokCodFee),
        tiktokGmvMaxAdsFee: num(item.tiktokGmvMaxAdsFee),
        tiktokGmvMaxVoucher: num(item.tiktokGmvMaxVoucher),
        tiktokGmvMaxVoucherTax: num(item.tiktokGmvMaxVoucherTax)
      });

      await sql`
        INSERT INTO tiktok_finances (
          order_id, created_date, settled_date, qty, subtotal,
          shipping_buyer, shipping_subsidy, adjustment_amount, seller_discount,
          platform_fee, payment_fee, affiliate_fee, free_shipping_fee, tax, cod_fee,
          total_fees, net_settlement, total_revenue, order_status, sku, product_name,
          hpp_per_item, total_hpp, laba_bersih, hpp_status, hpp_missing_skus, hpp_rule, order_items, detail_data, updated_at
        ) VALUES (
          ${text(item.orderId)}, ${text(item.createdDate, "-")}, ${text(item.date, "-")}, ${num(item.qty)}, ${num(item.subtotal)},
          ${num(item.shippingBuyer)}, ${num(item.shippingSubsidy)}, ${num(item.adjustment)}, ${num(item.sellerDiscount)},
          ${num(item.platformFee)}, ${num(item.paymentFee)}, ${num(item.affiliateFee)}, ${num(item.freeShippingFee)}, ${num(item.tax)}, ${num(item.codFee)},
          ${num(item.fees)}, ${num(item.net)}, ${num(item.revenue)}, ${text(item.orderStatus, "Selesai")}, ${text(item.sku, "-")}, ${text(item.productName, "-")},
          ${num(item.hppPerItem)}, ${num(item.totalHpp)}, ${num(item.labaBersih)}, ${text(item.hppStatus, "Valid")}, ${missingSkusJson}::jsonb, ${text(item.hppRule)}, ${orderItemsJson}::jsonb, ${detailDataJson}::jsonb, NOW()
        )
        ON CONFLICT (order_id) DO UPDATE SET
          created_date = EXCLUDED.created_date,
          settled_date = EXCLUDED.settled_date,
          qty = EXCLUDED.qty,
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
          total_revenue = EXCLUDED.total_revenue,
          order_status = EXCLUDED.order_status,
          sku = EXCLUDED.sku,
          product_name = EXCLUDED.product_name,
          hpp_per_item = EXCLUDED.hpp_per_item,
          total_hpp = EXCLUDED.total_hpp,
          laba_bersih = EXCLUDED.laba_bersih,
          hpp_status = EXCLUDED.hpp_status,
          hpp_missing_skus = EXCLUDED.hpp_missing_skus,
          hpp_rule = EXCLUDED.hpp_rule,
          order_items = EXCLUDED.order_items,
          detail_data = EXCLUDED.detail_data,
          updated_at = NOW();
      `;
    }

    return NextResponse.json({ message: "Finance TikTok berhasil disimpan" });
  } catch (error: any) {
    console.error("POST finance-tiktok error:", error?.message || error);
    return NextResponse.json({ error: "Gagal simpan finance TikTok", detail: error?.message }, { status: 500 });
  }
}
