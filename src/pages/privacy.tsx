import React from 'react';
import LegalPage from '../components/LegalPage';

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      metaTitle="Privacy Policy — Dewiride Invoice Generator"
      description="How Dewiride Technologies' free invoice generator handles your data. Invoices never leave your browser; only anonymous analytics are collected."
      path="/privacy/"
      lastUpdated="9 August 2026"
    >

              <h2 className="font-semibold text-fg">Our Commitment to Privacy</h2>
              <p className="text-fg-muted">
                At Dewiride Technologies, we are committed to protecting your privacy. This Privacy Policy explains 
                how we handle information when you use our free online invoice generator at https://invoice.dewiride.com.
              </p>

              <h2 className="font-semibold text-fg">Information We Collect</h2>
              
              <h3 className="font-semibold text-fg">Analytics Data</h3>
              <p className="text-fg-muted">
                We use Google Analytics (Tracking ID: G-N6400HZG5L) to understand how our service is used and to improve user experience. 
                We collect only anonymous, aggregated data including:
              </p>
              <ul className="text-fg-muted">
                <li>General usage patterns (page views, session duration, form interactions)</li>
                <li>Currency preferences (USD, EUR, etc.) - no amounts tied to personal data</li>
                <li>Number of items in invoices (for feature optimization)</li>
                <li>Anonymized total invoice amounts (for business insights and feature planning)</li>
                <li>User interaction events (PDF downloads, saved data usage, form progress)</li>
                <li>Browser and device information (for compatibility improvements)</li>
                <li>Geographic location (country/region level only)</li>
              </ul>
              <p className="text-fg-muted">
                <strong>Important:</strong> All analytics data is anonymous and cannot be linked back to individual users or specific invoice content.
              </p>

              <h3 className="font-semibold text-fg">Information We Never Collect</h3>
              <p className="text-fg-muted">
                We are committed to your privacy and explicitly do NOT collect:
              </p>
              <ul className="text-fg-muted">
                <li>Personal names, email addresses, or contact information</li>
                <li>Company names or business information</li>
                <li>Invoice content, descriptions, or business details</li>
                <li>Addresses (business or personal)</li>
                <li>Invoice numbers or reference data</li>
                <li>Any personally identifiable information (PII)</li>
                <li>Complete invoice data or content</li>
              </ul>

              <h2 className="font-semibold text-fg">How We Store Your Data</h2>
              
              <h3 className="font-semibold text-fg">Local Browser Storage</h3>
              <p className="text-fg-muted">
                Your invoice data is stored locally in your browser using two mechanisms:
              </p>
              <ul className="text-fg-muted">
                <li><strong>Session Storage:</strong> Your current invoice data is temporarily saved and automatically cleared when you close your browser tab</li>
                <li><strong>Local Storage:</strong> Company details and item descriptions you choose to save for future use (this helps you create invoices faster by providing quick-select dropdowns)</li>
              </ul>
              <p className="text-fg-muted">
                <strong>Complete Privacy:</strong> All data stored locally never leaves your device - it&rsquo;s not transmitted to our servers or any third parties.
                You can clear this data anytime using your browser settings or our &quot;Manage Saved Data&quot; feature in the app.
              </p>

              <h3 className="font-semibold text-fg">Server Storage</h3>
              <p className="text-fg-muted">
                We do not store any of your invoice data, business information, or personal details on our servers. 
                Our service is designed to be completely privacy-focused with client-side processing.
              </p>

              <h2 className="font-semibold text-fg">Third-Party Services</h2>
              
              <h3 className="font-semibold text-fg">Google Analytics</h3>
              <p className="text-fg-muted">
                We use Google Analytics (gtag.js) with tracking ID G-N6400HZG5L to collect anonymous usage statistics. This helps us:
              </p>
              <ul className="text-fg-muted">
                <li>Understand which features are most useful to users</li>
                <li>Improve the user experience and interface design</li>
                <li>Identify technical issues and performance bottlenecks</li>
                <li>Make data-driven decisions about new features</li>
                <li>Optimize the service for different devices and browsers</li>
              </ul>
              <p className="text-fg-muted">
                <strong>Data Collected:</strong> We track events like invoice generation, PDF downloads, currency changes, 
                form progress, and saved data usage. All data is aggregated and anonymous.
              </p>
              <p className="text-fg-muted">
                <strong>Opt-Out:</strong> You can opt-out of Google Analytics tracking by installing the 
                <a href="https://tools.google.com/dlpage/gaoptout" className="text-brand-text underline" target="_blank" rel="noopener noreferrer"> Google Analytics Opt-out Browser Add-on</a>,
                using browser privacy settings, or ad-blocking extensions.
              </p>

              <h3 className="font-semibold text-fg">PDF Generation</h3>
              <p className="text-fg-muted">
                PDF generation happens entirely in your browser using client-side libraries. 
                No invoice data is sent to external services for PDF creation.
              </p>

              <h2 className="font-semibold text-fg">Your Rights and Choices</h2>
              
              <h3 className="font-semibold text-fg">Data Control</h3>
              <ul className="text-fg-muted">
                <li>You can clear all locally stored data using our &quot;Manage Saved Data&quot; feature in the app</li>
                <li>You can view, delete individual entries, or clear all saved companies and items</li>
                <li>You can disable analytics by using browser settings, ad-blockers, or the Google Analytics opt-out add-on</li>
                <li>No registration is required - you can use the service completely anonymously</li>
                <li>You can stop using the service at any time without any data retention concerns</li>
                <li>Session data automatically clears when you close your browser</li>
              </ul>

              <h3 className="font-semibold text-fg">Cookie Management</h3>
              <p className="text-fg-muted">
                We use minimal cookies, primarily for Google Analytics functionality. You can control cookies through 
                your browser settings, use private/incognito browsing mode, or disable them entirely. The service 
                will still function without cookies, though analytics will be disabled.
              </p>

              <h2 className="font-semibold text-fg">Data Security</h2>
              <p className="text-fg-muted">
                Since we don&rsquo;t collect or store your personal information on our servers, there&rsquo;s minimal risk 
                of your invoice data being compromised. All invoice generation and data processing happens 
                securely in your browser using modern web technologies.
              </p>

              <h2 className="font-semibold text-fg">International Users</h2>
              <p className="text-fg-muted">
                Our service is available globally. If you&rsquo;re located outside of India, please note that 
                Google Analytics may process data according to their international data transfer policies.
              </p>

              <h2 className="font-semibold text-fg">Children&rsquo;s Privacy</h2>
              <p className="text-fg-muted">
                Our service is not specifically designed for children under 13. We do not knowingly collect 
                personal information from children under 13.
              </p>

              <h3 className="font-semibold text-fg">Security</h3>
              <p className="text-fg-muted">
                Since we don&rsquo;t collect or store your personal information, there&rsquo;s no risk of your invoice data 
                being compromised on our servers. All invoice generation happens in your browser.
              </p>

              <h3 className="font-semibold text-fg">Changes to This Policy</h3>
              <p className="text-fg-muted">
                We may update this Privacy Policy from time to time. Any changes will be posted on this page 
                with an updated revision date.
              </p>

              <h3 className="font-semibold text-fg">Contact Us</h3>
              <p className="text-fg-muted">
                If you have any questions about this Privacy Policy, please contact us at:
                <br />
                <strong>Dewiride Technologies Private Limited</strong>
                <br />
                Website: <a href="https://dewiride.com" className="text-brand-text underline" target="_blank" rel="noopener noreferrer">https://dewiride.com</a>
                <br />
                Email: Contact us through our main website
              </p>
    </LegalPage>
  );
}
