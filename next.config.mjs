import { SECURITY_HEADERS } from "./src/shared/security/headers.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-contained server bundle for the container image (Dockerfile).
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      // Photos aren't content-hashed, so cache for a week rather than forever;
      // give a replacement a new file name to roll it out at once.
      {
        source: "/images/photos/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
