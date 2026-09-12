/** @type {import('next').NextConfig} */
const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const normalizedBackend = backendUrl.trim().replace(/\/api\/?$/, '').replace(/\/+$/, '');

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${normalizedBackend}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
