import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import Script from 'next/script';
import { Inter } from 'next/font/google';

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

const GA_MEASUREMENT_ID = 'G-N6400HZG5L';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${inter.variable} font-sans`}>
      <Component {...pageProps} />

      {/*
        GA used to be a raw <script async> in _document's <head>, which put a
        third-party request on the critical path. afterInteractive defers it
        until hydration finishes. The initial page_view is reported marginally
        later as a result; that is the right trade for not blocking paint.
      */}
      <Script
        id="ga-loader"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </div>
  );
}
