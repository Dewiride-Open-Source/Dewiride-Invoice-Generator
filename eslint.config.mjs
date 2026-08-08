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
  // Keep the PDF engine out of the first-paint bundle.
  //
  // @react-pdf/renderer costs ~1.5 MB of JavaScript (yoga-layout, pdfkit,
  // fontkit, png-js). It reaches the browser only via
  // `await import('./InvoicePdfRenderer')` inside an event handler. A static
  // import anywhere else silently puts all of it back on the critical path,
  // which is exactly the regression this codebase already shipped once.
  //
  // InvoicePDF.tsx and InvoicePdfRenderer.tsx are the two allowed importers;
  // both sit behind that dynamic boundary.
  // ---------------------------------------------------------------------
  {
    name: 'project/keep-pdf-engine-lazy',
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/components/InvoicePDF.tsx', 'src/components/InvoicePdfRenderer.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@react-pdf/renderer',
              message:
                'Importing this statically adds ~1.5 MB to first paint. Use `await import("./InvoicePdfRenderer")` inside an event handler instead.',
            },
          ],
          patterns: [
            {
              group: ['**/InvoicePdfRenderer', '**/InvoicePDF'],
              message:
                'InvoicePdfRenderer is the lazy boundary around the PDF engine. Reach it with `await import(...)`, never a static import.',
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
