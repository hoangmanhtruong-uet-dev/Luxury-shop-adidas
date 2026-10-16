import { AppError } from '@/lib/errors';

export type ManualWalletMutation = 'demo-top-up' | 'admin-balance-adjustment';

export class ManualWalletMutationDisabledError extends AppError {
  constructor(
    public readonly operation: ManualWalletMutation,
    public readonly route: string,
  ) {
    // A 404 keeps development-only money mutation endpoints undiscoverable in production.
    super('Wallet balance mutation is not available.', 404, 'MANUAL_WALLET_MUTATION_DISABLED');
  }
}

/**
 * Manual wallet mutations are a development/demo facility only.
 *
 * CRITICAL (Phase 1.2): the previous implementation short-circuited
 * `operation === 'demo-top-up'` BEFORE the production check, which allowed any
 * authenticated user to mint an unbounded amount of VND into their own wallet on
 * production and then spend it on `paymentMethod: 'Banking' | 'MoMo'`.
 * The production gate must apply to EVERY operation, demo-top-up included.
 */
export function assertManualWalletMutationAllowed(
  operation: ManualWalletMutation,
  route: string,
): void {
  if (process.env.NODE_ENV !== 'production') return;

  // Production requires an explicit, validated opt-in. Absent means disabled.
  if (operation === 'demo-top-up' && process.env.ENABLE_DEMO_WALLET === 'true') return;

  throw new ManualWalletMutationDisabledError(operation, route);
}
