import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { resi } = await request.json();
    const upperCaseResi = resi?.toUpperCase();

    if (!upperCaseResi || typeof upperCaseResi !== 'string') {
      return NextResponse.json({ message: 'Nomor resi tidak valid.' }, { status: 400 });
    }

    const order = await prisma.shopeeOrder.findUnique({
      where: {
        trackingNumber: upperCaseResi,
      },
    });

    if (!order) {
      return NextResponse.json({ message: `Resi ${upperCaseResi} tidak ditemukan di sistem!` }, { status: 404 });
    }

    if (order.warehouseScanStatus === 'SCANNED') {
      return NextResponse.json({ message: `PERINGATAN: Resi ${upperCaseResi} sudah di-scan sebelumnya.` }, { status: 409 });
    }

    const updatedOrder = await prisma.shopeeOrder.update({
      where: {
        id: order.id,
      },
      data: {
        warehouseScanStatus: 'SCANNED',
        warehouseScannedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: `SUKSES: Order ID ${updatedOrder.order_id} berhasil divalidasi.`,
      data: {
        id: updatedOrder.id,
        resi: updatedOrder.trackingNumber,
        orderId: updatedOrder.order_id,
        scannedAt: updatedOrder.warehouseScannedAt,
      },
    }, { status: 200 });

  } catch (error) {
    console.error('API Scan Error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}