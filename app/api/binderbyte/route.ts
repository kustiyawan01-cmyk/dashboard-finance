import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { waybill, courier } = await request.json();
    
    if (!waybill || !courier) {
      return NextResponse.json({ error: "Resi dan Kurir harus diisi" }, { status: 400 });
    }

    // Mengambil API Key dari .env.local
    const apiKey = process.env.BINDERBYTE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: "API Key Binderbyte belum dikonfigurasi di server." }, { status: 500 });
    }

    // Memanggil API Binderbyte menggunakan parameter dari Postman
    const url = `https://api.binderbyte.com/v1/track?api_key=${apiKey}&courier=${courier}&awb=${waybill}`;
    
    const response = await fetch(url, { method: "GET" });
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Terjadi kesalahan server" }, { status: 500 });
  }
}