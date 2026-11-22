/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  
  // Enable modern image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [320, 420, 768, 1024, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year cache
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
    ],
  },

  // Play: the shared card (/play/c/<id>) and its share images are rendered on the server from a
  // pack's site.json. A Vercel function only has the files traced into it, so each pack's
  // site.json is listed here. Only that one small file per pack: never the panoramas.
  outputFileTracingIncludes: {
    '/play/c/**': ['./public/play/packs/*/v*/site.json'],
    // The Play API checks every id a player sends against the pack's story.
    '/api/play/**': ['./public/play/packs/*/v*/site.json'],
    // The level page reads site.json on the server and hands it to the page (no second request).
    '/play/*': ['./public/play/packs/*/v*/site.json'],
  },

  // Performance optimizations
  poweredByHeader: false,
  compress: true,
  
  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['gsap', 'lucide-react', 'framer-motion', 'motion'],
  },

  // Legacy route redirects after creators app split
  async redirects() {
    return [
      {
        source: '/creators',
        destination: 'https://creators.epocheye.com',
        permanent: true,
      },
      {
        source: '/creators/:path*',
        destination: 'https://creators.epocheye.com/:path*',
        permanent: true,
      },
      // Pre-orders are closed: old and shared /preorder links land on the homepage.
      {
        source: '/preorder',
        destination: '/',
        permanent: false,
      },
    ];
  },

  // virtual.epocheye.com serves the /virtual campaign page at its root. Other paths on
  // that host (/privacy, /terms, /refunds, /_next, /api) resolve as on the main site.
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/',
          has: [{ type: 'host', value: 'virtual.epocheye.com' }],
          destination: '/virtual',
        },
      ],
    };
  },

  // Headers for caching and security
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif|mp4|webm)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Play site packs: only the big pictures (panorama faces, masks, tier masks) under a
      // versioned path are cached for good. Everything else under /play/packs (site.json, audio,
      // pieces, evidence and option images, and any path without a version) is republished in
      // place, so it is checked with the server on every load. This rule comes after the
      // site-wide image rule above and before the versioned one below: for the same header the
      // last matching rule wins (brief 5.7: no immutable header on anything unversioned).
      {
        source: '/play/packs/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/play/packs/:slug/:version(v\\d+)/:kind(pano|mask|tier)/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Play open worlds: v<N> is republished in place, so nothing under it may be cached for
      // good, including the minimap images the site-wide image rule above would otherwise match.
      {
        source: '/play/worlds/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/api/creator/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://creators.epocheye.com',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
