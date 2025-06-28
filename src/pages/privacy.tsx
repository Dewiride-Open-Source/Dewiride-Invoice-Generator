import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function Privacy() {
  return (
    <>
      <Head>
        <title>Privacy Policy - Dewiride Technologies Invoice Generator | Free Online Invoice Maker</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="description" content="Privacy policy for Dewiride Technologies Invoice Generator. Learn how we protect your data and use anonymous analytics to improve our free online invoice generator service." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://invoice.dewiride.com/privacy" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm flex items-center justify-center mb-4">
                ← Back to Invoice Generator
              </Link>
              <div className="flex items-center justify-center mb-4">
                <img 
                  src="/logo.svg" 
                  alt="Dewiride Technologies Logo" 
                  className="h-8 w-auto mr-3"
                  onError={(e) => {
                    e.currentTarget.src = '/logo.png';
                  }}
                />
                <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
              </div>
              <p className="text-gray-600 mt-2">Last updated: June 28, 2025</p>
            </div>

            {/* Content */}
            <div className="prose max-w-none">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Our Commitment to Privacy</h2>
              <p className="text-gray-600 mb-6">
                At Dewiride Technologies, we are committed to protecting your privacy. This Privacy Policy explains 
                how we handle information when you use our free online invoice generator at https://invoice.dewiride.com.
              </p>

              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Analytics Data</h3>
              <p className="text-gray-600 mb-4">
                We use Google Analytics (Tracking ID: G-N6400HZG5L) to understand how our service is used and to improve user experience. 
                We collect only anonymous, aggregated data including:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-6 space-y-2">
                <li>General usage patterns (page views, session duration, form interactions)</li>
                <li>Currency preferences (USD, EUR, etc.) - no amounts tied to personal data</li>
                <li>Number of items in invoices (for feature optimization)</li>
                <li>Anonymized total invoice amounts (for business insights and feature planning)</li>
                <li>User interaction events (PDF downloads, saved data usage, form progress)</li>
                <li>Browser and device information (for compatibility improvements)</li>
                <li>Geographic location (country/region level only)</li>
              </ul>
              <p className="text-gray-600 mb-6">
                <strong>Important:</strong> All analytics data is anonymous and cannot be linked back to individual users or specific invoice content.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Information We Never Collect</h3>
              <p className="text-gray-600 mb-4">
                We are committed to your privacy and explicitly do NOT collect:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-6 space-y-2">
                <li>Personal names, email addresses, or contact information</li>
                <li>Company names or business information</li>
                <li>Invoice content, descriptions, or business details</li>
                <li>Addresses (business or personal)</li>
                <li>Invoice numbers or reference data</li>
                <li>Any personally identifiable information (PII)</li>
                <li>Complete invoice data or content</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-800 mb-4">How We Store Your Data</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Local Browser Storage</h3>
              <p className="text-gray-600 mb-4">
                Your invoice data is stored locally in your browser using two mechanisms:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-6 space-y-2">
                <li><strong>Session Storage:</strong> Your current invoice data is temporarily saved and automatically cleared when you close your browser tab</li>
                <li><strong>Local Storage:</strong> Company details and item descriptions you choose to save for future use (this helps you create invoices faster by providing quick-select dropdowns)</li>
              </ul>
              <p className="text-gray-600 mb-6">
                <strong>Complete Privacy:</strong> All data stored locally never leaves your device - it's not transmitted to our servers or any third parties.
                You can clear this data anytime using your browser settings or our "Manage Saved Data" feature in the app.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Server Storage</h3>
              <p className="text-gray-600 mb-6">
                We do not store any of your invoice data, business information, or personal details on our servers. 
                Our service is designed to be completely privacy-focused with client-side processing.
              </p>

              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Third-Party Services</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Google Analytics</h3>
              <p className="text-gray-600 mb-4">
                We use Google Analytics (gtag.js) with tracking ID G-N6400HZG5L to collect anonymous usage statistics. This helps us:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
                <li>Understand which features are most useful to users</li>
                <li>Improve the user experience and interface design</li>
                <li>Identify technical issues and performance bottlenecks</li>
                <li>Make data-driven decisions about new features</li>
                <li>Optimize the service for different devices and browsers</li>
              </ul>
              <p className="text-gray-600 mb-4">
                <strong>Data Collected:</strong> We track events like invoice generation, PDF downloads, currency changes, 
                form progress, and saved data usage. All data is aggregated and anonymous.
              </p>
              <p className="text-gray-600 mb-6">
                <strong>Opt-Out:</strong> You can opt-out of Google Analytics tracking by installing the 
                <a href="https://tools.google.com/dlpage/gaoptout" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer"> Google Analytics Opt-out Browser Add-on</a>,
                using browser privacy settings, or ad-blocking extensions.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">PDF Generation</h3>
              <p className="text-gray-600 mb-6">
                PDF generation happens entirely in your browser using client-side libraries. 
                No invoice data is sent to external services for PDF creation.
              </p>

              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Your Rights and Choices</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Data Control</h3>
              <ul className="list-disc pl-6 text-gray-600 mb-6 space-y-2">
                <li>You can clear all locally stored data using our "Manage Saved Data" feature in the app</li>
                <li>You can view, delete individual entries, or clear all saved companies and items</li>
                <li>You can disable analytics by using browser settings, ad-blockers, or the Google Analytics opt-out add-on</li>
                <li>No registration is required - you can use the service completely anonymously</li>
                <li>You can stop using the service at any time without any data retention concerns</li>
                <li>Session data automatically clears when you close your browser</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Cookie Management</h3>
              <p className="text-gray-600 mb-6">
                We use minimal cookies, primarily for Google Analytics functionality. You can control cookies through 
                your browser settings, use private/incognito browsing mode, or disable them entirely. The service 
                will still function without cookies, though analytics will be disabled.
              </p>

              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Data Security</h2>
              <p className="text-gray-600 mb-6">
                Since we don't collect or store your personal information on our servers, there's minimal risk 
                of your invoice data being compromised. All invoice generation and data processing happens 
                securely in your browser using modern web technologies.
              </p>

              <h2 className="text-2xl font-semibold text-gray-800 mb-4">International Users</h2>
              <p className="text-gray-600 mb-6">
                Our service is available globally. If you're located outside of India, please note that 
                Google Analytics may process data according to their international data transfer policies.
              </p>

              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Children's Privacy</h2>
              <p className="text-gray-600 mb-6">
                Our service is not specifically designed for children under 13. We do not knowingly collect 
                personal information from children under 13.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Security</h3>
              <p className="text-gray-600 mb-6">
                Since we don't collect or store your personal information, there's no risk of your invoice data 
                being compromised on our servers. All invoice generation happens in your browser.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Changes to This Policy</h3>
              <p className="text-gray-600 mb-6">
                We may update this Privacy Policy from time to time. Any changes will be posted on this page 
                with an updated revision date.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Contact Us</h3>
              <p className="text-gray-600 mb-6">
                If you have any questions about this Privacy Policy, please contact us at:
                <br />
                <strong>Dewiride Technologies Private Limited</strong>
                <br />
                Website: <a href="https://dewiride.com" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://dewiride.com</a>
                <br />
                Email: Contact us through our main website
              </p>
            </div>

            <div className="text-center mt-8 pt-8 border-t">
              <Link 
                href="/" 
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Creating Invoices
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
