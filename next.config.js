/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true
  },
  serverExternalPackages: ['mediainfo.js', '@imgly/background-removal-node', 'onnxruntime-node'],
  // Explicitly include large binary assets only for the routes that need them
  outputFileTracingIncludes: {
    '/api/admin/content/quality-check': ['./node_modules/mediainfo.js/dist/*.wasm'],
    '/api/test-mediainfo': ['./node_modules/mediainfo.js/dist/*.wasm'],
    '/api/wrap-remove-bg': ['./node_modules/@imgly/background-removal-node/**/*']
  },
  // Exclude heavy packages from all other routes so they don't blow the 250MB limit
  outputFileTracingExcludes: {
    '*': [
      './node_modules/mediainfo.js/dist/**',
      './node_modules/@imgly/background-removal-node/**',
      './node_modules/onnxruntime-node/**',
      './node_modules/sharp/**',
      './node_modules/canvas/**',
    ]
  }
};
export default nextConfig;
