import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import InvoiceForm, { InvoiceData } from '../components/InvoiceForm';
import InvoicePreview from '../components/InvoicePreview';
import DownloadPDFButton from '../components/DownloadPDFButton';
import SavedDataManager from '../components/SavedDataManager';
import { saveFromCompany, saveToCompany, saveItemDescription } from '../utils/savedData';
import { trackSavedDataManagerOpened, trackFormProgress, trackInvoiceGenerated } from '../utils/analytics';
import { computeTotals } from '../utils/totals';

const defaultInvoice: InvoiceData = {
  fromName: '',
  fromAddress: '',
  toName: '',
  toAddress: '',
  invoiceNumber: '',
  invoiceDate: '',
  dueDate: '',
  items: [
    { description: '', quantity: 1, price: 0 },
  ],
  tax: 0,
  currency: 'INR',
};

export default function Home() {
  const [invoice, setInvoice] = useState<InvoiceData>(defaultInvoice);
  const [showSavedDataManager, setShowSavedDataManager] = useState(false);
  
  // Refs to store timeout IDs for debouncing
  const saveTimeoutsRef = useRef<{
    fromCompany?: NodeJS.Timeout;
    toCompany?: NodeJS.Timeout;
    items: Map<number, NodeJS.Timeout>;
  }>({
    items: new Map(),
  });

  // Load saved invoice data only on client side to prevent hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('invoice-data');
      if (saved) {
        try {
          // Restoring the sessionStorage draft. Reading it during render
          // would break hydration against the prerendered HTML.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setInvoice(JSON.parse(saved));
        } catch {
          // If parsing fails, keep default invoice
        }
      }
    }
  }, []);

  // Auto-save to localStorage when specific fields are updated with proper debouncing
  const autoSaveCompaniesAndItems = useCallback((newInvoice: InvoiceData, prevInvoice?: InvoiceData) => {
    // Only save if there are meaningful changes and both name and address are present
    
    // Save From company if both name and address are present and either is different from previous
    if (newInvoice.fromName.trim() && newInvoice.fromAddress.trim()) {
      const fromChanged = !prevInvoice || 
          prevInvoice.fromName.trim() !== newInvoice.fromName.trim() || 
          prevInvoice.fromAddress.trim() !== newInvoice.fromAddress.trim();
      
      if (fromChanged) {
        // Clear previous timeout
        if (saveTimeoutsRef.current.fromCompany) {
          clearTimeout(saveTimeoutsRef.current.fromCompany);
        }
        
        // Set new timeout
        saveTimeoutsRef.current.fromCompany = setTimeout(() => {
          saveFromCompany(newInvoice.fromName.trim(), newInvoice.fromAddress.trim());
        }, 2000);
      }
    }

    // Save To company if both name and address are present and either is different from previous
    if (newInvoice.toName.trim() && newInvoice.toAddress.trim()) {
      const toChanged = !prevInvoice || 
          prevInvoice.toName.trim() !== newInvoice.toName.trim() || 
          prevInvoice.toAddress.trim() !== newInvoice.toAddress.trim();
      
      if (toChanged) {
        // Clear previous timeout
        if (saveTimeoutsRef.current.toCompany) {
          clearTimeout(saveTimeoutsRef.current.toCompany);
        }
        
        // Set new timeout
        saveTimeoutsRef.current.toCompany = setTimeout(() => {
          saveToCompany(newInvoice.toName.trim(), newInvoice.toAddress.trim());
        }, 2000);
      }
    }

    // Save item descriptions that are meaningful and changed
    newInvoice.items.forEach((item, index) => {
      if (item.description.trim() && item.description.trim().length >= 3) {
        const prevItem = prevInvoice?.items[index];
        const descriptionChanged = !prevItem || prevItem.description.trim() !== item.description.trim();
        const priceChanged = !prevItem || prevItem.price !== item.price;
        
        if (descriptionChanged || (priceChanged && item.price > 0)) {
          // Clear previous timeout for this item
          const existingTimeout = saveTimeoutsRef.current.items.get(index);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }
          
          // Set new timeout for this item
          const newTimeout = setTimeout(() => {
            saveItemDescription(item.description.trim(), item.price > 0 ? item.price : undefined);
            saveTimeoutsRef.current.items.delete(index);
          }, 2000);
          
          saveTimeoutsRef.current.items.set(index, newTimeout);
        }
      }
    });
  }, []);

  const handleInvoiceChange = useCallback((newInvoice: InvoiceData) => {
    autoSaveCompaniesAndItems(newInvoice, invoice);
    setInvoice(newInvoice);
    
    // Track form progress for analytics
    if (newInvoice.fromName && newInvoice.fromAddress && newInvoice.toName && newInvoice.toAddress) {
      if (!invoice.fromName || !invoice.fromAddress || !invoice.toName || !invoice.toAddress) {
        trackFormProgress('basic_info');
      }
    }
    
    if (newInvoice.invoiceNumber && newInvoice.invoiceDate && newInvoice.dueDate) {
      if (!invoice.invoiceNumber || !invoice.invoiceDate || !invoice.dueDate) {
        trackFormProgress('invoice_details');
      }
    }
    
    if (newInvoice.items.some(item => item.description && item.quantity > 0 && item.price > 0)) {
      if (!invoice.items.some(item => item.description && item.quantity > 0 && item.price > 0)) {
        trackFormProgress('items_added');
      }
    }
    
    // Track complete invoice generation
    const isComplete = newInvoice.fromName && newInvoice.fromAddress && 
                      newInvoice.toName && newInvoice.toAddress && 
                      newInvoice.invoiceNumber && newInvoice.invoiceDate && 
                      newInvoice.items.some(item => item.description && item.quantity > 0 && item.price > 0);
    
    const wasIncomplete = !invoice.fromName || !invoice.fromAddress || 
                         !invoice.toName || !invoice.toAddress || 
                         !invoice.invoiceNumber || !invoice.invoiceDate || 
                         !invoice.items.some(item => item.description && item.quantity > 0 && item.price > 0);
    
    if (isComplete && wasIncomplete) {
      trackFormProgress('complete');
      trackInvoiceGenerated(
        newInvoice.currency,
        newInvoice.items.length,
        computeTotals(newInvoice).total,
      );
    }
  }, [invoice, autoSaveCompaniesAndItems]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('invoice-data', JSON.stringify(invoice));
    }
  }, [invoice]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    // Captured here rather than read in the cleanup closure: the ref's
    // contents are mutated throughout the component's life, and reading
    // `.current` at teardown is the pattern exhaustive-deps warns about.
    const timeouts = saveTimeoutsRef.current;
    return () => {
      if (timeouts.fromCompany) clearTimeout(timeouts.fromCompany);
      if (timeouts.toCompany) clearTimeout(timeouts.toCompany);
      timeouts.items.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  return (
    <>
      <Head>
        <title>Free Invoice Generator - Create Professional PDF Invoices Online | Dewiride Technologies</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="description" content="Generate professional invoices instantly with Dewiride Technologies' free online invoice maker. Create, customize and download PDF invoices with multiple currencies. Perfect for freelancers and small businesses. No registration required - start creating invoices now!" />
        <meta name="keywords" content="free invoice generator, invoice maker, PDF invoice, business invoice, freelancer invoice, online invoicing, professional invoice template, tax invoice, billing software, small business tools, Dewiride Technologies" />
        
        {/* Enhanced Open Graph for better social sharing */}
        <meta property="og:title" content="Free Invoice Generator - Create Professional PDF Invoices Online | Dewiride Technologies" />
        <meta property="og:description" content="Generate professional invoices instantly with Dewiride Technologies' free online invoice maker. Multiple currencies supported. No registration required." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://invoice.dewiride.com/invoice-generator-preview.png" />
        <meta property="og:url" content="https://invoice.dewiride.com" />
        
        {/* Enhanced Twitter Cards */}
        <meta name="twitter:title" content="Free Invoice Generator - Create Professional PDF Invoices Online | Dewiride Technologies" />
        <meta name="twitter:description" content="Generate professional invoices instantly with Dewiride Technologies' free online invoice maker. No registration required." />
        <meta name="twitter:image" content="https://invoice.dewiride.com/invoice-generator-preview.png" />
        <meta name="twitter:card" content="summary_large_image" />
        
        {/* Page-specific structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "Is the invoice generator really free?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes, our invoice generator is completely free to use. You can create unlimited invoices without any hidden fees or subscriptions."
                  }
                },
                {
                  "@type": "Question",
                  "name": "What currencies are supported?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "We support multiple currencies including USD, EUR, GBP, INR, and many more for global business needs."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Do I need to register to use the invoice generator?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "No registration is required. You can start creating professional invoices immediately without creating an account."
                  }
                },
                {
                  "@type": "Question",
                  "name": "What format are the invoices downloaded in?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "All invoices are generated as high-quality PDF files that are ready to send to your clients."
                  }
                }
              ]
            })
          }}
        />
      </Head>
      
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
        {/* Header Section with Enhanced SEO */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="/logo.svg" 
              alt="Dewiride Technologies Logo" 
              className="h-12 w-auto mr-3"
              onError={(e) => {
                // Fallback to PNG if SVG fails
                e.currentTarget.src = '/logo.png';
              }}
            />
            <h1 className="text-4xl font-bold text-gray-900">
              Free Invoice Generator
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mb-4">
            Create professional invoices in minutes with Dewiride Technologies&rsquo; free online invoice generator. 
            Generate, customize, and download PDF invoices instantly with multiple currency support. 
            Perfect for freelancers, small businesses, and entrepreneurs. No registration required!
          </p>
          <div className="text-sm text-gray-500 space-x-4">
            <span className="inline-flex items-center">
              ✓ 100% Free Forever
            </span>
            <span className="inline-flex items-center">
              ✓ No Registration Required
            </span>
            <span className="inline-flex items-center">
              ✓ Multiple Currencies
            </span>
            <span className="inline-flex items-center">
              ✓ Professional PDF Output
            </span>
          </div>
        </header>
        
        {/* Main Application Section */}
        <main className="flex flex-col md:flex-row gap-8 w-full max-w-6xl mb-12">
          <section className="flex-1 bg-white rounded shadow p-4" aria-label="Invoice Creation Form">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">Create Your Invoice</h2>
              <button
                onClick={() => {
                  setShowSavedDataManager(true);
                  trackSavedDataManagerOpened();
                }}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                title="Manage saved companies and items"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7l2 2-2 2m0 12l2-2-2-2" />
                </svg>
                Manage Saved Data
              </button>
            </div>
            <InvoiceForm data={invoice} onChange={handleInvoiceChange} />
          </section>
          <section className="flex-1 bg-white rounded shadow p-4" aria-label="Invoice Preview">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">Invoice Preview</h2>
            <InvoicePreview data={invoice} />
            <div className="mt-4 flex justify-end">
              <DownloadPDFButton data={invoice} />
            </div>
          </section>
        </main>
        
        {/* Enhanced Features Section for SEO */}
        <section className="w-full max-w-6xl mb-12 bg-white rounded-lg shadow p-8">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">
            Why Choose Dewiride Technologies&rsquo; Free Invoice Generator?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-3">💯</div>
              <h3 className="font-semibold text-gray-800 mb-2">100% Free</h3>
              <p className="text-sm text-gray-600">
                No hidden fees, no subscriptions, no limits. Create unlimited professional invoices completely free.
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">📄</div>
              <h3 className="font-semibold text-gray-800 mb-2">Professional PDF</h3>
              <p className="text-sm text-gray-600">
                Download high-quality PDF invoices with professional formatting ready to send to your clients.
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">💰</div>
              <h3 className="font-semibold text-gray-800 mb-2">Multiple Currencies</h3>
              <p className="text-sm text-gray-600">
                Support for USD, EUR, GBP, INR, and more currencies for global business operations.
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="font-semibold text-gray-800 mb-2">Instant Generation</h3>
              <p className="text-sm text-gray-600">
                Create and download your invoice in seconds. Real-time preview as you type.
              </p>
            </div>
          </div>
        </section>
        
        {/* SEO Content Section */}
        <section className="w-full max-w-6xl mb-12 bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">
            How to Create an Invoice Online - Simple Steps
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <ol className="space-y-4 text-gray-700">
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3">1</span>
                  <div>
                    <strong>Enter Your Business Details:</strong> Fill in your company name, address, and contact information in the &quot;From&quot; section.
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3">2</span>
                  <div>
                    <strong>Add Client Information:</strong> Enter your client&rsquo;s name and billing address in the &quot;To&quot; section.
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3">3</span>
                  <div>
                    <strong>Set Invoice Details:</strong> Add invoice number, date, and due date for payment.
                  </div>
                </li>
              </ol>
            </div>
            <div>
              <ol className="space-y-4 text-gray-700" start={4}>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3">4</span>
                  <div>
                    <strong>Add Items & Services:</strong> List your products or services with descriptions, quantities, and prices.
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3">5</span>
                  <div>
                    <strong>Set Currency & Tax:</strong> Choose your preferred currency and add tax percentage if applicable.
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3">6</span>
                  <div>
                    <strong>Download PDF:</strong> Click &quot;Download PDF&quot; to get your professional invoice ready to send.
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </section>
        
        {/* FAQ Section for SEO */}
        <section className="w-full max-w-6xl mb-12 bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">
            Frequently Asked Questions About Our Invoice Generator
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Is the invoice generator really free to use?</h3>
              <p className="text-gray-600">
                Yes, our invoice generator is completely free with no hidden costs, subscriptions, or limits. 
                You can create unlimited professional invoices without any charges.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">What currencies does the invoice generator support?</h3>
              <p className="text-gray-600">
                We support multiple currencies including USD (US Dollar), EUR (Euro), GBP (British Pound), 
                INR (Indian Rupee), and many more to accommodate global business needs.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Do I need to create an account or register?</h3>
              <p className="text-gray-600">
                No registration is required. You can start creating professional invoices immediately 
                without providing any personal information or creating an account.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Are my invoice data saved automatically?</h3>
              <p className="text-gray-600">
                Yes, your invoice data is automatically saved in your browser session, so you won&rsquo;t lose 
                your progress if you accidentally refresh the page.
              </p>
            </div>
          </div>
        </section>
        
        {/* Enhanced Footer with SEO Content */}
        <footer className="w-full max-w-6xl text-center">
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Start Creating Professional Invoices Today
            </h2>
            <p className="text-gray-600 mb-6 max-w-3xl mx-auto">
              Join thousands of freelancers, consultants, and small business owners who trust Dewiride Technologies&rsquo; free invoice generator 
              to create professional invoices. No registration required - start now and download your first invoice in minutes!
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <h3 className="font-semibold text-gray-800 mb-2">Perfect for Freelancers</h3>
                <p className="text-sm text-gray-600">
                  Create professional invoices for your clients quickly and easily. Multiple currency support for international work.
                </p>
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-gray-800 mb-2">Small Business Ready</h3>
                <p className="text-sm text-gray-600">
                  Professional invoice templates that make your small business look established and trustworthy.
                </p>
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-gray-800 mb-2">Consultant Friendly</h3>
                <p className="text-sm text-gray-600">
                  Perfect for consultants who need to bill clients for services, projects, and hourly work.
                </p>
              </div>
            </div>
            
            <div className="border-t pt-6">
              <p className="text-xs text-gray-500 mb-2">
                © 2025 Dewiride Technologies Private Limited. Free online invoice maker for businesses worldwide.
              </p>
              <p className="text-xs text-gray-400 mb-3">
                Create professional invoices • PDF download • Multiple currencies • No registration required
              </p>
              <div className="flex justify-center space-x-4 text-xs">
                <Link 
                  href="/privacy" 
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Privacy Policy
                </Link>
                <span className="text-gray-400">•</span>
                <Link 
                  href="/terms" 
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Terms of Service
                </Link>
                <span className="text-gray-400">•</span>
                <a 
                  href="https://dewiride.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Dewiride Technologies
                </a>
              </div>
            </div>
          </div>
        </footer>

        {/* Saved Data Manager Modal */}
        <SavedDataManager
          isOpen={showSavedDataManager}
          onClose={() => setShowSavedDataManager(false)}
        />
      </div>
    </>
  );
}
