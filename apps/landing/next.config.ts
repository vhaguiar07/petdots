import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The header advertises the framework to anyone scanning; nothing needs it.
  poweredByHeader: false,
};

export default nextConfig;
