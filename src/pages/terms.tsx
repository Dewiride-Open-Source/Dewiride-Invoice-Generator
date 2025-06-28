import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function Terms() {
  return (
    <>
      <Head>
        <title>Terms of Service - Dewiride Technologies Invoice Generator | Free Online Invoice Maker</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="description" content="Terms of service for Dewiride Technologies Invoice Generator. Read our terms and conditions for using our free online invoice generator tool." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://invoice.dewiride.com/terms" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm">
                ← Back to Invoice Generator
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 mt-4">Terms of Service</h1>
              <p className="text-gray-600 mt-2">Last updated: June 28, 2025</p>
            </div>

            {/* Content */}
            <div className="prose max-w-none">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Agreement to Terms</h2>
              <p className="text-gray-600 mb-6">
                By accessing and using Dewiride Technologies Invoice Generator, you accept and agree to be bound by the terms 
                and provision of this agreement.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Use License</h3>
              <p className="text-gray-600 mb-4">
                Permission is granted to temporarily use Dewiride Technologies Invoice Generator for personal and commercial use. 
                This is the grant of a license, not a transfer of title, and under this license you may:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-6 space-y-2">
                <li>Create unlimited invoices for your business</li>
                <li>Download and use generated PDF invoices</li>
                <li>Use the service for commercial purposes</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Restrictions</h3>
              <p className="text-gray-600 mb-4">You may not:</p>
              <ul className="list-disc pl-6 text-gray-600 mb-6 space-y-2">
                <li>Attempt to reverse engineer or copy the service</li>
                <li>Remove any copyright or other proprietary notations</li>
                <li>Use the service for any illegal purposes</li>
                <li>Attempt to gain unauthorized access to our systems</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Disclaimer</h3>
              <p className="text-gray-600 mb-6">
                The materials on Invoice Generator Pro are provided on an 'as is' basis. Invoice Generator Pro 
                makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties 
                including without limitation, implied warranties or conditions of merchantability, fitness for a 
                particular purpose, or non-infringement of intellectual property or other violation of rights.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Limitations</h3>
              <p className="text-gray-600 mb-6">
                In no event shall Invoice Generator Pro or its suppliers be liable for any damages (including, 
                without limitation, damages for loss of data or profit, or due to business interruption) arising 
                out of the use or inability to use the materials on Invoice Generator Pro, even if Invoice Generator Pro 
                or an authorized representative has been notified orally or in writing of the possibility of such damage.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Accuracy of Materials</h3>
              <p className="text-gray-600 mb-6">
                The materials appearing on Invoice Generator Pro could include technical, typographical, or photographic 
                errors. Invoice Generator Pro does not warrant that any of the materials on its website are accurate, 
                complete, or current.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Modifications</h3>
              <p className="text-gray-600 mb-6">
                Invoice Generator Pro may revise these terms of service at any time without notice. By using this 
                website, you are agreeing to be bound by the then current version of these terms of service.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Governing Law</h3>
              <p className="text-gray-600 mb-6">
                These terms and conditions are governed by and construed in accordance with the laws and you 
                irrevocably submit to the exclusive jurisdiction of the courts in that state or location.
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
