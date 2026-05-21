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