import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

export const dynamic = "force-dynamic"; 

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: Request) {
  try {
    const { resi } = await request.json();
    const upperCaseResi = resi?.toUpperCase();

    if (!upperCaseResi || typeof upperCaseResi !== 'string') {
      return NextResponse.json({ message: 'Nomor resi tidak valid.' }, { status: 400 });
    }

    // 1. Cari data berdasarkan nomor resi
    const rows = await sql`
      SELECT * FROM shopee_orders 
      WHERE tracking_number = ${upperCaseResi}
    `;
    const order = rows[0];

    if (!order) {
      return NextResponse.json({ message: `Resi ${upperCaseResi} tidak ditemukan di sistem!` }, { status: 404 });
    }

    if (order.warehouse_scan_status === 'SCANNED') {
      return NextResponse.json({ message: `PERINGATAN: Resi ${upperCaseResi} sudah di-scan sebelumnya.` }, { status: 409 });
    }

    // 2. Update status scan menjadi SCANNED
    const updatedRows = await sql`
      UPDATE shopee_orders
      SET 
        warehouse_scan_status = 'SCANNED',
        warehouse_scanned_at = NOW()
      WHERE order_id = ${order.order_id}
      RETURNING *
    `;
    const updatedOrder = updatedRows[0];

    return NextResponse.json({
      message: `SUKSES: Order ID ${updatedOrder.order_id} berhasil divalidasi.`,
      data: {
        id: updatedOrder.order_id,
        resi: updatedOrder.tracking_number,
        orderId: updatedOrder.order_id,
        scannedAt: updatedOrder.warehouse_scanned_at,
      },
    }, { status: 200 });

  } catch (error: any) {
    console.error('API Scan Error:', error?.message || error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}