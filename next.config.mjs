/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // Performance optimizations
  output: 'standalone',
  
  // Enable SWC minification
  swcMinify: true,
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'three', '@react-three/fiber', '@react-three/drei'],
    turbotrace: {
      logLevel: 'error',
    },
  },
  
  // Webpack optimizations
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          // Three.js and WebGL libraries
          three: {
            name: 'three',
            test: /[\\/]node_modules[\\/](three|@react-three|ogl)[\\/]/,
            chunks: 'all',
            priority: 30,
          },
          // Animation libraries
          animations: {
            name: 'animations',
            test: /[\\/]node_modules[\\/](gsap|framer-motion)[\\/]/,
            chunks: 'all',
            priority: 25,
          },
          // Commons chunk
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 10,
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;
