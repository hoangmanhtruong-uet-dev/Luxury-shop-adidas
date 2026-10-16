/** @type {import('next').NextConfig} */
const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const cloudinaryRemotePatterns = [
  {
    protocol: 'https',
    hostname: 'res.cloudinary.com',
    port: '',
    pathname: '/**',
  }
];

const nextConfig = {
  // Standard Next.js server configuration for Render
  env: {
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: cloudinaryCloudName || '',
  },
  images: {
    remotePatterns: cloudinaryRemotePatterns,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Phase 2.1: CSP. `script-src` must allow 'unsafe-inline' because the
          // Next.js App Router inlines bootstrap/runtime scripts, but it still
          // blocks `javascript:` URLs and inline event handlers from injected
          // markup, and `object-src 'none'` / `base-uri 'none'` close the
          // classic script-injection gadget chain.
          { key: 'Content-Security-Policy', value: [
            "default-src 'self'",
            // OP8: analytics pixels. The Phase-2.1 CSP allowed only 'self' +
            // cloudinary for scripts, but `Analytics.tsx` loads GA4, Meta Pixel
            // and TikTok Pixel (all three IDs are declared in env.ts, i.e.
            // expected on production). Without these entries, enabling any pixel
            // silently kills all marketing attribution with zero visible errors.
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://res.cloudinary.com https://www.googletagmanager.com https://connect.facebook.net https://analytics.tiktok.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com",
            "font-src 'self' data: https://fonts.gstatic.com",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.payos.vn https://www.google-analytics.com https://*.analytics.google.com https://graph.facebook.com https://analytics.tiktok.com https://business-api.tiktok.com",
            "frame-src 'self' https://vnpay.vn https://checkout.payos.vn",
            "object-src 'none'",
            "base-uri 'none'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "upgrade-insecure-requests",
          ].join('; ') },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
