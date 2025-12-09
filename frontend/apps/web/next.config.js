/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  experimental: {
    serverComponentsExternalPackages: [
      '@railgun-community/wallet',
      '@railgun-community/engine',
      '@railgun-community/curve25519-scalarmult-wasm',
      'snarkjs',
      'leveldown', 
    ],
  },
  
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      path: false,
      stream: false,
    };
    return config;
  },
};

// 👇 這裡改用 export default
export default nextConfig;