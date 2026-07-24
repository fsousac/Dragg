const isDevelopment = process.env.NODE_ENV !== "production";

const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(isDevelopment ? ["'unsafe-eval'"] : []),
  "https://va.vercel-scripts.com",
].join(" ");

function getSupabaseOrigin() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return null;
  }
}

// Self-hosted or local (e.g. `supabase start`) Supabase instances don't live
// under *.supabase.co, so the CSP must also allow the configured project URL.
const supabaseOrigin = getSupabaseOrigin();
const supabaseConnectSrc = ["https://*.supabase.co", supabaseOrigin]
  .filter(Boolean)
  .join(" ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "off",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
          {
            key: "Content-Security-Policy",
            value:
              `default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self' ${supabaseConnectSrc}; connect-src 'self' ${supabaseConnectSrc} https://va.vercel-scripts.com https://vitals.vercel-insights.com; img-src 'self' data: blob: ${supabaseConnectSrc} https://*.googleusercontent.com https://lh3.googleusercontent.com; style-src 'self' 'unsafe-inline'; script-src ${scriptSrc};`,
          },
        ],
      },
    ];
  },

  images: {
    unoptimized: true,
  },
};

export default nextConfig;
