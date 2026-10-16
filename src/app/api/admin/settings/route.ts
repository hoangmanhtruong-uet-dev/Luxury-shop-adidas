import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth/auth';

export const dynamic = 'force-dynamic';

const DEFAULT_CONFIG = {
  id: 'default',
  siteName: 'Cún-shop',
  hotline: '0968 544 769',
  contactEmail: 'support@cun-shop.store',
  address: 'Việt Nam',
  codEnabled: true,
  momoEnabled: true,
  bankingEnabled: true,
  vnpayEnabled: false,
  stripeEnabled: false,
  lowStockThreshold: 10,
  maintenanceMode: false,
  lastBackupAt: null as Date | null,
};

async function getConfig() {
  return (await prisma.siteConfig.findUnique({ where: { id: 'default' } })) ?? DEFAULT_CONFIG;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const config = await getConfig();
    return NextResponse.json(config, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[ADMIN_SETTINGS_GET]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (typeof body.siteName === 'string' && body.siteName.trim()) data.siteName = body.siteName.trim();
    if (typeof body.hotline === 'string') data.hotline = body.hotline.trim();
    if (typeof body.contactEmail === 'string') data.contactEmail = body.contactEmail.trim();
    if (typeof body.address === 'string') data.address = body.address.trim();
    if (typeof body.codEnabled === 'boolean') data.codEnabled = body.codEnabled;
    if (typeof body.momoEnabled === 'boolean') data.momoEnabled = body.momoEnabled;
    if (typeof body.bankingEnabled === 'boolean') data.bankingEnabled = body.bankingEnabled;
    if (typeof body.vnpayEnabled === 'boolean') data.vnpayEnabled = body.vnpayEnabled;
    if (typeof body.stripeEnabled === 'boolean') data.stripeEnabled = body.stripeEnabled;
    if (typeof body.maintenanceMode === 'boolean') data.maintenanceMode = body.maintenanceMode;
    if (typeof body.lowStockThreshold === 'number' && body.lowStockThreshold >= 1) {
      data.lowStockThreshold = Math.floor(body.lowStockThreshold);
    }

    const config = await prisma.siteConfig.upsert({
      where: { id: 'default' },
      create: { ...DEFAULT_CONFIG, ...data },
      update: data,
    });

    return NextResponse.json({
      message: 'Đã lưu cấu hình hệ thống',
      config,
    });
  } catch (error) {
    console.error('[ADMIN_SETTINGS_PUT]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { action } = await req.json();

    if (action === 'backup') {
      const config = await prisma.siteConfig.upsert({
        where: { id: 'default' },
        create: { id: 'default', lastBackupAt: new Date() },
        update: { lastBackupAt: new Date() },
      });
      return NextResponse.json({
        message: 'Đã ghi nhận thời điểm sao lưu (demo). Kết nối backup thật ở production.',
        lastBackupAt: config.lastBackupAt,
      });
    }

    if (action === 'clearCache') {
      return NextResponse.json({ message: 'Đã xóa cache phía server (demo).' });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
