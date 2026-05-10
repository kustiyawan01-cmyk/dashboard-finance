import { NextResponse } from 'next/server';

// MOCK DATABASE (Jika belum pakai database beneran)
// Jika sudah pakai Prisma, ganti bagian ini dengan query prisma
let shopeeOrders: any[] = [];

export async function GET() {
  try {
    // LOGIKA PRISMA:
    // const orders = await prisma.shopeeOrder.findMany({ orderBy: { createdAt: 'desc' } });
    // return NextResponse.json(orders);

    return NextResponse.json(shopeeOrders);
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orders } = body;

    if (!orders || !Array.isArray(orders)) {
      return NextResponse.json({ error: "Format data tidak valid" }, { status: 400 });
    }

    // LOGIKA PRISMA (Upsert agar tidak double berdasarkan Order ID):
    /*
    const savedOrders = await Promise.all(
      orders.map((order) =>
        prisma.shopeeOrder.upsert({
          where: { orderId: order.orderId },
          update: { ...order },
          create: { ...order },
        })
      )
    );
    */

    // MOCK SAVE:
    // Kita gabungkan data lama dan baru, lalu buang duplikat berdasarkan orderId
    const newOrders = [...orders, ...shopeeOrders];
    shopeeOrders = Array.from(new Map(newOrders.map(item => [item.orderId, item])).values());

    return NextResponse.json({ 
      message: "Data Shopee berhasil disimpan", 
      count: orders.length 
    }, { status: 200 });

  } catch (error) {
    console.error("Error API Shopee:", error);
    return NextResponse.json({ error: "Gagal menyimpan data" }, { status: 500 });
  }
}