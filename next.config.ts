import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // cacheComponents: true,
  // BLOCKED: dynamicParams=false in cards/[id] and sets/[slug] pages is incompatible
  // with cacheComponents (Next.js 16 constraint). Need to remove `dynamicParams`
  // exports from those routes or wait for a Next.js fix before re-enabling PPR.
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
