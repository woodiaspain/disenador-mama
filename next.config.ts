import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tell Next.js not to bundle react-pdf during build — load from node_modules at runtime
  serverExternalPackages: ["@react-pdf/renderer"],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent @react-pdf/renderer from entering the client bundle
      config.resolve.alias["@react-pdf/renderer"] = false;
    }
    return config;
  },
};

export default nextConfig;
