import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  globalIgnores(['.next/**', 'out/**', 'node_modules/**', 'next-env.d.ts']),

  ...nextVitals,
  ...nextTs,

  // ---------------------------------------------------------------------
  // Accessibility.
  //
  // eslint-config-next registers the jsx-a11y plugin but only enables a
  // handful of its rules, all as warnings. We raise them on the namespace
  // Next already provides rather than re-registering the plugin -- a second
  // plugin instance under the same name is how you get ESLint's "Cannot
  // redefine plugin" error.
  // ---------------------------------------------------------------------
  {
    name: 'project/a11y',
    files: ['src/**/*.{jsx,tsx}'],
    rules: {
      'jsx-a11y/alt-text': ['error', { elements: ['img'], img: ['Image'] }],
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/aria-activedescendant-has-tabindex': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/autocomplete-valid': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/control-has-associated-label': 'error',
      'jsx-a11y/heading-has-content': 'error',
      'jsx-a11y/html-has-lang': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/no-autofocus': ['warn', { ignoreNonDOM: true }],
      'jsx-a11y/no-noninteractive-element-interactions': 'error',
      'jsx-a11y/no-redundant-roles': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
      'jsx-a11y/scope': 'error',
      'jsx-a11y/tabindex-no-positive': 'error',
    },
  },

  // ---------------------------------------------------------------------
  // Keep the heavy, rarely-needed modules out of the first-paint bundle.
  //
  // @react-pdf/renderer costs ~1.5 MB of JavaScript (yoga-layout, pdfkit,
  // fontkit, png-js). uqr, the QR encoder, costs ~27 KB. Neither is worth
  // anything to a visitor who never downloads a PDF or enters a UPI ID, and
  // both reach the browser only through a dynamic import. A static import
  // anywhere else silently puts them back on the critical path, which is
  // exactly the regression this codebase already shipped once.
  //
  // The allowed importers all sit behind that boundary:
  //   InvoicePDF.tsx, InvoicePdfRenderer.tsx  -- inside the PDF chunk
  //   utils/qr.ts                             -- reached via `await import()`
  //
  // The TypeScript variant of the rule is used for allowTypeImports: a
  // `import type { QrPath }` is erased at compile time and carries no bytes,
  // so forbidding it would only push callers into duplicating the interface.
  //
  // ESLint is the fast feedback; scripts/measure-first-paint.mjs is the proof,
  // and greps the chunks the export actually references.
  // ---------------------------------------------------------------------
  {
    name: 'project/keep-heavy-modules-lazy',
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/components/InvoicePDF.tsx',
      'src/components/InvoicePdfRenderer.tsx',
      'src/utils/qr.ts',
    ],
    rules: {
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@react-pdf/renderer',
              message:
                'Importing this statically adds ~1.5 MB to first paint. Use `await import("./InvoicePdfRenderer")` inside an event handler instead.',
              allowTypeImports: true,
            },
            {
              name: 'uqr',
              message:
                'The QR encoder must stay lazy. Import src/utils/qr with `await import(...)`, or use the useQrCode hook.',
              allowTypeImports: true,
            },
          ],
          patterns: [
            {
              group: ['**/InvoicePdfRenderer', '**/InvoicePDF'],
              message:
                'InvoicePdfRenderer is the lazy boundary around the PDF engine. Reach it with `await import(...)`, never a static import.',
              allowTypeImports: true,
            },
            {
              group: ['**/utils/qr'],
              message:
                'utils/qr pulls in the QR encoder. Reach it with `await import(...)`, or use the useQrCode hook.',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },

  {
    name: 'project/tooling',
    files: ['scripts/**/*.mjs'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
]);
