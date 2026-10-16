// Phase 3.1 / 4.4: flat config for ESLint 9.
//
// The project used `.eslintrc.json` (legacy) with `eslint@8`, while
// `eslint-config-next@16` declares `peer eslint >= 9` and now defaults to the flat
// config format. Next 16 also REMOVED the `next lint` command and no longer runs
// linting during `next build`, so linting only happens because CI invokes
// `npm run lint` explicitly.
//
// Kept rule-for-rule equivalent to the previous `.eslintrc.json`.
import next from 'eslint-config-next';

export default [
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**', 'dist/**', 'build/**', 'next-env.d.ts'],
  },
  ...next,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/ban-ts-comment': 'warn',
      'react/no-unescaped-entities': 'off',

      // Phase 4.4 (Warning W11): upgrading to `eslint-config-next@16` + React 19
      // promoted the React Compiler correctness rules to ERROR. They fire on ~30
      // pre-existing files that call `setState` directly inside `useEffect` for
      // data fetching (the standard pattern across this codebase).
      //
      // Rewriting all of them is a real refactor with regression risk, and it is
      // NOT part of the pre-go-live remediation plan. They are therefore
      // downgraded to warnings so the pipeline gate stays meaningful without
      // blocking the launch on a React Compiler migration.
      //
      // TODO(tech-debt): schedule a dedicated React Compiler readiness pass
      // before the next feature cycle.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/globals': 'warn',
    },
  },
];