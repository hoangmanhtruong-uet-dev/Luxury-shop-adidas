import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await prisma.siteConfig.findUnique({ where: { id: 'default' } });
    const effectiveConfig = config ?? {
      siteName: 'Cún-shop',
      hotline: '0968 544 769',
      contactEmail: 'support@cun-shop.store',
      address: '\u0056i\u1ec7t Nam',
      codEnabled: true,
      momoEnabled: true,
      bankingEnabled: true,
      vnpayEnabled: false,
      maintenanceMode: false,
    };

    return NextResponse.json({
      siteName: effectiveConfig.siteName,
      hotline: effectiveConfig.hotline,
      contactEmail: effectiveConfig.contactEmail,
      address: effectiveConfig.address,
      codEnabled: effectiveConfig.codEnabled,
      momoEnabled: effectiveConfig.momoEnabled,
      bankingEnabled: effectiveConfig.bankingEnabled,
      vnpayEnabled: effectiveConfig.vnpayEnabled,
      maintenanceMode: effectiveConfig.maintenanceMode,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[SITE_CONFIG]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
