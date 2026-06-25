import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fija la raíz del proyecto (hay otros lockfiles en el home del usuario).
  turbopack: { root: __dirname },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
