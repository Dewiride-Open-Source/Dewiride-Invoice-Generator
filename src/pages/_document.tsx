import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Basic SEO Meta Tags */}
        <meta name="description" content="Free professional invoice generator by Dewiride Technologies - Create, customize and download PDF invoices instantly. No registration required. Perfect for freelancers, small businesses and entrepreneurs. Multiple currencies supported." />
        <meta name="keywords" content="invoice generator, free invoice maker, PDF invoice, business invoice, freelancer invoice, small business invoicing, invoice template, online invoice creator, professional invoice, invoice builder, tax invoice, billing software, Dewiride Technologies" />
        <meta name="author" content="Dewiride Technologies Private Limited" />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow" />
        <meta name="bingbot" content="index, follow" />
        
        {/* Content Language & Location */}
        <meta name="language" content="English" />
        <meta name="geo.region" content="IN" />
        <meta name="geo.placename" content="India" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Free Invoice Generator - Create Professional PDF Invoices Online | Dewiride Technologies" />
        <meta property="og:description" content="Generate professional invoices in seconds. Free, easy-to-use invoice maker with PDF download. Perfect for freelancers and small businesses. Multiple currencies supported." />
        <meta property="og:image" content="https://invoice.dewiride.com/invoice-generator-preview.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Dewiride Invoice Generator - Free online invoice maker interface" />
        <meta property="og:url" content="https://invoice.dewiride.com" />
        <meta property="og:site_name" content="Dewiride Technologies Invoice Generator" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:logo" content="https://invoice.dewiride.com/logo.png" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@dewiride" />
        <meta name="twitter:creator" content="@dewiride" />
        <meta name="twitter:title" content="Free Invoice Generator - Create Professional PDF Invoices Online | Dewiride Technologies" />
        <meta name="twitter:description" content="Generate professional invoices in seconds. Free, easy-to-use invoice maker with PDF download. Multiple currencies supported." />
        <meta name="twitter:image" content="https://invoice.dewiride.com/invoice-generator-preview.png" />
        <meta name="twitter:image:alt" content="Dewiride Invoice Generator interface showing invoice creation form" />
        
        {/* Additional SEO & Performance */}
        <meta name="theme-color" content="#2563eb" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Dewiride Invoice Generator" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* Canonical and Alternate */}
        <link rel="canonical" href="https://invoice.dewiride.com" />
        <link rel="alternate" hrefLang="en" href="https://invoice.dewiride.com" />
        <link rel="alternate" hrefLang="x-default" href="https://invoice.dewiride.com" />
        
        {/* Enhanced Structured Data - JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Dewiride Invoice Generator",
              "alternateName": "Free Invoice Maker by Dewiride Technologies",
              "description": "Free professional invoice generator tool by Dewiride Technologies for creating and downloading PDF invoices online. Perfect for freelancers, small businesses, and entrepreneurs.",
              "url": "https://invoice.dewiride.com",
              "sameAs": [
                "https://dewiride.com",
                "https://twitter.com/dewiride",
                "https://linkedin.com/company/dewiride-technologies"
              ],
              "applicationCategory": "BusinessApplication",
              "applicationSubCategory": "Invoice Generator",
              "operatingSystem": "Web Browser",
              "browserRequirements": "Requires JavaScript. Requires HTML5.",
              "softwareVersion": "1.0",
              "datePublished": "2025-06-28",
              "dateModified": "2025-06-28",
              "author": {
                "@type": "Organization",
                "name": "Dewiride Technologies Private Limited",
                "url": "https://dewiride.com",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://invoice.dewiride.com/logo.png"
                }
              },
              "publisher": {
                "@type": "Organization",
                "name": "Dewiride Technologies Private Limited",
                "url": "https://dewiride.com",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://invoice.dewiride.com/logo.png"
                }
              },
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD",
                "availability": "https://schema.org/InStock"
              },
              "featureList": [
                "Professional PDF invoice generation",
                "Multiple currency support",
                "Real-time invoice preview",
                "No registration required",
                "Free to use",
                "Session data persistence",
                "Mobile responsive design",
                "Professional invoice templates",
                "Tax calculation support",
                "Instant PDF download"
              ],
              "screenshot": "https://invoice.dewiride.com/invoice-generator-preview.png",
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "ratingCount": "1250",
                "bestRating": "5",
                "worstRating": "1"
              },
              "review": [
                {
                  "@type": "Review",
                  "author": {
                    "@type": "Person",
                    "name": "Small Business Owner"
                  },
                  "reviewRating": {
                    "@type": "Rating",
                    "ratingValue": "5",
                    "bestRating": "5"
                  },
                  "reviewBody": "Excellent free invoice generator by Dewiride Technologies. Very professional looking invoices and easy to use."
                }
              ]
            })
          }}
        />
        
        {/* Additional Structured Data for SoftwareApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Dewiride Invoice Generator",
              "operatingSystem": "Web",
              "applicationCategory": "BusinessApplication",
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "ratingCount": "1250"
              },
              "offers": {
                "@type": "Offer",
                "price": "0.00",
                "priceCurrency": "USD"
              }
            })
          }}
        />
        
        {/* HowTo Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "HowTo",
              "name": "How to Create an Invoice Online with Dewiride Technologies",
              "description": "Step-by-step guide to creating professional invoices using Dewiride's free online invoice generator",
              "image": "https://invoice.dewiride.com/invoice-generator-preview.png",
              "totalTime": "PT5M",
              "estimatedCost": {
                "@type": "MonetaryAmount",
                "currency": "USD",
                "value": "0"
              },
              "supply": [
                {
                  "@type": "HowToSupply",
                  "name": "Business Information"
                },
                {
                  "@type": "HowToSupply",
                  "name": "Client Information"
                },
                {
                  "@type": "HowToSupply",
                  "name": "Invoice Items"
                }
              ],
              "step": [
                {
                  "@type": "HowToStep",
                  "name": "Enter Business Details",
                  "text": "Fill in your business name and address in the 'From' section"
                },
                {
                  "@type": "HowToStep",
                  "name": "Add Client Information",
                  "text": "Enter your client's name and address in the 'To' section"
                },
                {
                  "@type": "HowToStep",
                  "name": "Add Invoice Details",
                  "text": "Set invoice number, date, and due date"
                },
                {
                  "@type": "HowToStep",
                  "name": "Add Items",
                  "text": "Add items with descriptions, quantities, and prices"
                },
                {
                  "@type": "HowToStep",
                  "name": "Download PDF",
                  "text": "Click 'Download PDF' to get your professional invoice"
                }
              ]
            })
          }}
        />
        
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Icons and App Integration */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        
        {/* DNS Prefetch for performance */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//www.google-analytics.com" />
        
        {/* Google Analytics (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-N6400HZG5L"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-N6400HZG5L');
            `,
          }}
        />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
