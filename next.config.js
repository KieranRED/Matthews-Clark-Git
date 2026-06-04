/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true
  },
  serverExternalPackages: ['mediainfo.js'],
  experimental: {
    outputFileTracingIncludes: {
      '/api/admin/content/quality-check': ['./node_modules/mediainfo.js/dist/*.wasm'],
      '/api/test-mediainfo': ['./node_modules/mediainfo.js/dist/*.wasm']
    }
  }
};
export default nextConfig;
