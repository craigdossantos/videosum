import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Required for Electron packaging
  images: {
    unoptimized: true, // Required for static export in Electron
  },
};

export default nextConfig;
