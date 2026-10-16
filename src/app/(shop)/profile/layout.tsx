import { Metadata } from 'next';
import ProfileLayoutClient from './ProfileLayoutClient';

export const metadata: Metadata = {
  title: 'Hồ sơ cá nhân',
  description: 'Quản lý thông tin cá nhân, địa chỉ, ngân hàng và lịch sử đơn hàng tại Cún-shop.',
  // Phase 4.2: the root layout sets `robots: { index: true }`, which was
  // inherited by every private area. Account pages must never be indexed.
  robots: { index: false, follow: false, nocache: true },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <ProfileLayoutClient>{children}</ProfileLayoutClient>;
}
