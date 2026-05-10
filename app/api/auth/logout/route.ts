import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  // Hapus cookie sesi saat logout
  response.cookies.delete('auth_session');
  return response;
}