import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function Privacy() {
  return (
    <>
      <Head>
        <title>Privacy Policy - Dewiride Technologies Invoice Generator | Free Online Invoice Maker</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="description" content="Privacy policy for Dewiride Technologies Invoice Generator. Learn how we protect your data when using our free online invoice generator. No data collection, no tracking." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://invoice.dewiride.com/privacy" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm">
                ← Back to Invoice Generator
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 mt-4">Privacy Policy</h1>
              <p className="text-gray-600 mt-2">Last updated: June 28, 2025</p>
            </div>

            {/* Content */}
            <div className="prose max-w-none">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Our Commitment to Privacy</h2>
              <p className="text-gray-600 mb-6">
                At Dewiride Technologies, we are committed to protecting your privacy. This Privacy Policy explains 
                how we handle information when you use our free online invoice generator.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Information We Don't Collect</h3>
              <ul className="list-disc pl-6 text-gray-600 mb-6 space-y-2">
                <li>We do not require registration or personal information</li>
                <li>We do not collect your invoice data or business information</li>
                <li>We do not track your usage or behavior</li>
                <li>We do not use cookies for tracking purposes</li>
                <li>We do not store your generated invoices on our servers</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Local Storage</h3>
              <p className="text-gray-600 mb-6">
                Your invoice data is stored locally in your browser's session storage for your convenience. 
                This data never leaves your device and is automatically cleared when you close your browser session.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Third-Party Services</h3>
              <p className="text-gray-600 mb-6">
                We may use anonymous analytics services to understand general usage patterns and improve our service. 
                These services do not collect personally identifiable information.
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
                If you have any questions about this Privacy Policy, please contact us through our website.
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
