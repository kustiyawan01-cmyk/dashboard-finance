import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    const data = await sql`
      SELECT
        id,
        sku,
        nama_barang,
        kategori,
        satuan,
        lokasi,
        stok_sistem,
        stok_fisik,
        harga_modal,
        catatan,
        TO_CHAR(tanggal_opname, 'YYYY-MM-DD') AS tanggal_opname,
        created_at,
        updated_at
      FROM stock_opname
      ORDER BY tanggal_opname DESC, id DESC
    `;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Gagal ambil data stock opname" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const body = await request.json();
    const items = Array.isArray(body) ? body : [body];

    for (const item of items) {
      await sql`
        INSERT INTO stock_opname (
          sku,
          nama_barang,
          kategori,
          satuan,
          lokasi,
          stok_sistem,
          stok_fisik,
          harga_modal,
          catatan,
          tanggal_opname
        )
        VALUES (
          ${item.sku || "-"},
          ${item.nama_barang || "-"},
          ${item.kategori || "-"},
          ${item.satuan || "pcs"},
          ${item.lokasi || "Gudang Utama"},
          ${Number(item.stok_sistem || 0)},
          ${Number(item.stok_fisik || 0)},
          ${Number(item.harga_modal || 0)},
          ${item.catatan || "-"},
          ${item.tanggal_opname || new Date().toISOString().split("T")[0]}::date
        )
      `;
    }

    return NextResponse.json({ message: "Berhasil simpan data stock opname" });
  } catch (error) {
    return NextResponse.json({ error: "Gagal simpan data stock opname" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const item = await request.json();

    await sql`
      UPDATE stock_opname
      SET
        sku = ${item.sku || "-"},
        nama_barang = ${item.nama_barang || "-"},
        kategori = ${item.kategori || "-"},
        satuan = ${item.satuan || "pcs"},
        lokasi = ${item.lokasi || "Gudang Utama"},
        stok_sistem = ${Number(item.stok_sistem || 0)},
        stok_fisik = ${Number(item.stok_fisik || 0)},
        harga_modal = ${Number(item.harga_modal || 0)},
        catatan = ${item.catatan || "-"},
        tanggal_opname = ${item.tanggal_opname || new Date().toISOString().split("T")[0]}::date
      WHERE id = ${item.id}
    `;

    return NextResponse.json({ message: "Berhasil update data stock opname" });
  } catch (error) {
    return NextResponse.json({ error: "Gagal update data stock opname" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const { id } = await request.json();

    await sql`DELETE FROM stock_opname WHERE id = ${id}`;

    return NextResponse.json({ message: "Berhasil hapus data stock opname" });
  } catch (error) {
    return NextResponse.json({ error: "Gagal hapus data stock opname" }, { status: 500 });
  }
}