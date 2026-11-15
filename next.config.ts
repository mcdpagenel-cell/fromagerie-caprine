import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Librairies CommonJS / natives : on les garde hors du bundle serveur.
  serverExternalPackages: ['exceljs', '@libsql/client', 'libsql'],
  experimental: {
    // Les exports peuvent prendre quelques secondes sur de gros volumes.
    serverActions: { bodySizeLimit: '4mb' },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
