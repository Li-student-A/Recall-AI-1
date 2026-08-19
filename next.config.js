/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.storage.supabase.io' }
    ]
  },
  experimental: {
    optimizePackageImports: ['antd', '@ant-design/icons']
  }
};

module.exports = nextConfig;
