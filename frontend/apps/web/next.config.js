/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  serverExternalPackages: [
    '@railgun-community/wallet',
    '@railgun-community/engine',
    '@railgun-community/curve25519-scalarmult-wasm',
    'snarkjs',
    'leveldown', 
  ],
  
  webpack: (config, { webpack }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      path: false,
      stream: false,
      zlib: false,
    };
    
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
        resource.request = resource.request.replace(/^node:/, "");
      })
    );

    return config;
  },
};

// 👇 這裡改用 export default
export default nextConfig;