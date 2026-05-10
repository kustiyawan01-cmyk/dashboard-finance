import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const data = await sql`SELECT * FROM office_expenses ORDER BY tanggal DESC`;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Gagal ambil data pengeluaran" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const items = await request.json();

    for (const item of items) {
      await sql`
        INSERT INTO office_expenses (tanggal, kategori, keterangan, jumlah, metode_pembayaran)
        VALUES (${item.tanggal}, ${item.kategori}, ${item.keterangan}, ${item.jumlah}, ${item.metode_pembayaran})
      `;
    }
    return NextResponse.json({ message: "Berhasil simpan pengeluaran" });
  } catch (error) {
    return NextResponse.json({ error: "Gagal simpan data" }, { status: 500 });
  }
}

// FUNGSI BARU: Untuk Edit Data
export async function PUT(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const item = await request.json();

    await sql`
      UPDATE office_expenses 
      SET tanggal = ${item.tanggal}, 
          kategori = ${item.kategori}, 
          keterangan = ${item.keterangan}, 
          jumlah = ${item.jumlah}, 
          metode_pembayaran = ${item.metode_pembayaran}
      WHERE id = ${item.id}
    `;
    return NextResponse.json({ message: "Berhasil update pengeluaran" });
  } catch (error) {
    return NextResponse.json({ error: "Gagal update data" }, { status: 500 });
  }
}

// FUNGSI BARU: Untuk Hapus Data
export async function DELETE(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const { id } = await request.json();

    await sql`DELETE FROM office_expenses WHERE id = ${id}`;
    return NextResponse.json({ message: "Berhasil hapus pengeluaran" });
  } catch (error) {
    return NextResponse.json({ error: "Gagal hapus data" }, { status: 500 });
  }
}