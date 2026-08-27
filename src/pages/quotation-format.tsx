import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import InvoiceStudio, { StudioConfig } from '../components/InvoiceStudio';
import RelatedLinks from '../components/RelatedLinks';
import { Article, Faq, FaqList, GuideHero, faqSchema } from '../components/Article';
import { SITE_URL, breadcrumbs, jsonLd } from '../utils/schema';

const PATH = '/quotation-format/';

const CONFIG: StudioConfig = {
  docType: 'quotation',
  defaults: { currency: 'INR', tax: 18 },
  editorHint:
    'Headed QUOTATION, dated with a validity rather than a due date, and printed without a payment QR — a quote is not a demand for money.',
};

/**
 * The contract-law page.
 *
 * The only page on this site whose governing statute is the Indian Contract
 * Act rather than the CGST Act. It carries almost no GST content on purpose:
 * the tax questions belong to /proforma-invoice-format/ and
 * /gst-invoice-format/, and restating them here is what would make this page
 * a near-duplicate of both.
 */
const FAQS: readonly Faq[] = [
  {
    q: 'Is a quotation legally binding in India?',
    a: 'Usually not on its own. Under Section 2(a) of the Indian Contract Act 1872 a proposal is made when one person signifies a willingness with a view to obtaining assent. A bare statement of price in answer to an enquiry is generally an invitation to treat rather than an offer — the authority routinely applied is Harvey v Facey, where “Lowest price for Bumper Hall Pen £900” was held not to be an offer, so “We agree to buy” formed no contract. A quotation that sets out scope, quantity, delivery and payment terms and invites acceptance is much more likely to be a real offer.',
  },
  {
    q: 'What does a validity date actually do?',
    a: 'Section 6(1) of the Contract Act revokes a proposal by the lapse of the time prescribed in it for acceptance. Without a date, Section 6(2) revokes it after “a reasonable time”, which is undefined and decided after the fact — which is how a client resurfaces eight months later and purports to accept a price from before a rate change. Put a date on it.',
  },
  {
    q: 'Can I withdraw a quotation before the validity date?',
    a: 'Generally yes. Section 5 allows a proposal to be revoked at any time before the communication of acceptance is complete as against the proposer. India has no general firm-offer doctrine, so “valid for 30 days” does not by itself stop you withdrawing — but you must communicate the revocation, and doing it routinely is a good way to lose the client anyway.',
  },
  {
    q: 'The client sent a purchase order. Is that acceptance?',
    a: 'Only if it accepts your terms as they stand. Section 7 requires acceptance to be absolute and unqualified, so a PO that changes the price, scope, delivery date or payment terms is a counter-offer, not an acceptance. If you then start the work, Section 8 makes that performance your acceptance of their terms — so the contract is on the PO’s terms, not the quotation’s. Read the PO before you start.',
  },
  {
    q: 'Do I charge GST on a quotation?',
    a: 'No tax arises from issuing one. Sections 12(2) and 13(2) fix the time of supply by reference to the invoice and the payment, not to a quote. Show the tax so the client sees the real number, but state that it is charged at the rate applicable at the time of supply — Section 14 of the CGST Act, not your quotation, decides which rate applies, and the slabs moved on 22 September 2025. If money changes hands before you supply, a receipt voucher becomes due; see the proforma invoice page.',
  },
  {
    q: 'I am not GST-registered. Can I put 18% on my quote?',
    a: 'No. Section 32(1) of the CGST Act forbids a person who is not registered from collecting any amount by way of tax, and Section 76 makes anything collected recoverable by the department. Quote your price without a tax line.',
  },
  {
    q: 'Is an emailed quotation enforceable?',
    a: 'Yes. Section 10A of the Information Technology Act 2000 provides that a contract is not unenforceable merely because proposals, acceptances and revocations were communicated in electronic form. Email is fine; what matters is what the words say.',
  },
];

export default function QuotationFormat() {
  return (
    <>
      <Head>
        <title>Quotation Format — When a Quote Becomes a Contract (India)</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="What to put on a quotation, why the validity date is the most important line on it, and when a quote turns into a binding contract under the Indian Contract Act. Free quotation generator included."
        />
        <link rel="canonical" href={`${SITE_URL}${PATH}`} />
        <meta property="og:title" content="Quotation Format — When a Quote Becomes a Contract" />
        <meta
          property="og:description"
          content="Offer or invitation to treat, what a validity date does, and why a purchase order is often a counter-offer rather than an acceptance."
        />
        <meta property="og:url" content={`${SITE_URL}${PATH}`} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLd(breadcrumbs('Quotation format', PATH))}
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqSchema(FAQS))} />
      </Head>

      <InvoiceStudio
        config={CONFIG}
        hero={
          <GuideHero
            h1="Quotation format"
            lede="A quotation is the one document here that creates no tax event at all. Its risks are contractual: whether what you sent was an offer someone could simply accept, how long it stays open, and whether the purchase order that came back agreed to your terms or replaced them."
            points={['Indian Contract Act 1872', 'Validity date matters', 'No tax event']}
          />
        }
      >
        <Article title="What goes on a quotation" headingId="what">
          <p>
            Nothing in Indian tax law prescribes a format. Rule 46 of the CGST Rules governs the tax
            invoice and nothing else, so a quotation is whatever you make it &mdash; which means the
            content is a commercial decision rather than a compliance one. In practice a quotation
            that avoids arguments carries:
          </p>
          <ul>
            <li>
              <strong>A quotation number in its own series.</strong> Not from the invoice book: Rule
              46(b) requires that series to be consecutive and unique for the financial year, and
              numbers spent on quotes that never convert leave gaps in it.
            </li>
            <li>
              <strong>A validity date.</strong> The single most valuable line on the document. See
              below.
            </li>
            <li>
              <strong>Scope, and explicit exclusions.</strong> What is not included is what the
              argument will be about.
            </li>
            <li>
              <strong>Whether tax is extra or included</strong>, and at what rate, with the note
              that the rate applicable is the one in force at the time of supply.
            </li>
            <li>
              <strong>Payment terms</strong>, and what happens to the price if the schedule slips.
            </li>
          </ul>

          <h2>Offer, or invitation to treat?</h2>
          <p>
            Section 2(a) of the Indian Contract Act 1872: a proposal is made when &ldquo;one person
            signifies to another his willingness to do or to abstain from doing anything, with a
            view to obtaining the assent of that other to such act or abstinence.&rdquo;
          </p>
          <p>
            Whether your quotation is a proposal in that sense, or merely an invitation to treat,
            decides whether a one-line reply can bind you. The case Indian courts routinely apply is{' '}
            <em>Harvey v Facey</em> [1893] AC 552: a telegram answering an enquiry with
            &ldquo;Lowest price for Bumper Hall Pen &pound;900&rdquo; was held not to be an offer,
            so the reply &ldquo;We agree to buy&rdquo; formed no contract. A bare price in answer to
            a question is usually an invitation to treat. A document that sets out the scope, the
            quantity, the delivery and the payment terms and invites the client to accept looks very
            much like an offer &mdash; which is fine, as long as you intended it.
          </p>

          <h2>Why the validity date is the most important line</h2>
          <p>
            Section 6 of the Contract Act revokes a proposal &ldquo;by the lapse of the time
            prescribed in such proposal for its acceptance&rdquo;. That is what a validity date does:
            it makes the lapse automatic and certain.
          </p>
          <p>
            Leave it off and Section 6(2) applies instead &mdash; the proposal lapses after &ldquo;a
            reasonable time&rdquo;, an amount nobody can tell you in advance because it is decided
            afterwards, in hindsight, by whoever is resolving the dispute. That is the gap a client
            walks through when they resurface months later holding your old price, after your costs
            or the tax rate have moved.
          </p>
          <p>
            The generator on this page labels that field <strong>Valid until</strong> rather than
            &ldquo;due date&rdquo;, and prints it that way, because a quotation is not asking to be
            paid.
          </p>

          <h2>Can you take it back?</h2>
          <p>
            Section 5: a proposal may be revoked at any time before the communication of its
            acceptance is complete as against the proposer, but not afterwards. India has no general
            firm-offer doctrine &mdash; writing &ldquo;valid for 30 days&rdquo; does not, by itself,
            stop you withdrawing inside those thirty days. It does have to be communicated. A
            revocation the client never received is not a revocation.
          </p>

          <h2>The purchase order trap</h2>
          <p>
            This is where quotations actually cost people money. Section 7 requires acceptance to be
            &ldquo;absolute and unqualified&rdquo;. A purchase order that changes the price, the
            scope, the delivery date or the payment terms is therefore not an acceptance at all
            &mdash; it is a counter-offer, and your original quotation is dead.
          </p>
          <p>
            Then Section 8: &ldquo;Performance of the conditions of a proposal, or the acceptance of
            any consideration for a reciprocal promise which may be offered with a proposal, is an
            acceptance of the proposal.&rdquo; Starting work against that PO, or banking the advance
            that came with it, accepts <em>their</em> terms. Not yours. The contract you are now in
            is the one written on the purchase order, including the payment terms you did not read.
          </p>
          <p>
            The habit worth forming is dull and effective: compare the PO against the quotation
            line by line before anyone starts, and if it differs, say so in writing before you begin.
          </p>

          <h2>Email is enough</h2>
          <p>
            Section 10A of the Information Technology Act 2000 provides that where proposals,
            acceptances and revocations are expressed in electronic form, the contract is not
            unenforceable on that ground alone. A quotation sent and accepted by email is a
            contract. Nothing needs to be signed on paper.
          </p>

          <h2>The tax, briefly</h2>
          <p>
            No GST arises on issuing a quotation &mdash; the time of supply under Sections 12(2) and
            13(2) turns on the invoice and the payment, not on a quote. Two things follow. Do not
            promise a rate: Section 14 fixes the rate applicable at the time of supply, and the
            slabs changed on 22 September 2025, so &ldquo;price includes 18% GST&rdquo; honoured
            months later can be a real loss. And if the client pays before you supply, a receipt
            voucher becomes due &mdash;{' '}
            <Link href="/proforma-invoice-format/">that chain is set out here</Link>. When the work
            is done, the document you issue is a{' '}
            <Link href="/gst-invoice-format/">tax invoice</Link>.
          </p>
        </Article>

        <RelatedLinks currentPath={PATH} />
        <FaqList faqs={FAQS} />
      </InvoiceStudio>
    </>
  );
}
