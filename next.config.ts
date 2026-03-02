import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    useCache: true,
    // Optimise barrel-file imports for heavy icon/component libs.
    // Next.js rewrites them to direct deep imports at build time,
    // reducing bundle size and cold-start time.
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "date-fns",
    ],
  },
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
