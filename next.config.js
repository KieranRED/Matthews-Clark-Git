/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true
  },
  serverExternalPackages: ['mediainfo.js', '@imgly/background-removal-node', 'onnxruntime-node'],
  experimental: {
    outputFileTracingIncludes: {
      '/api/admin/content/quality-check': ['./node_modules/mediainfo.js/dist/*.wasm'],
      '/api/test-mediainfo': ['./node_modules/mediainfo.js/dist/*.wasm'],
      '/api/wrap-remove-bg': ['./node_modules/@imgly/background-removal-node/**/*']
    }
  }
};
export default nextConfig;
