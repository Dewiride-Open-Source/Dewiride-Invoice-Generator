import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import InvoiceStudio, { StudioConfig } from '../components/InvoiceStudio';
import RelatedLinks from '../components/RelatedLinks';
import { Article, Faq, FaqList, GuideHero, faqSchema } from '../components/Article';
import { SITE_URL, breadcrumbs, jsonLd } from '../utils/schema';

const PATH = '/delivery-challan-format/';

const CONFIG: StudioConfig = {
  docType: 'delivery-challan',
  defaults: { currency: 'INR', tax: 0 },
  editorHint:
    'Headed DELIVERY CHALLAN and printed without a payment QR — a challan moves goods, it does not ask to be paid. Leave the tax rate at zero unless the movement is a supply to the consignee.',
};

/**
 * Rule 55, and the documents that travel with the goods.
 *
 * The only page in the set about a document that deliberately is not an
 * invoice, and the only one whose penalties are the transport ones -- Section
 * 122(1)(xiv) and the Section 129 detention regime -- rather than the
 * ordinary invoice-defect penalty that /gst-invoice-format/ owns.
 */
const FAQS: readonly Faq[] = [
  {
    q: 'When can I issue a delivery challan instead of an invoice?',
    a: 'Rule 55(1) lists exactly four cases: supply of liquid gas where the quantity at removal is not known; transportation of goods for job work; transportation of goods for reasons other than by way of supply; and such other supplies as the Board may notify. Anything outside those four is a supply, and a supply needs a tax invoice.',
  },
  {
    q: 'Do I put GST on a delivery challan?',
    a: 'Only if the movement is a supply to the consignee. Rule 55(1)(vii) requires the tax rate and tax amount “where the transportation is for supply to the consignee” — so on a job-work despatch or a branch transfer for storage there are no tax columns. Adding them to a non-supply movement misrepresents it and can be read as an unreported supply.',
  },
  {
    q: 'Do I still have to fill in a taxable value?',
    a: 'Yes, always. Rule 55(1)(vi) has no exception, and Explanation 2 to Rule 138(1) derives the e-way bill “consignment value” from the value declared in the invoice, bill of supply or delivery challan. Leaving it blank because no tax is being charged breaks the e-way bill rather than saving you a step.',
  },
  {
    q: 'How many copies, and what do they say?',
    a: 'Rule 55(2) requires triplicate in the case of supply of goods, with the copies marked in these exact words: ORIGINAL FOR CONSIGNEE, DUPLICATE FOR TRANSPORTER, TRIPLICATE FOR CONSIGNER. The markings are prescribed wording, not a convention — note that the third one is spelled “consigner” in the rule.',
  },
  {
    q: 'Does a job-work despatch need an e-way bill?',
    a: 'Usually yes, and the ₹50,000 threshold does not always help you. Rule 138(1)(ii) covers movement “for reasons other than supply”, and the third proviso to Rule 138(1) removes the threshold entirely for inter-State job work — the principal must generate an e-way bill however small the consignment. “No sale is happening” is not an exemption.',
  },
  {
    q: 'How long can goods stay with a job worker?',
    a: 'Section 143(1) gives one year for inputs and three years for capital goods from the date they were sent out, within which they must come back or be supplied from the job worker’s premises. Moulds, dies, jigs, fixtures and tools are outside those clocks. The challans in both directions are reported in FORM GST ITC-04 under Rule 45(3).',
  },
  {
    q: 'What happens if goods move without the right document?',
    a: 'Section 122(1)(xiv) penalises transporting taxable goods without the cover of the specified documents, and Section 129 allows the goods and the conveyance to be detained, with release against a penalty geared to the tax involved. This is a roadside problem rather than a filing one, which is what makes it more expensive than it looks.',
  },
];

export default function DeliveryChallanFormat() {
  return (
    <>
      <Head>
        <title>Delivery Challan Format — Rule 55, Job Work and E-Way Bills</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="When Rule 55 lets you move goods on a delivery challan instead of a tax invoice, the nine particulars it must carry, the exact triplicate markings, and how it connects to the e-way bill and ITC-04."
        />
        <link rel="canonical" href={`${SITE_URL}${PATH}`} />
        <meta property="og:title" content="Delivery Challan Format — Rule 55, Job Work and E-Way Bills" />
        <meta
          property="og:description"
          content="The four cases where a challan replaces an invoice, its nine particulars, and the triplicate markings the rule actually prescribes."
        />
        <meta property="og:url" content={`${SITE_URL}${PATH}`} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLd(breadcrumbs('Delivery challan format', PATH))}
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqSchema(FAQS))} />
      </Head>

      <InvoiceStudio
        config={CONFIG}
        hero={
          <GuideHero
            h1="Delivery challan format"
            lede="Goods move for plenty of reasons that are not sales — to a job worker, between your own branches, out on approval, in batches against one invoice. Rule 55 is the document that covers those movements, and it is deliberately not an invoice: no payment is being asked for, and often no tax is being charged."
            points={['CGST Rule 55', 'Triplicate', 'Job work and e-way bills']}
          />
        }
      >
        <Article title="The four cases Rule 55 covers" headingId="cases">
          <p>
            Rule 55(1) of the CGST Rules permits the consigner to issue a delivery challan in lieu
            of an invoice, at the time of removal of goods for transportation, in exactly four
            situations:
          </p>
          <ol>
            <li>
              <strong>Liquid gas</strong>, where the quantity at the time of removal from the
              supplier&rsquo;s place of business is not known.
            </li>
            <li>
              <strong>Transportation of goods for job work.</strong>
            </li>
            <li>
              <strong>Transportation of goods for reasons other than by way of supply</strong> —
              branch transfers for storage, exhibition stock, goods going out for repair, equipment
              to a site.
            </li>
            <li>
              <strong>Such other supplies as may be notified</strong> by the Board.
            </li>
          </ol>
          <p>
            That list is exhaustive. If what is happening is a supply to the person receiving the
            goods, the document is a{' '}
            <Link href="/gst-invoice-format/">tax invoice</Link>, and a challan does not substitute
            for it.
          </p>

          <h2>The nine particulars</h2>
          <p>Rule 55(1) prescribes these, and no others:</p>
          <table>
            <caption className="sr-only">Rule 55(1) particulars</caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Particular</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>(i)</td>
                <td>Date and number of the delivery challan.</td>
              </tr>
              <tr>
                <td>(ii)</td>
                <td>Name, address and GSTIN of the consigner, if registered.</td>
              </tr>
              <tr>
                <td>(iii)</td>
                <td>Name, address and GSTIN or UIN of the consignee, if registered.</td>
              </tr>
              <tr>
                <td>(iv)</td>
                <td>HSN code and description of the goods.</td>
              </tr>
              <tr>
                <td>(v)</td>
                <td>
                  Quantity &mdash; <em>provisional</em>, where the exact quantity being supplied is
                  not known. This is what makes the liquid-gas case work.
                </td>
              </tr>
              <tr>
                <td>(vi)</td>
                <td>Taxable value. Required in every case, including where no tax is charged.</td>
              </tr>
              <tr>
                <td>(vii)</td>
                <td>
                  Tax rate and tax amount per head &mdash;{' '}
                  <strong>only where the transportation is for supply to the consignee</strong>.
                </td>
              </tr>
              <tr>
                <td>(viii)</td>
                <td>Place of supply, in the case of inter-State movement.</td>
              </tr>
              <tr>
                <td>(ix)</td>
                <td>Signature.</td>
              </tr>
            </tbody>
          </table>
          <p>
            One difference from an invoice worth knowing: the numbering rule here is looser. Rule
            55(1) asks only for a serial number of at most sixteen characters, in one or multiple
            series. It does not import Rule 46(b)&rsquo;s restriction to letters, digits, hyphen and
            slash, nor the requirement that the number be unique for the financial year.
          </p>

          <h2>Three copies, with prescribed wording</h2>
          <p>
            Rule 55(2) requires the challan to be prepared in triplicate in the case of supply of
            goods, and the copies to be marked in these words:
          </p>
          <ul>
            <li>
              original &mdash; <strong>ORIGINAL FOR CONSIGNEE</strong>
            </li>
            <li>
              duplicate &mdash; <strong>DUPLICATE FOR TRANSPORTER</strong>
            </li>
            <li>
              triplicate &mdash; <strong>TRIPLICATE FOR CONSIGNER</strong>
            </li>
          </ul>
          <p>
            That is prescribed wording rather than a convention, down to the rule&rsquo;s own
            spelling of &ldquo;consigner&rdquo;. Print the challan three times and mark the copies.
          </p>

          <h2>The document that travels with the goods</h2>
          <p>
            Rule 138A(1) requires the person in charge of the conveyance to carry the invoice, bill
            of supply or delivery challan as the case may be, together with the e-way bill in
            physical or electronic form. Rule 55(3) then requires a challan issued in lieu of an
            invoice to be declared in Part A of FORM GST EWB-01.
          </p>
          <p>
            The trap is the threshold. An e-way bill is required for movement &ldquo;for reasons
            other than supply&rdquo; above a ₹50,000 consignment value under Rule 138(1)(ii) &mdash;
            but the third proviso to Rule 138(1) removes the threshold altogether for{' '}
            <strong>inter-State job work</strong>: the principal generates one however small the
            consignment. Skipping it because no sale is happening is the mistake that produces a
            detention.
          </p>
          <p>
            Two narrower points that come up constantly. Rule 138(14)(n) exempts a movement of up to
            20&nbsp;km to or from a weighbridge for weighment &mdash; but only if it is accompanied
            by a delivery challan. And since 1 January 2025 an e-way bill cannot be generated
            against a base document dated more than 180 days earlier, so an old challan cannot be
            resurrected to move goods.
          </p>

          <h2>Job work: the clock and the return</h2>
          <p>
            Rule 45(1) requires inputs, semi-finished goods or capital goods to go to a job worker
            under cover of a challan issued by the principal, including where the goods are sent
            straight to the job worker from a supplier. Where goods move on from one job worker to
            another, that challan can be endorsed rather than re-issued.
          </p>
          <p>
            Section 143(1) sets the clock: inputs must return, or be supplied from the job
            worker&rsquo;s premises, within <strong>one year</strong>; capital goods within{' '}
            <strong>three years</strong>. Moulds and dies, jigs and fixtures, and tools are outside
            those limits. Rule 45(3) requires the challans in both directions to be reported in{' '}
            <strong>FORM GST ITC-04</strong>.
          </p>

          <h2>When an invoice has to follow</h2>
          <ul>
            <li>
              <strong>Rule 55(4):</strong> where goods moved on a challan turn out to have been for
              supply to the recipient and the invoice could not be issued at the time of removal,
              the supplier issues the tax invoice after delivery.
            </li>
            <li>
              <strong>Rule 55(5) &mdash; SKD, CKD or batches:</strong> issue the complete invoice
              before the first consignment leaves, then a delivery challan for each subsequent
              consignment referring back to that invoice, with copies of the invoice travelling with
              them.
            </li>
            <li>
              <strong>Section 31(7) &mdash; sale or return:</strong> goods sent on approval need an
              invoice before or at the time of supply, or six months from removal, whichever is
              earlier.
            </li>
          </ul>

          <h2>The penalties are the transport ones</h2>
          <p>
            Moving goods without the prescribed documents is its own offence under Section
            122(1)(xiv), and Section 129 allows the goods and the conveyance to be detained, with
            release against a penalty geared to the tax involved. That is a very different exposure
            from an invoice with a missing field: it happens at the roadside, to a loaded vehicle,
            with the customer waiting.
          </p>
        </Article>

        <RelatedLinks currentPath={PATH} />
        <FaqList faqs={FAQS} />
      </InvoiceStudio>
    </>
  );
}
