import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const data = await sql`SELECT * FROM shopee_finances ORDER BY settled_date DESC`;
    
    return NextResponse.json(data.map(item => ({
      orderId: item.order_id,
      createdDate: item.created_date,
      date: item.settled_date,
      originalPrice: Number(item.original_price) || 0,
      sellerDiscount: Number(item.seller_discount) || 0,
      shippingBuyer: Number(item.shipping_buyer) || 0,
      shopeeSubsidy: Number(item.shopee_shipping_subsidy) || 0,
      voucherShopee: Number(item.voucher_shopee) || 0,
      cashbackShopee: Number(item.cashback_shopee) || 0,
      penyesuaianSaldo: Number(item.penyesuaian_saldo) || 0,
      codBuyer: Number(item.cod_buyer) || 0,
      kompensasi: Number(item.kompensasi) || 0,
      adminFee: Number(item.admin_fee) || 0,
      serviceFee: Number(item.service_fee) || 0,
      freeOngkirXtra: Number(item.free_ongkir_xtra) || 0,
      cashbackXtra: Number(item.cashback_xtra) || 0,
      ams: Number(item.ams_fee) || 0,
      affiliate: Number(item.affiliate_commission) || 0,
      pajak: Number(item.pajak) || 0,
      biayaCod: Number(item.biaya_cod) || 0,
      voucherSeller: Number(item.voucher_seller) || 0,
      cashbackSeller: Number(item.cashback_seller) || 0,
      shopeeAds: Number(item.shopee_ads) || 0,
      penalti: Number(item.penalti) || 0,
      refund: Number(item.refund_pembeli) || 0,
      retur: Number(item.retur_barang) || 0,
      transferBank: Number(item.transfer_bank_fee) || 0,
      materai: Number(item.materai_fee) || 0,
      penyesuaianSistem: Number(item.penyesuaian_sistem) || 0,
      shippingLogistics: Number(item.shipping_logistics) || 0,
      net: Number(item.net_settlement) || 0
    })));
  } catch (error) { return NextResponse.json({ error: "Gagal ambil data" }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const finances = await request.json();

    for (const item of finances) {
      await sql`
        INSERT INTO shopee_finances (
          order_id, created_date, settled_date, original_price, seller_discount, shipping_buyer, shopee_shipping_subsidy, 
          voucher_shopee, cashback_shopee, penyesuaian_saldo, cod_buyer, kompensasi, admin_fee, service_fee, 
          free_ongkir_xtra, cashback_xtra, ams_fee, affiliate_commission, pajak, biaya_cod, voucher_seller, 
          cashback_seller, shopee_ads, penalti, refund_pembeli, retur_barang, transfer_bank_fee, materai_fee, 
          penyesuaian_sistem, shipping_logistics, net_settlement
        ) VALUES (
          ${item.orderId}, ${item.createdDate}, ${item.date}, ${item.originalPrice}, ${item.sellerDiscount}, ${item.shippingBuyer}, ${item.shopeeSubsidy},
          ${item.voucherShopee}, ${item.cashbackShopee}, ${item.penyesuaianSaldo}, ${item.codBuyer}, ${item.kompensasi}, ${item.adminFee}, ${item.serviceFee},
          ${item.freeOngkirXtra}, ${item.cashbackXtra}, ${item.ams}, ${item.affiliate}, ${item.pajak}, ${item.biayaCod}, ${item.voucherSeller},
          ${item.cashbackSeller}, ${item.shopeeAds}, ${item.penalti}, ${item.refund}, ${item.retur}, ${item.transferBank}, ${item.materai},
          ${item.penyesuaianSistem}, ${item.shippingLogistics}, ${item.net}
        )
        ON CONFLICT (order_id) DO UPDATE SET net_settlement = EXCLUDED.net_settlement;
      `;
    }
    return NextResponse.json({ message: "Data Detail Shopee Berhasil Disimpan!" });
  } catch (error) { return NextResponse.json({ error: "Gagal simpan data" }, { status: 500 }); }
}