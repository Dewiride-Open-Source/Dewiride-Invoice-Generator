import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

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
