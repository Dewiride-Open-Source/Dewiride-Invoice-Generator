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
                <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
              </div>
              <p className="text-gray-600 mt-2">Last updated: June 28, 2025</p>
            </div>

            {/* Content */}
            <div className="prose max-w-none">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Agreement to Terms</h2>
              <p className="text-gray-600 mb-6">
                By accessing and using the Dewiride Technologies Invoice Generator available at https://invoice.dewiride.com, 
                you accept and agree to be bound by the terms and provisions of this agreement.
              </p>

              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Service Description</h2>
              <p className="text-gray-600 mb-4">
                Dewiride Technologies provides a free online invoice generator that allows users to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-6 space-y-2">
                <li>Create professional invoices with customizable details</li>
                <li>Generate and download high-quality PDF invoices</li>
                <li>Save and reuse company and item information locally in your browser</li>
                <li>Support multiple currencies with automatic formatting</li>
                <li>Access the service without registration or account creation</li>
                <li>Manage saved data through an integrated data manager</li>
                <li>Real-time invoice preview with live updates</li>
                <li>Session persistence to prevent data loss</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Acceptable Use</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Permitted Uses</h3>
              <p className="text-gray-600 mb-4">You may use our service to:</p>
              <ul className="list-disc pl-6 text-gray-600 mb-6 space-y-2">
                <li>Create unlimited invoices for personal and commercial use</li>
                <li>Download and use generated PDF invoices for business purposes</li>
                <li>Save company and item data locally for convenience and efficiency</li>
                <li>Use all features of the service for legitimate business activities</li>
                <li>Access and manage your locally stored data</li>
                <li>Use the service across different currencies and regions</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Prohibited Uses</h3>
              <p className="text-gray-600 mb-4">You may not:</p>
              <ul className="list-disc pl-6 text-gray-600 mb-6 space-y-2">
                <li>Use the service for any illegal, fraudulent, or deceptive purposes</li>
                <li>Create false or misleading invoices</li>
                <li>Attempt to reverse engineer, copy, or replicate the service</li>
                <li>Remove any copyright, trademark, or other proprietary notices</li>
                <li>Attempt to gain unauthorized access to our systems or other users' data</li>
                <li>Use automated tools to abuse or overload our service</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Interfere with or disrupt the service or servers</li>
                <li>Use the service to send spam or unsolicited communications</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Data and Privacy</h2>
              <p className="text-gray-600 mb-4">
                By using our service, you acknowledge that:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-6 space-y-2">
                <li>Your invoice data is stored locally in your browser and not transmitted to our servers</li>
                <li>We use Google Analytics to collect anonymous usage statistics (no personal data)</li>
                <li>We collect analytics data as described in our Privacy Policy</li>
                <li>You are responsible for the accuracy of your invoice information</li>
                <li>You can clear your locally stored data at any time through the data manager</li>
                <li>Your company details and invoice content remain completely private</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Analytics and Tracking</h2>
              <p className="text-gray-600 mb-4">
                We use Google Analytics to understand how users interact with our service. This helps us improve 
                the user experience. The analytics data collected includes:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-6 space-y-2">
                <li>General usage patterns (form completion, PDF downloads)</li>
                <li>Currency preferences and invoice amounts (for statistical analysis)</li>
                <li>Feature usage (saved data management, form progress)</li>
                <li>Page engagement metrics</li>
              </ul>
              <p className="text-gray-600 mb-6">
                <strong>Important:</strong> We do NOT collect any personally identifiable information, 
                company names, addresses, item descriptions, or any content from your invoices.
              </p>

              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Intellectual Property</h2>
              <p className="text-gray-600 mb-6">
                The Dewiride Technologies Invoice Generator, including its design, code, features, and content, 
                is owned by Dewiride Technologies Private Limited and protected by copyright and other intellectual 
                property laws. You retain ownership of any content you create using our service.
              </p>

              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Service Availability</h2>
              <p className="text-gray-600 mb-6">
                We strive to maintain high availability of our service but cannot guarantee uninterrupted access. 
                We may temporarily suspend the service for maintenance, updates, or other technical reasons. 
                We reserve the right to modify or discontinue features at any time.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Disclaimer of Warranties</h3>
              <p className="text-gray-600 mb-6">
                The Dewiride Technologies Invoice Generator is provided on an "as is" and "as available" basis. 
                We make no warranties, expressed or implied, including but not limited to warranties of merchantability, 
                fitness for a particular purpose, or non-infringement of intellectual property rights.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Limitation of Liability</h3>
              <p className="text-gray-600 mb-6">
                In no event shall Dewiride Technologies Private Limited be liable for any direct, indirect, 
                incidental, special, consequential, or punitive damages, including but not limited to loss of 
                profits, data, or business interruption, arising out of your use or inability to use our service.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">User Responsibilities</h3>
              <p className="text-gray-600 mb-4">You are responsible for:</p>
              <ul className="list-disc pl-6 text-gray-600 mb-6 space-y-2">
                <li>The accuracy and completeness of information in your invoices</li>
                <li>Compliance with applicable tax laws and regulations</li>
                <li>Ensuring your invoices meet legal requirements in your jurisdiction</li>
                <li>Maintaining backups of important invoice data</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Modifications to Terms</h3>
              <p className="text-gray-600 mb-6">
                Dewiride Technologies may revise these terms of service at any time by updating this page. 
                Your continued use of the service after changes constitutes acceptance of the modified terms.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Governing Law and Jurisdiction</h3>
              <p className="text-gray-600 mb-6">
                These terms are governed by the laws of India. Any disputes arising from your use of this 
                service will be subject to the exclusive jurisdiction of the courts in India.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Contact Information</h3>
              <p className="text-gray-600 mb-6">
                If you have questions about these Terms of Service, please contact us at:
                <br />
                <strong>Dewiride Technologies Private Limited</strong>
                <br />
                Website: <a href="https://dewiride.com" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://dewiride.com</a>
                <br />
                Service URL: <a href="https://invoice.dewiride.com" className="text-blue-600 hover:underline">https://invoice.dewiride.com</a>
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Severability</h3>
              <p className="text-gray-600 mb-6">
                If any provision of these terms is found to be unenforceable or invalid, the remaining 
                provisions will continue to be valid and enforceable.
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
