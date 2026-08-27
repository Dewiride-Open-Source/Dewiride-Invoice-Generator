import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import InvoiceStudio, { StudioConfig } from '../components/InvoiceStudio';
import RelatedLinks from '../components/RelatedLinks';
import { Article, Faq, FaqList, GuideHero, faqSchema } from '../components/Article';
import { SITE_URL, breadcrumbs, jsonLd } from '../utils/schema';

const PATH = '/gst-invoice-generator/';

/**
 * Module scope on purpose: InvoiceStudio captures the config on its first
 * render, and a fresh literal on every render would be a new object each time.
 */
const CONFIG: StudioConfig = {
  docType: 'invoice',
  defaults: { currency: 'INR', tax: 18 },
  editorHint:
    'Add your GSTIN and the place of supply and the CGST + SGST or IGST split is worked out for you. Nothing is uploaded.',
};

/**
 * The transactional page. Its subject is the artefact and the tool, not the
 * law -- /gst-invoice-format/ owns Rule 46 and this page links to it rather
 * than restating it. The one piece of law here is the e-invoicing disclaimer,
 * because that is a fact about what this PDF is and is not.
 */
const FAQS: readonly Faq[] = [
  {
    q: 'Is this an e-invoice? Will it give me an IRN?',
    a: 'No, and this matters. If your aggregate turnover has exceeded ₹5 crore in any financial year since 2017-18, Rule 48(4) requires your B2B, B2G, export and SEZ invoices to be registered with an Invoice Registration Portal, and Rule 48(5) says an invoice issued any other way “shall not be treated as an invoice” — your customer’s input tax credit fails. Only the IRP can issue an IRN, so no PDF generator can. Above that threshold, use your IRP route and treat this as a drafting tool.',
  },
  {
    q: 'Is there a limit on how many invoices I can make?',
    a: 'No. There is no account, no invoice count and no watermark on the PDF, because there is no server cost that scales with your usage — the PDF is built by your own browser. The only limit is the fifty most recent invoices kept in the “Saved invoices” list, and that is a storage cap on your device, not a plan.',
  },
  {
    q: 'Do I have to sign up or give an email address?',
    a: 'No. There is nothing to sign up for. Nothing you type is sent anywhere: the page is a static file, the calculations run in your browser, and the PDF is rendered on your device. You can confirm it — load this page, turn your Wi-Fi off, fill in the form and download the PDF. It works.',
  },
  {
    q: 'I am not GST-registered. Can I still use this?',
    a: 'Yes. Leave the GSTIN fields blank and it produces an ordinary invoice with no tax split and no “TAX INVOICE” heading. Do not add a GST line if you are not registered — Section 32(1) of the CGST Act forbids an unregistered person collecting anything by way of tax, and Section 76 makes the amount recoverable.',
  },
  {
    q: 'What does the QR code on the invoice do?',
    a: 'It is a UPI payment link, so your client can scan and pay the exact total. It is not the IRN QR that Rule 46(r) requires on an e-invoice, and it is not the GST B2C dynamic QR — those are different codes carrying different payloads. You can build one on its own with the UPI QR generator.',
  },
  {
    q: 'Which GST rate should I pick?',
    a: 'The slabs changed on 22 September 2025: 12% and 28% were withdrawn for most goods, leaving 5%, 18% and a 40% rate for sin and luxury goods, with narrow survivals such as 12% on bricks and 3% on gold and silver. The GST calculator page sets out the current schedule.',
  },
];

export default function GstInvoiceGenerator() {
  return (
    <>
      <Head>
        <title>GST Invoice Generator — Free, No Signup, Runs in Your Browser</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Create a GST tax invoice with the CGST + SGST or IGST split worked out from your state and the place of supply. No account, no invoice limit, no watermark — the PDF is built in your browser."
        />
        <link rel="canonical" href={`${SITE_URL}${PATH}`} />
        <meta property="og:title" content="GST Invoice Generator — Free, No Signup" />
        <meta
          property="og:description"
          content="A GST tax invoice with the tax split worked out, generated entirely in your browser. No account, no limit, nothing uploaded."
        />
        <meta property="og:url" content={`${SITE_URL}${PATH}`} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLd(breadcrumbs('GST invoice generator', PATH))}
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqSchema(FAQS))} />
      </Head>

      <InvoiceStudio
        config={CONFIG}
        hero={
          <GuideHero
            h1="GST invoice generator"
            lede="Fill in the form and get a tax invoice in the Rule 46 format: both GSTINs, place of supply, HSN or SAC per line, the CGST + SGST or IGST split worked out from the two states, and the total in words. No account, no invoice limit, and nothing leaves your browser."
            points={[
              'No signup',
              'Unlimited invoices',
              'No watermark',
              'Works offline once loaded',
            ]}
          />
        }
      >
        <Article title="How this one is different" headingId="how">
          <p>
            Almost every free invoice tool is a website with a database behind it. You make an
            account, your invoice is posted to their server, a PDF comes back, and the free tier
            runs out at some number of documents or puts the vendor&rsquo;s name on your invoice.
            That is a reasonable business &mdash; servers cost money.
          </p>
          <p>
            This one has no server. The page is a static file on a CDN, the arithmetic runs in
            JavaScript on your machine, and the PDF is rendered by your own browser. There is no
            backend that <em>could</em> receive an invoice, which is why there is no account, no
            cap, and no upsell.
          </p>
          <p>
            <strong>You can check that claim in ten seconds.</strong> Let this page finish loading,
            switch your Wi-Fi or mobile data off, then fill in the form and press Download as PDF.
            It works, because everything needed to build the file is already on your device. No tool
            that renders PDFs on a server can do that.
          </p>

          <h2>What it fills in for you</h2>
          <ul>
            <li>
              <strong>The tax split.</strong> Enter the state you supply from and the place of
              supply, and it applies CGST + SGST at half the rate each when they match, or IGST at
              the full rate when they do not. Each half is computed independently against the
              taxable value rather than by halving one figure, so the two printed amounts are each
              correct rather than differing by a paisa.
            </li>
            <li>
              <strong>Your state, from your GSTIN.</strong> The first two digits of a GSTIN are the
              state code, so typing the GSTIN fills the state in. The GSTIN itself is checked
              against its own checksum digit &mdash; a transposed pair inside a fifteen-character
              code passes any format check and is invisible to a human proofreader.
            </li>
            <li>
              <strong>The serial number rule.</strong> Once a GSTIN says the document is a tax
              invoice, the number field flags anything Rule 46(b) does not allow: more than sixteen
              characters, or any punctuation other than a hyphen and a slash.{' '}
              <Link href="/gst-invoice-format/">Why that rule exists</Link>.
            </li>
            <li>
              <strong>Discounts before tax, and the amount in words.</strong> A per-line discount is
              deducted from the taxable value, which is what Section 15(3) requires when the
              discount is recorded on the invoice. The total is written out underneath in the Indian
              system &mdash; lakh and crore, with paise.
            </li>
            <li>
              <strong>A UPI QR</strong> carrying your VPA, the exact total and the invoice number as
              the payment note, so the client scans instead of copying an account number.
            </li>
          </ul>

          <h2>What it deliberately does not do</h2>
          <ul>
            <li>
              <strong>It cannot produce an IRN or a signed e-invoice.</strong> Only an Invoice
              Registration Portal can. See the first question below &mdash; above ₹5 crore turnover
              this is the difference between an invoice and a document that is legally not one.
            </li>
            <li>
              <strong>It does not file anything.</strong> No GSTR-1, no portal connection, no
              GSTIN verification against the GST network. Nothing here talks to a network at all.
            </li>
            <li>
              <strong>It does not claim to make you compliant.</strong> It produces a document in
              the Rule 46 format. Whether a given invoice is compliant depends on your registration,
              your rates and your filings, which are not things a form can know.
            </li>
          </ul>

          <h2>Where your invoices are kept</h2>
          <p>
            In your browser, on your device. The draft you are working on survives a refresh, the
            fifty most recent finished invoices are kept in IndexedDB so you can reopen or duplicate
            one, and the businesses, clients and item descriptions you reuse are remembered for
            autocomplete. All of it is inspectable and deletable from the buttons in the header.
            Clearing your browser data clears it, and it does not follow you to another device
            &mdash; that is the trade for nothing being uploaded.
          </p>
        </Article>

        <RelatedLinks currentPath={PATH} />
        <FaqList faqs={FAQS} />
      </InvoiceStudio>
    </>
  );
}
