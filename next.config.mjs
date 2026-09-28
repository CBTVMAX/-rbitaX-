// A Content-Security-Policy é definida por requisição no middleware (src/lib/supabase/middleware.ts),
// com nonce por requisição e, em produção, sem 'unsafe-inline' em script-src. Aqui ficam apenas os
// headers estáticos. (Manter as duas fontes de CSP causaria conflito de política no navegador.)
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self), payment=(), usb=(), serial=(), bluetooth=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Premium sticker files are served by /api/sticker-file after an ownership check, never as static files.
  outputFileTracingIncludes: {
    "/api/sticker-file/[...path]": ["./private-stickers/**/*"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/@:username", destination: "/perfil/:username" },
      // Digital Asset Links: lets the Android app open orbitax.social.br full screen.
      { source: "/.well-known/assetlinks.json", destination: "/api/assetlinks" },
    ];
  },
  // The app never uses next/image. The optimizer stays off and accepts no remote hosts, so /_next/image
  // cannot be used to make the server fetch and decode arbitrary files (SSRF / decoder vulnerabilities).
  images: {
    unoptimized: true,
    remotePatterns: [],
  },
};

export default nextConfig;
