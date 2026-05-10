import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const session = request.cookies.get('auth_session');
  const isLoginPage = request.nextUrl.pathname.startsWith('/login');
  const isApiAuthRoute = request.nextUrl.pathname.startsWith('/api/auth');

  // Jika tidak punya tiket login dan mencoba akses rute selain login/auth, tendang ke /login
  if (!session && !isLoginPage && !isApiAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Jika sudah login tapi mencoba ke halaman login lagi, arahkan ke dashboard
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// Lindungi seluruh folder dan halaman kecuali aset statis/gambar
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};