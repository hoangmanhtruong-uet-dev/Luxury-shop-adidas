import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const allowed = new Set(['src/lib/services/order/order-state.service.ts']);
const findings = [];
function walk(dir) {
  // Phase 4.4 (Warning W11): `tests/` does not exist in this repository yet, so
  // the previous `walk(join(root, 'tests'))` threw ENOENT and crashed the audit
  // with a stack trace instead of a verdict — taking the CI step red for a
  // reason unrelated to what the audit actually checks.
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(ts|tsx)$/.test(name)) {
      const rel = relative(root, path).replace(/\\/g, '/');
      if (allowed.has(rel)) continue;
      const source = readFileSync(path, 'utf8');
      const pattern = /(?:prisma|tx)\.order\.(?:update|updateMany)\s*\(\s*\{[\s\S]{0,300}?\bdata\s*:\s*\{[^}]*\bstatus\s*:/g;
      for (const match of source.matchAll(pattern)) findings.push(`${rel}:${source.slice(0, match.index).split('\n').length}`);
    }
  }
}
walk(join(root, 'src'));
walk(join(root, 'tests'));
walk(join(root, 'scripts'));
if (findings.length) {
  console.error(`Forbidden direct Order.status writes:\n${findings.join('\n')}`);
  process.exit(1);
}
console.log('Order state audit: 1 authorized writer, 0 forbidden production writes.');
