/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mengizinkan IP lokalmu agar auto-refresh berfungsi kembali
  serverExternalPackages: [],
  experimental: {
    allowedDevOrigins: ['192.168.1.28', 'localhost'],
  },
};

export default nextConfig;