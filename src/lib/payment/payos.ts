import { PayOS } from '@payos/node';

// Fail loudly instead of falling back to placeholder credentials. The previous
// `|| 'checksum-key'` default meant an unset PAYOS_CHECKSUM_KEY made webhook
// signature verification run against a publicly-known constant, opening a
// payment-forgery bypass. Absent configuration must stop the process instead.
function required(name: 'PAYOS_CLIENT_ID' | 'PAYOS_API_KEY' | 'PAYOS_CHECKSUM_KEY'): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is not configured. Set it in the deployment environment before accepting PayOS traffic.`,
    );
  }
  return value;
}

// Initialise PayOS client (v2 SDK).
// `timeout`/`maxRetries` are explicitly bounded so a slow provider can never hold
// a request (or a database transaction) open for the SDK default of 60s x 3.
const payOS = new PayOS({
  clientId: required('PAYOS_CLIENT_ID'),
  apiKey: required('PAYOS_API_KEY'),
  checksumKey: required('PAYOS_CHECKSUM_KEY'),
  timeout: 8_000,
  maxRetries: 1,
});

export default payOS;

