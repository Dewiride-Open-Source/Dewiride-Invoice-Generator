import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set security headers
  res.setHeader('X-Robots-Tag', 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  
  const seoData = {
    title: "Free Invoice Generator - Create Professional PDF Invoices Online | Dewiride Technologies",
    description: "Generate professional invoices instantly with Dewiride Technologies' free online invoice maker. Create, customize and download PDF invoices with multiple currencies. Perfect for freelancers and small businesses. No registration required.",
    keywords: [
      "invoice generator",
      "free invoice maker", 
      "PDF invoice",
      "business invoice",
      "freelancer invoice",
      "small business invoicing",
      "invoice template",
      "online invoice creator",
      "professional invoice",
      "tax invoice",
      "billing software",
      "Dewiride Technologies"
    ],
    features: [
      "100% Free Forever",
      "No Registration Required", 
      "Professional PDF Output",
      "Multiple Currency Support",
      "Real-time Preview",
      "Session Data Persistence",
      "Mobile Responsive",
      "Instant Download"
    ],
    schema: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Dewiride Invoice Generator",
      "description": "Free professional invoice generator tool by Dewiride Technologies for creating and downloading PDF invoices online",
      "url": "https://invoice.dewiride.com",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web Browser",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    }
  };

  res.status(200).json(seoData);
}
