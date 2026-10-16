import { cookies } from 'next/headers';
import { AuthorizationError } from '@/lib/errors';
import { AuthService } from '@/lib/services/auth/auth.service';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  isSeller: boolean;
  name: string;
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  return AuthService.verifyAccessToken(token);
}

export function canAccessSeller(session: JWTPayload | null): session is JWTPayload {
  return !!session && (session.isSeller || session.role === 'admin');
}

/**
 * Guards the shipper workspace.
 *
 * Phase 2.3: this helper previously OR'd in `role === 'admin'`, which made it an
 * "access" predicate rather than an "is a shipper" predicate — it returned true
 * for administrators who are explicitly NOT allowed on the shipper routes
 * (`shipper/*` handlers test `session.role !== 'shipper'`, which excludes admins).
 * The roles are now aligned: only `shipper` may enter.
 */
export function canAccessShipper(session: JWTPayload | null): session is JWTPayload {
  return !!session && session.role === 'shipper';
}

export async function requireAdmin(): Promise<JWTPayload> {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    throw new AuthorizationError('Admin access required');
  }
  return session;
}