import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "d27a44hjr9gen3.cloudfront.net",
        pathname: "/cards/**",
      },
    ],
  },
};

export default nextConfig;
