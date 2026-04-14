const MAIN_SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_MAIN_SITE_ORIGIN ||
  process.env.MAIN_SITE_ORIGIN ||
  "https://epocheye.com"
).replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: false,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [320, 420, 768, 1024, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000,
  },
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "motion", "recharts"],
  },
  async rewrites() {
    return [
      {
        source: "/api/creator/:path*",
        destination: `${MAIN_SITE_ORIGIN}/api/creator/:path*`,
      },
    ];
  },
};

export default nextConfig;
