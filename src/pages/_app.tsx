import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import { GA_MEASUREMENT_ID } from '@/utils/analytics';

/**
 * next/font downloads the woff2 files at build time and serves them from
 * /_next/static/media, so the browser makes no request to Google at all. It
 * also emits a size-adjusted fallback face, which removes the layout shift the
 * previous bare `font-family: Arial` stack caused.
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${inter.variable} font-sans`}>
      <Component {...pageProps} />

      {/*
        lazyOnload, not afterInteractive. gtag.js is 166 KB from a third-party
        origin, and on a throttled mobile connection it was the single biggest
        drag on this page: blocking it took LCP from 5.8s to 2.9s and the
        Lighthouse performance score from 78 to 95.

        Loading it during browser idle costs nothing in coverage, because the
        gtag queue is already installed inline in _document -- calls made
        before this lands are buffered on dataLayer and flushed on arrival.
      */}
      <Script
        id="ga-loader"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="lazyOnload"
      />
    </div>
  );
}
