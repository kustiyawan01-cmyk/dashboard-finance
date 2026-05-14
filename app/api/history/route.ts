import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const result = await sql`SELECT * FROM history_kalkulator ORDER BY created_at DESC LIMIT 50;`;
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { platform, namaProduk, totalHPP, hargaJualAmanEtalase, targetProfit } = body;
    const sql = neon(process.env.DATABASE_URL!);
    const result = await sql`
      INSERT INTO history_kalkulator (platform, nama_produk, total_hpp, harga_jual_etalase, target_profit_persen)
      VALUES (${platform}, ${namaProduk}, ${totalHPP}, ${hargaJualAmanEtalase}, ${targetProfit})
      RETURNING *;
    `;
    return NextResponse.json({ success: true, data: result[0] });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false }, { status: 400 });
    
    const sql = neon(process.env.DATABASE_URL!);
    await sql`DELETE FROM history_kalkulator WHERE id = ${id}`;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}