const isDev = process.env.NODE_ENV !== "production";

// Where the browser may load things from. Supabase (API, realtime, storage) and the map tiles /
// address lookup used by "Localização" in the chat; everything else is Órbita X itself.
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://tile.openstreetmap.org https://lh3.googleusercontent.com",
  "media-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://nominatim.openstreetmap.org${isDev ? " ws: http://localhost:*" : ""}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
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
