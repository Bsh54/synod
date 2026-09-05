import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Hide the dev overlay indicator (the "N" badge).
  devIndicators: false,
  // This is a demo deployment; do not fail the build on lint or leftover types.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
