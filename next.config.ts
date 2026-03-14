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
      "@radix-ui/react-accordion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-label",
      "@radix-ui/react-popover",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slot",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
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
