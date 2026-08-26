import type { NextConfig } from 'next';

/**
 * Inlined at build time and read by src/utils/schema.ts for `dateModified`.
 *
 * It has to come from here rather than from a `new Date()` inside the schema
 * module: that module is imported by both _document (evaluated during the
 * build) and index (evaluated again in the browser), so a live clock would
 * produce two different values and mismatch on hydration. SOURCE_DATE_EPOCH,
 * if set, keeps the export reproducible.
 */
const BUILD_DATE = (
  process.env.SOURCE_DATE_EPOCH
    ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000)
    : new Date()
)
  .toISOString()
  .slice(0, 10);

const nextConfig: NextConfig = {
  reactStrictMode: true,

  env: {
    NEXT_PUBLIC_BUILD_DATE: BUILD_DATE,
  },

  // --- Static export for Azure Static Web Apps ---
  // `next build` writes build internals to .next (the default distDir) and the
  // deployable HTML/CSS/JS to out/.
  //
  // Do NOT re-add `distDir: 'out'`. Next 16 has `next dev` write to
  // <distDir>/dev and hold a lockfile at <distDir>/lock, and `next build` puts
  // server/, cache/, types/ and *-manifest.json in distDir. With distDir set
  // to 'out', all of that lands in the folder Azure uploads to the public CDN.
  output: 'export',
  trailingSlash: true,
  skipTrailingSlashRedirect: true,

  poweredByHeader: false,

  // Required: the default next/image loader needs a server to optimise through.
  images: {
    unoptimized: true,
  },

  experimental: {
    scrollRestoration: true,
  },

  compiler: {
    // Keep error/warn -- DownloadPDFButton reports PDF generation failures
    // through console.error, and stripping that would make production
    // failures silent.
    removeConsole:
      process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
};

export default nextConfig;
