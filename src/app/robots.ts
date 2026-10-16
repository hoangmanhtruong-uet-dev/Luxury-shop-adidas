import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Both the slashed and unslashed forms are listed: Google treats
      // "Disallow: /admin/" as not covering the bare "/admin" request.
      disallow: [
        '/admin', '/admin/',
        '/api/', '/api',
        '/profile', '/profile/',
        '/seller', '/seller/',
        '/shipper', '/shipper/',
        '/checkout', '/checkout/',
        '/cart', '/cart/',
        '/login', '/login/',
        '/register', '/register/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
