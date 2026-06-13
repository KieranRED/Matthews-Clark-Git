/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true
  },
  serverExternalPackages: ['mediainfo.js', '@imgly/background-removal-node', 'onnxruntime-node'],
  outputFileTracingIncludes: {
    '/api/admin/content/quality-check': ['./node_modules/mediainfo.js/dist/*.wasm'],
    '/api/test-mediainfo': ['./node_modules/mediainfo.js/dist/*.wasm'],
  },
  async rewrites() {
    return [
      // Let the bare /wrap-studio path resolve to the static studio page
      // (the studio is a static bundle in public/wrap-studio/, which Next.js
      // does not auto-resolve to its index.html).
      { source: '/wrap-studio', destination: '/wrap-studio/index.html' },
      { source: '/wrap-studio/', destination: '/wrap-studio/index.html' },
    ];
  }
};
export default nextConfig;
