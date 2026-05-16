import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Pengecekan Aman: Pastikan request memiliki body JSON yang valid
    const bodyText = await request.text();
    if (!bodyText) {
      return NextResponse.json({ error: "Body request kosong" }, { status: 400 });
    }

    const body = JSON.parse(bodyText);
    const apiKey = process.env.NEXT_PUBLIC_RAJAONGKIR_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: "API Key kosong di .env.local" }, { status: 401 });
    }

    if (!body.waybill || !body.courier) {
       return NextResponse.json({ error: "Resi (waybill) atau kurir tidak lengkap" }, { status: 400 });
    }

    const url = `https://api.komerce.id/v1/waybill?waybill=${body.waybill}&courier=${body.courier}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "key": apiKey,
        "Accept": "application/json"
      }
    });

    const rawText = await res.text();

    try {
      const data = JSON.parse(rawText);
      
      // Deteksi error standar dari Komerce
      if (data.meta && data.meta.status !== "success") {
        return NextResponse.json({ 
          error: "Ditolak Komerce: " + data.meta.message 
        }, { status: 400 }); // Gunakan 400 agar frontend bisa menangkap pesannya
      }

      return NextResponse.json(data);
    } catch (e) {
      return NextResponse.json({ 
        error: "Komerce menolak request (Cek Whitelist IP)", 
        detail: rawText.substring(0, 150) 
      }, { status: 400 });
    }
    
  } catch (error: any) {
    return NextResponse.json({ error: "Backend Crash", detail: error.message }, { status: 500 });
  }
}