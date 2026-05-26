import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const data = await sql`SELECT * FROM "Manifest" ORDER BY "scannedAt" DESC LIMIT 100`;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data } = body;

    if (!Array.isArray(data)) return NextResponse.json({ error: "Format salah" }, { status: 400 });

    for (const item of data) {
      const scannedAt = item.scannedAt ? new Date(item.scannedAt).toISOString() : new Date().toISOString();
      await sql`
        INSERT INTO "Manifest" ("resi", "orderId", "expedition", "tujuan", "operator", "status", "scannedAt")
        VALUES (${item.resi}, ${item.orderId}, ${item.expedition}, ${item.tujuan}, ${item.operator}, ${item.status || 'HANDOVER KURIR'}, ${scannedAt})
        ON CONFLICT ("resi") DO NOTHING
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { resi, status } = await request.json();

    if (!resi || !status) {
      return NextResponse.json({ error: "Resi dan status diperlukan" }, { status: 400 });
    }

    // UPDATE status di database Neon dengan nama tabel dan kolom yang TEPAT
    // Perhatikan penggunaan tanda kutip ganda ("") karena PostgreSQL sensitif terhadap huruf kapital pada nama tabel
    await sql`
      UPDATE "Manifest" 
      SET "status" = ${status} 
      WHERE "resi" = ${resi}
    `;

    return NextResponse.json({ success: true, message: "Status berhasil diupdate permanen" });
  } catch (error: any) {
    console.error("Gagal update status database:", error);
    return NextResponse.json({ error: "Terjadi kesalahan di server" }, { status: 500 });
  }
}