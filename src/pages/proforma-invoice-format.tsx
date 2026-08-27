import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import InvoiceStudio, { StudioConfig } from '../components/InvoiceStudio';
import RelatedLinks from '../components/RelatedLinks';
import { Article, Faq, FaqList, GuideHero, faqSchema } from '../components/Article';
import { SITE_URL, breadcrumbs, jsonLd } from '../utils/schema';

const PATH = '/proforma-invoice-format/';

const CONFIG: StudioConfig = {
  docType: 'proforma',
  defaults: { currency: 'INR', tax: 18 },
  editorHint:
    'Numbered in its own series, headed PROFORMA INVOICE, and printed with the caveat that it is not a tax invoice.',
};

/**
 * The money-and-export page.
 *
 * Owns the advance-payment chain: what a proforma is not, what document is
 * actually due when the client pays against it, and how it hands over to a tax
 * invoice. It says nothing about when an offer lapses -- that is the
 * quotation page's subject, and two pages explaining offer and acceptance is
 * how a set of guides turns into a set of near-duplicates.
 */
const FAQS: readonly Faq[] = [
  {
    q: 'Is a proforma invoice legal in India?',
    a: 'It is a perfectly ordinary commercial document, but GST law does not recognise it. Section 2(66) of the CGST Act defines “invoice” exhaustively as the tax invoice referred to in Section 31, and the words “proforma invoice” appear nowhere in Section 31 or in Rules 46 to 51 — the entire invoicing chapter. There is no prescribed format, no prescribed numbering and nothing to file. That is the point of it: it carries no tax consequence.',
  },
  {
    q: 'Do I charge GST on a proforma invoice?',
    a: 'You show the tax that will be charged, so the buyer knows the real number, but no GST becomes payable because you issued it. The liability is triggered by the supply or, for services, by the money — not by the document.',
  },
  {
    q: 'Can my client claim input tax credit on a proforma invoice?',
    a: 'No. Rule 36(1) lists exhaustively the documents input tax credit may be availed on: a Section 31 invoice, a reverse-charge self-invoice, a debit note under Section 34, a bill of entry, and an ISD invoice. A proforma is none of them. This is the single most common misuse, because a proforma looks like an invoice and a buyer’s accounts team books it as one.',
  },
  {
    q: 'The client paid against the proforma. What do I issue now?',
    a: 'A receipt voucher. Section 31(3)(d) requires one on receipt of an advance, and Rule 50 sets out its particulars. Its proviso covers exactly the situation a proforma is usually in: where the rate of tax is not determinable the tax is to be paid at 18%, and where the nature of supply is not determinable it is to be treated as inter-State. The proforma itself does not satisfy Section 31(3)(d), so issuing nothing else leaves a gap.',
  },
  {
    q: 'Does an advance attract GST?',
    a: 'For services, yes. Section 13(2)(a) fixes the time of supply as the earlier of the invoice date or the date of receipt of payment, so the advance is taxable when it arrives. For goods, no — Notification 66/2017-Central Tax relieved registered persons who have not opted for composition from paying tax on advances for goods, so the liability waits for the supply.',
  },
  {
    q: 'Can I present a proforma invoice under a letter of credit?',
    a: 'No. ISBP 745 paragraph C1(a) states that an invoice presented under a documentary credit is not to be identified as “provisional”, “pro-forma” or the like, and UCP 600 article 18 governs the commercial invoice. The proforma’s role in a letter-of-credit transaction is upstream: it is what the buyer takes to their bank to have the credit opened.',
  },
  {
    q: 'Should proforma invoices use my invoice numbers?',
    a: 'No — give them their own series. Rule 46(b) requires the tax invoice series to be consecutive and unique for the financial year, and it expressly permits “one or multiple series”. Every number spent on a proforma that never converts leaves a hole in a sequence that is supposed to have none.',
  },
];

export default function ProformaInvoiceFormat() {
  return (
    <>
      <Head>
        <title>Proforma Invoice Format — What It Is, and What It Is Not (India)</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="A proforma invoice creates no GST liability and no input tax credit. What to put on one, what document is due when the client pays against it, and how it hands over to a tax invoice. Free generator included."
        />
        <link rel="canonical" href={`${SITE_URL}${PATH}`} />
        <meta property="og:title" content="Proforma Invoice Format — What It Is, and What It Is Not" />
        <meta
          property="og:description"
          content="No GST liability, no input tax credit, no prescribed format. What a proforma invoice is for, and what has to follow it."
        />
        <meta property="og:url" content={`${SITE_URL}${PATH}`} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLd(breadcrumbs('Proforma invoice format', PATH))}
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqSchema(FAQS))} />
      </Head>

      <InvoiceStudio
        config={CONFIG}
        hero={
          <GuideHero
            h1="Proforma invoice format"
            lede="A proforma invoice is an offer with a price on it. GST law does not recognise the document at all — which is exactly why it is useful, and exactly why heading it wrongly, numbering it wrongly, or taking money against it without issuing anything else causes the problems it does."
            points={['No GST payable', 'No input tax credit', 'Its own number series']}
          />
        }
      >
        <Article title="What a proforma invoice actually is" headingId="what">
          <p>
            Section 2(66) of the CGST Act defines the word exhaustively: &ldquo;&lsquo;invoice&rsquo;
            or &lsquo;tax invoice&rsquo; means the tax invoice referred to in section 31.&rdquo; A
            proforma invoice is not one. The expression does not appear in Section 31, or in Rules
            46, 47, 47A, 48, 49, 50 or 51 &mdash; the whole invoicing chapter. There is no
            prescribed format, no prescribed numbering rule, and nothing to file.
          </p>
          <p>
            It is a commercial document with a settled meaning and no statutory identity, used for
            four things: quoting a firm price with the tax shown, getting an advance released,
            giving a buyer something to raise a purchase order against, and supporting an
            application to open a letter of credit or clear customs.
          </p>

          <h2>The four things that go wrong</h2>

          <h3>1. Heading it &ldquo;Invoice&rdquo;</h3>
          <p>
            Because Section 2(66) reads &ldquo;invoice&rdquo; as the Section 31 tax invoice, a
            document headed that way is read as one. The time of supply can then be pulled forward
            to the date on it, and a document issued without an actual supply is its own offence
            under Section 122(1)(ii). Head it{' '}
            <strong>PROFORMA INVOICE</strong> &mdash; which is what the generator on this page
            prints, along with a line stating that it is not a tax invoice and that no credit may be
            claimed against it.
          </p>

          <h3>2. Numbering it from the invoice book</h3>
          <p>
            Rule 46(b) requires the tax invoice serial number to be consecutive and unique for the
            financial year. Every number burned on a proforma that never converts leaves a gap in
            that sequence, and a gap in an invoice series is what a scrutiny officer reads as a
            suppressed sale. The same clause permits &ldquo;one or multiple series&rdquo;, which is
            the licence to run <code>PI-2026-001</code> separately from{' '}
            <code>INV-2026-001</code>. This tool keeps a separate running number for each document
            type for that reason.
          </p>

          <h3>3. Letting the client claim credit against it</h3>
          <p>
            Rule 36(1) lists exhaustively what input tax credit may be availed on: a Section 31
            invoice, a Section 31(3)(f) self-invoice for reverse charge, a debit note under Section
            34, a bill of entry, and an ISD invoice. A proforma is none of these. It happens anyway,
            because a proforma looks like an invoice, and the credit is then reversible with
            interest.
          </p>

          <h3>4. Taking the advance and issuing nothing else</h3>
          <p>
            This is the one with a real deadline attached. When money arrives before the supply,
            Section 31(3)(d) requires a <strong>receipt voucher</strong>, and Rule 50 sets its
            particulars &mdash; supplier and recipient details, description, amount of advance, rate
            of tax, amount of tax, and whether tax is payable on reverse charge. The proforma does
            not satisfy that requirement.
          </p>
          <p>Rule 50&rsquo;s proviso is written for exactly this moment:</p>
          <ul>
            <li>
              where the <strong>rate of tax is not determinable</strong>, the tax is to be paid at{' '}
              <strong>18%</strong>;
            </li>
            <li>
              where the <strong>nature of supply is not determinable</strong>, it is to be treated
              as an <strong>inter-State</strong> supply.
            </li>
          </ul>
          <p>
            If the deal then collapses and no supply is made, Section 31(3)(e) and Rule 51 provide
            the way back out: a <strong>refund voucher</strong>, carrying the number and date of the
            receipt voucher it reverses.
          </p>

          <h2>Whether the advance itself is taxable</h2>
          <p>
            It depends on what you are supplying, and the two answers are opposite.
          </p>
          <ul>
            <li>
              <strong>Services &mdash; yes.</strong> Section 13(2)(a) makes the time of supply the
              earlier of the invoice date and the date of receipt of payment. The money arriving is
              the taxable event.
            </li>
            <li>
              <strong>Goods &mdash; no.</strong> Notification 66/2017-Central Tax relieved
              registered persons who have not opted for the composition levy from paying tax on
              advances received for goods. The liability waits for the supply.
            </li>
          </ul>

          <h2>Exports and letters of credit</h2>
          <p>
            A proforma is the standard document a buyer takes to their bank to have a letter of
            credit opened, and it supports advance remittance and customs pre-clearance. What it
            cannot do is be presented <em>under</em> the credit: ISBP 745 paragraph C1(a) says an
            invoice presented under a documentary credit is not to be identified as
            &ldquo;provisional&rdquo;, &ldquo;pro-forma&rdquo; or the like, and UCP 600 article 18
            governs the commercial invoice that is presented instead.
          </p>
          <p>
            The export endorsement &mdash; the &ldquo;SUPPLY MEANT FOR EXPORT&hellip;&rdquo; wording
            required by a proviso to Rule 46 &mdash; belongs on the tax invoice, not on the proforma
            that preceded it.{' '}
            <Link href="/gst-invoice-format/">The tax invoice requirements are here</Link>.
          </p>

          <h2>The handover</h2>
          <p>
            A proforma has no deadline. The tax invoice that replaces it does, and the clock is not
            started by the proforma:
          </p>
          <ul>
            <li>
              <strong>Goods:</strong> before or at the time of removal where the supply involves
              movement, or of delivery otherwise (Section 31(1)).
            </li>
            <li>
              <strong>Services:</strong> within thirty days of the supply (Rule 47).
            </li>
          </ul>
          <p>
            The practical route is: proforma &rarr; receipt voucher when money arrives &rarr; tax
            invoice when the supply happens, adjusting the advance. Keep the proforma out of your
            books as revenue while that is in progress. Posting it to sales inflates turnover,
            breaks the reconciliation between GSTR-1 and the books, and can push a business over a
            threshold it has not actually crossed.
          </p>

          <h2>Proforma or quotation?</h2>
          <p>
            A proforma is what you send when the deal is essentially agreed and money or shipping
            documents are about to move. A <Link href="/quotation-format/">quotation</Link> is what
            you send when you are still competing for the work, and it is governed by contract law
            rather than tax law &mdash; when it expires, and when it turns into a binding agreement,
            are the questions that matter there.
          </p>
        </Article>

        <RelatedLinks currentPath={PATH} />
        <FaqList faqs={FAQS} />
      </InvoiceStudio>
    </>
  );
}
