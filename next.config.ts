import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-fbad7d695b084411b42bdff03adbffd5.r2.dev",
        pathname: "/cards/**",
      },
    ],
  },
};

export default nextConfig;
