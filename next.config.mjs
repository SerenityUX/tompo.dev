import { createRequire } from "module";

const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  /** @tonejs/piano imports named exports from `tone`; point at ESM build (not UMD Tone.js). */
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      tone: require.resolve("tone/build/esm/index.js"),
    };
    return config;
  },
};

export default nextConfig;
