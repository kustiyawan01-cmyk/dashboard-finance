import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    const sql = neon(process.env.DATABASE_URL!);
    const users = await sql`SELECT * FROM admin_users WHERE username = ${username} AND password = ${password}`;

    if (users.length > 0) {
      const response = NextResponse.json({ success: true, message: "Login berhasil" });
      
      // Pasang cookie kunci sesi yang tahan 1 hari
      response.cookies.set({
        name: 'auth_session',
        value: 'verified_admin_' + username,
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24 
      });

      return response;
    } else {
      return NextResponse.json({ success: false, error: "Username atau password salah!" }, { status: 401 });
    }
  } catch (error: any) {
    console.error("Detail Error Login:", error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan server", detail: error.message }, { status: 500 });
  }
}