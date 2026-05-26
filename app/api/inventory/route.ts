import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";

    if (type === "bahan") {
      const data = await sql`SELECT * FROM "BahanBaku" ORDER BY id ASC`;
      return NextResponse.json(data);
    }
    if (type === "produk") {
      const data = await sql`SELECT * FROM "BarangJadi" ORDER BY id ASC`;
      return NextResponse.json(data);
    }
    if (type === "wo") {
      const data = await sql`
        SELECT w.*, b.nama_produk, b.kode_sku
        FROM "WorkOrder" w
        LEFT JOIN "BarangJadi" b ON w.barang_jadi_id = b.id
        ORDER BY w."createdAt" DESC
      `;
      return NextResponse.json(data);
    }

    const bahan = await sql`SELECT * FROM "BahanBaku" ORDER BY id ASC`;
    const produk = await sql`SELECT * FROM "BarangJadi" ORDER BY id ASC`;
    const wo = await sql`
      SELECT w.*, b.nama_produk, b.kode_sku
      FROM "WorkOrder" w
      LEFT JOIN "BarangJadi" b ON w.barang_jadi_id = b.id
      ORDER BY w."createdAt" DESC
    `;
    return NextResponse.json({ bahan, produk, wo });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // A. MASTER DATA: TAMBAH JENIS BAHAN BAKU BARU
    if (action === "ADD_BAHAN") {
      const { nama_bahan, kategori, stok_awal } = body;
      if (!nama_bahan || !kategori) {
        return NextResponse.json({ error: "Nama bahan dan kategori wajib diisi" }, { status: 400 });
      }

      await sql`
        INSERT INTO "BahanBaku" (nama_bahan, kategori, stok_meter)
        VALUES (${nama_bahan}, ${kategori}, ${Number(stok_awal || 0)})
      `;
      return NextResponse.json({ success: true, message: "Material bahan baru berhasil didaftarkan!" });
    }

    // B. MASTER DATA: TAMBAH PRODUK JADI BARU + RESEP (BOM)
    if (action === "ADD_PRODUK") {
      const { nama_produk, kode_sku, resep } = body; // resep berisi array: [{ bahan_baku_id, jumlah_butuh_meter }]
      if (!nama_produk || !kode_sku) {
        return NextResponse.json({ error: "Nama produk dan Kode SKU wajib diisi" }, { status: 400 });
      }

      // 1. Simpan produk baru ke BarangJadi
      const result = await sql`
        INSERT INTO "BarangJadi" (nama_produk, kode_sku, stok_pcs)
        VALUES (${nama_produk}, ${kode_sku.toUpperCase()}, 0)
        RETURNING id
      `;
      const newProductId = result[0].id;

      // 2. Simpan resep pemotongan kain ke BillOfMaterials (BOM) jika diisi
      if (resep && Array.isArray(resep)) {
        for (const item of resep) {
          if (item.bahan_baku_id && item.jumlah_butuh_meter) {
            await sql`
              INSERT INTO "BillOfMaterials" (barang_jadi_id, bahan_baku_id, jumlah_butuh_meter)
              VALUES (${newProductId}, ${Number(item.bahan_baku_id)}, ${臨Number(item.jumlah_butuh_meter)})
            `;
          }
        }
      }

      return NextResponse.json({ success: true, message: "Produk baru & Resep Potongan (BOM) sukses disimpan!" });
    }

    // 1. MEMBUAT SURAT PERINTAH KERJA (WORK ORDER) BARU
    if (action === "CREATE_WO") {
      const { nomor_wo, barang_jadi_id, jumlah_produksi } = body;

      if (!nomor_wo || !barang_jadi_id || !jumlah_produksi) {
        return NextResponse.json({ error: "Data WO tidak lengkap" }, { status: 400 });
      }

      const bomItems = await sql`
        SELECT * FROM "BillOfMaterials" 
        WHERE barang_jadi_id = ${barang_jadi_id}
      `;

      if (bomItems.length === 0) {
        return NextResponse.json({ error: "Resep BOM untuk produk ini belum diatur! Isi resep terlebih dahulu." }, { status: 400 });
      }

      for (const item of bomItems) {
        const butuhTotal = Number(item.jumlah_butuh_meter) * Number(jumlah_produksi);
        const rows = await sql`SELECT stok_meter FROM "BahanBaku" WHERE id = ${item.bahan_baku_id}`;
        const stokSekarang = rows[0]?.stok_meter || 0;

        if (Number(stokSekarang) < butuhTotal) {
          const bahanRow = await sql`SELECT nama_bahan FROM "BahanBaku" WHERE id = ${item.bahan_baku_id}`;
          return NextResponse.json({ 
            error: `Stok tidak cukup untuk bahan: ${bahanRow[0]?.nama_bahan}. Butuh ${butuhTotal}m, sisa ${stokSekarang}m.` 
          }, { status: 400 });
        }
      }

      for (const item of bomItems) {
        const butuhTotal = Number(item.jumlah_butuh_meter) * Number(jumlah_produksi);
        await sql`
          UPDATE "BahanBaku" 
          SET stok_meter = stok_meter - ${butuhTotal} 
          WHERE id = ${item.bahan_baku_id}
        `;
      }

      await sql`
        INSERT INTO "WorkOrder" (nomor_wo, barang_jadi_id, jumlah_produksi, status)
        VALUES (${nomor_wo}, ${barang_jadi_id}, ${jumlah_produksi}, 'PROSES')
      `;

      return NextResponse.json({ success: true, message: "Work Order berhasil dibuat & stok bahan baku otomatis terpotong!" });
    }

    // 2. MENYELESAIKAN WORK ORDER (PRODUKSI SELESAI)
    if (action === "COMPLETE_WO") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "ID Work Order diperlukan" }, { status: 400 });

      const woRows = await sql`SELECT * FROM "WorkOrder" WHERE id = ${id}`;
      const wo = woRows[0];

      if (!wo) return NextResponse.json({ error: "Work Order tidak ditemukan" }, { status: 404 });
      if (wo.status === "SELESAI") return NextResponse.json({ error: "Work Order sudah berstatus SELESAI" }, { status: 400 });

      await sql`UPDATE "WorkOrder" SET status = 'SELESAI' WHERE id = ${id}`;
      await sql`
        UPDATE "BarangJadi" 
        SET stok_pcs = stok_pcs + ${wo.jumlah_produksi} 
        WHERE id = ${wo.barang_jadi_id}
      `;

      return NextResponse.json({ success: true, message: "Status WO diperbarui ke SELESAI & stok barang jadi bertambah!" });
    }

    // 3. BARANG MASUK (INBOUND BAHAN BAKU DARI SUPPLIER)
    if (action === "INBOUND") {
      const { bahan_baku_id, jumlah_meter } = body;
      if (!bahan_baku_id || !jumlah_meter) return NextResponse.json({ error: "Data inbound tidak lengkap" }, { status: 400 });

      await sql`
        UPDATE "BahanBaku" 
        SET stok_meter = stok_meter + ${jumlah_meter} 
        WHERE id = ${bahan_baku_id}
      `;
      return NextResponse.json({ success: true, message: "Stok bahan baku baru berhasil ditambahkan!" });
    }

    // 4. STOCK OPNAME (PENYESUAIAN MANUAL KARENA LIMBAH PERCA)
    if (action === "OPNAME") {
      const { bahan_baku_id, stok_fisik_meter } = body;
      if (!bahan_baku_id || stok_fisik_meter === undefined) return NextResponse.json({ error: "Data opname tidak lengkap" }, { status: 400 });

      await sql`
        UPDATE "BahanBaku" 
        SET stok_meter = ${stok_fisik_meter} 
        WHERE id = ${bahan_baku_id}
      `;
      return NextResponse.json({ success: true, message: "Stock Opname berhasil diselaraskan dengan fisik gudang!" });
    }

    return NextResponse.json({ error: "Aksi backend tidak dikenali" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}