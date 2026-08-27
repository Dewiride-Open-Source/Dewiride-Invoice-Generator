import React from 'react';
import Link from 'next/link';
import ContentPage from '../components/ContentPage';
import RelatedLinks from '../components/RelatedLinks';
import { Article, Faq, FaqList, GuideHero, faqSchema } from '../components/Article';
import { buttonClass } from '../components/fields';

const PATH = '/gst-invoice-format/';

/**
 * The reference page.
 *
 * Deliberately has no editor on it. It is the one page in the set whose job is
 * to be read rather than used, and it owns the Rule 46 material outright --
 * every other page links here rather than restating it, which is what keeps
 * the set from being five variations on one GST preamble.
 */
const FAQS: readonly Faq[] = [
  {
    q: 'How many fields does a GST invoice need?',
    a: 'Rule 46 lists particulars at clauses (a) to (s). Clauses (a) to (q) are the general case — seventeen items, not the “sixteen mandatory fields” repeated across most invoice blogs — and (r) and (s) apply only to businesses inside the e-invoicing net. Special-case suppliers such as banks, NBFCs, insurers, goods transport agencies and passenger transport operators follow Rule 54 instead, because Rule 46 opens with the words “subject to rule 54”.',
  },
  {
    q: 'Can I use a hash or an underscore in my invoice number?',
    a: 'No. Rule 46(b) permits alphabets, numerals, hyphen and slash, and nothing else. INV#0001, INV_2026_01 and ACME.2026.001 are all breaches, even though every accounting package will happily generate them and no portal rejects them at the point of issue. The same clause caps the number at sixteen characters including the hyphens and slashes, which is why a natural-looking DEWIRIDE/2026-27/00001 — twenty-one characters — is not allowed.',
  },
  {
    q: 'How many HSN digits do I have to show?',
    a: 'It depends on last year’s turnover, not on preference. Notification 78/2020-Central Tax requires four digits where aggregate turnover in the preceding financial year was up to ₹5 crore, and six digits above that. Since the Table 12 changes to GSTR-1 in 2025, the return will not accept a code that does not exist at the required length, so a short code surfaces as a filing failure rather than a quiet defect.',
  },
  {
    q: 'Do I have to sign a GST invoice?',
    a: 'Rule 46(q) requires a signature or digital signature of the supplier or an authorised representative. A proviso removes the requirement for an invoice issued electronically in accordance with the Information Technology Act 2000 — note that the exemption is framed around the IT Act, not around IRP e-invoices specifically. Most businesses print a signature anyway because the recipient’s accounts team expects one.',
  },
  {
    q: 'When must the invoice be issued?',
    a: 'For goods, Section 31(1) requires it before or at the time of removal where the supply involves movement, or of delivery otherwise — there is no thirty-day window for goods. For services, Rule 47 gives thirty days from the supply, extended to forty-five for insurers, banks and NBFCs. For a reverse-charge self-invoice from an unregistered supplier, Rule 47A has set a thirty-day limit since 1 November 2024; before that there was no statutory deadline at all.',
  },
  {
    q: 'What happens if the invoice is wrong?',
    a: 'Section 122(1) sets a penalty of ₹10,000 or the tax evaded, whichever is higher, for supplying without an invoice or issuing an incorrect or false one. The sharper risk is at the recipient’s end: a defective invoice puts their input tax credit in question, and that is the conversation that costs you the customer.',
  },
];

export default function GstInvoiceFormat() {
  return (
    <ContentPage
      title="GST invoice format"
      metaTitle="GST Invoice Format — What Rule 46 Actually Requires (2026)"
      description="A clause-by-clause reading of Rule 46 of the CGST Rules: every particular a tax invoice must carry, the 16-character serial number rule, HSN digit depth, signature, time limits and the November 2024 changes."
      path={PATH}
      schema={[faqSchema(FAQS)]}
      hero={
        <>
          <GuideHero
            h1="GST invoice format: what Rule 46 actually requires"
            lede="Most pages on this subject list “the 16 mandatory fields”. Rule 46 has clauses (a) to (s), the serial number rule bans characters nobody thinks twice about, and two things changed on 1 November 2024 that a lot of published guidance has not caught up with. This is the clause list, in order, with what each one means in practice."
            points={['CGST Rules 2017', 'Current to August 2026', 'No account needed']}
          />
          <Link href="/gst-invoice-generator/" className={`${buttonClass.primary} mt-6`}>
            Make a GST invoice now
          </Link>
        </>
      }
    >
      <Article title="The particulars, clause by clause" headingId="clauses">
        <p>
          Rule 46 of the Central Goods and Services Tax Rules 2017 opens{' '}
          <strong>&ldquo;subject to rule 54&rdquo;</strong>, which matters before anything else: if
          you are an Input Service Distributor, a bank, an NBFC, an insurer, a goods transport
          agency, a passenger transport operator or a multiplex, your invoice is governed by Rule 54
          and the list below is not yours. For everyone else, these are the particulars.
        </p>

        <table>
          <caption className="sr-only">Rule 46 particulars in clause order</caption>
          <thead>
            <tr>
              <th scope="col">Clause</th>
              <th scope="col">What it requires</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>(a)</td>
              <td>Supplier&rsquo;s name, address and GSTIN.</td>
            </tr>
            <tr>
              <td>(b)</td>
              <td>
                A consecutive serial number, at most sixteen characters, in one or multiple series,
                unique for the financial year. See below &mdash; this is the clause most often
                breached.
              </td>
            </tr>
            <tr>
              <td>(c)</td>
              <td>Date of issue.</td>
            </tr>
            <tr>
              <td>(d)</td>
              <td>Recipient&rsquo;s name, address and GSTIN or UIN, where they are registered.</td>
            </tr>
            <tr>
              <td>(e)</td>
              <td>
                Where the recipient is <em>unregistered</em> and the taxable value is ₹50,000 or
                more: their name and address, the address of delivery, and the State name and code.
              </td>
            </tr>
            <tr>
              <td>(f)</td>
              <td>
                The same details below ₹50,000, but only if the recipient asks for them. A proviso
                requires the recipient&rsquo;s State name regardless of value on online money
                gaming, and on services supplied through an e-commerce operator or by an OIDAR
                supplier to an unregistered person.
              </td>
            </tr>
            <tr>
              <td>(g)&ndash;(i)</td>
              <td>
                HSN code; description of the goods or services; quantity with the unique quantity
                code, for goods.
              </td>
            </tr>
            <tr>
              <td>(j)&ndash;(k)</td>
              <td>
                Total value of supply, and the taxable value <em>after</em> any discount or
                abatement.
              </td>
            </tr>
            <tr>
              <td>(l)&ndash;(m)</td>
              <td>Rate of tax per head &mdash; CGST, SGST, IGST, UTGST, cess &mdash; and the amount of each.</td>
            </tr>
            <tr>
              <td>(n)</td>
              <td>
                Place of supply with the State name, on an inter-State supply. This is the field
                that decides IGST against CGST + SGST.
              </td>
            </tr>
            <tr>
              <td>(o)&ndash;(p)</td>
              <td>
                Address of delivery where it differs from the place of supply; whether tax is
                payable on reverse charge.
              </td>
            </tr>
            <tr>
              <td>(q)</td>
              <td>Signature or digital signature of the supplier or an authorised representative.</td>
            </tr>
            <tr>
              <td>(r)&ndash;(s)</td>
              <td>
                Conditional. (r) is the QR code carrying the IRN, on an e-invoice. (s) is a
                declaration for a business that crossed the e-invoicing turnover threshold in some
                earlier year but is not required to e-invoice.
              </td>
            </tr>
          </tbody>
        </table>

        <h2>The serial number rule, which almost everyone breaks</h2>
        <p>
          Rule 46(b) requires &ldquo;a consecutive serial number not exceeding sixteen characters,
          in one or multiple series, containing alphabets or numerals or special characters- hyphen
          or dash and slash symbolised as &lsquo;-&rsquo; and &lsquo;/&rsquo; respectively, and any
          combination thereof, unique for a financial year.&rdquo;
        </p>
        <p>Three consequences, none of which any software enforces:</p>
        <ul>
          <li>
            <strong>Only two punctuation marks are legal.</strong> A hash, underscore, space, full
            stop, colon, comma, ampersand or bracket in the number is a breach. <code>INV#0001</code>,{' '}
            <code>INV_2026_01</code>, <code>INV 001</code> and <code>ACME.2026.001</code> all look
            entirely ordinary and all fail.
          </li>
          <li>
            <strong>Sixteen characters includes the punctuation.</strong>{' '}
            <code>DEWIRIDE/2026-27/00001</code> is twenty-one. Long client-code prefixes are the
            usual cause.
          </li>
          <li>
            <strong>&ldquo;Unique for a financial year&rdquo; means the series is per year.</strong>{' '}
            A single running number carried across years is the standard defect found in small
            business books.
          </li>
        </ul>
        <p>
          The same sixteen-character wording is repeated in Rule 49 for a bill of supply, Rule 53
          for revised invoices and credit or debit notes, and Rule 54 for an ISD invoice. The
          generator on this site flags both problems as you type, once a GSTIN tells it the document
          is a tax invoice.
        </p>
        <p>
          One useful thing hidden in that clause: <strong>&ldquo;in one or multiple series&rdquo;</strong>.
          That is the permission to keep quotations and proforma invoices in their own numbering,
          rather than burning tax invoice numbers on documents that may never convert. Every burned
          number leaves a gap in a series that is supposed to be consecutive, and a gap is what a
          scrutiny officer reads as a suppressed sale.
        </p>

        <h2>HSN depth is set by last year&rsquo;s turnover</h2>
        <p>
          Notification 78/2020-Central Tax, in force since 1 April 2021, requires four digits of
          HSN where aggregate turnover in the preceding financial year was up to ₹5 crore, and six
          digits above that. It is not a preference and it is not per invoice &mdash; it is a
          property of your business for the whole year. Since the Table 12 changes to GSTR-1, the
          return itself will not accept a code that does not exist at the required length, so a short
          code now surfaces as a filing failure rather than a quiet defect on a PDF.
        </p>

        <h2>When it has to be issued</h2>
        <ul>
          <li>
            <strong>Goods:</strong> Section 31(1) &mdash; before or at the time of removal, where
            the supply involves movement of goods; otherwise before or at delivery. There is no
            thirty-day window for goods, despite how often one is quoted.
          </li>
          <li>
            <strong>Services:</strong> Rule 47 &mdash; within thirty days of the supply of service.
            Forty-five days for an insurer, a banking company, or a financial institution including
            an NBFC.
          </li>
          <li>
            <strong>Reverse-charge self-invoices:</strong> Rule 47A, inserted with effect from 1
            November 2024, gives thirty days from receipt of the supply. Before that date there was
            no statutory deadline. The same amendment <em>removed</em> the proviso that allowed a
            consolidated monthly invoice for reverse-charge purchases from unregistered suppliers
            above ₹5,000 a day, so that route is gone.
          </li>
        </ul>

        <h2>When a tax invoice is the wrong document</h2>
        <ul>
          <li>
            <strong>Composition dealers and exempt supplies</strong> issue a{' '}
            <em>bill of supply</em> under Section 31(3)(c) and Rule 49 &mdash; which has no rate of
            tax and no tax amount, because none may be collected. Rule 5(1)(f) additionally requires
            the words &ldquo;composition taxable person, not eligible to collect tax on
            supplies&rdquo; at the top of every one.
          </li>
          <li>
            <strong>Supplies under ₹200</strong> to an unregistered recipient who does not ask for
            an invoice can be covered by a single consolidated invoice at the close of the day.
          </li>
          <li>
            <strong>Before the supply happens</strong>, the document is a{' '}
            <Link href="/proforma-invoice-format/">proforma invoice</Link> or a{' '}
            <Link href="/quotation-format/">quotation</Link>, and heading it &ldquo;Tax
            Invoice&rdquo; has real consequences.
          </li>
          <li>
            <strong>Moving goods without a supply</strong> &mdash; job work, goods on approval,
            batches &mdash; needs a{' '}
            <Link href="/delivery-challan-format/">delivery challan</Link> under Rule 55.
          </li>
        </ul>

        <h2>If you are inside the e-invoicing net, a PDF is not an invoice</h2>
        <p>
          This is the sharpest thing on this page. Rule 48(4) requires businesses whose aggregate
          turnover exceeded ₹5 crore in any financial year from 2017-18 onwards to report B2B, B2G,
          export, deemed export and SEZ invoices to an Invoice Registration Portal and obtain an
          IRN. Rule 48(5) then says that an invoice issued by such a person{' '}
          <strong>in any other manner &ldquo;shall not be treated as an invoice&rdquo;</strong>.
        </p>
        <p>
          Not &ldquo;attracts a penalty&rdquo; &mdash; is not an invoice. The recipient&rsquo;s
          input tax credit fails. No PDF generator, this one included, can produce an IRN, because
          only the IRP can issue one. Above that threshold, use your IRP route and treat any
          generator as a drafting tool. Businesses with turnover of ₹10 crore and above must also
          report each document to the IRP within thirty days of its date; the portal refuses later
          submissions outright.
        </p>

        <h2>Exports and SEZ supplies</h2>
        <p>
          An export or SEZ invoice carries an endorsement in place of the ordinary recipient block:
          either &ldquo;SUPPLY MEANT FOR EXPORT/SUPPLY TO SEZ UNIT OR SEZ DEVELOPER FOR AUTHORISED
          OPERATIONS ON PAYMENT OF INTEGRATED TAX&rdquo; or the equivalent wording &ldquo;UNDER BOND
          OR LETTER OF UNDERTAKING WITHOUT PAYMENT OF INTEGRATED TAX&rdquo;, and the details of the
          recipient are replaced by the name of the country of destination. The endorsement belongs
          on the tax invoice, never on the proforma that preceded it.
        </p>

        <h2>What a &ldquo;revised invoice&rdquo; is not</h2>
        <p>
          It is not a way to correct a mistake. Section 31(3)(a) and Rule 53 confine revised
          invoices to the gap between the effective date of your registration and the date the
          registration certificate was issued, within one month of that certificate, and require the
          words &ldquo;Revised Invoice&rdquo; prominently on the face. Corrections after the fact are
          made with a credit or debit note under Section 34.
        </p>
      </Article>

      <RelatedLinks currentPath={PATH} />
      <FaqList faqs={FAQS} />

      <section className="card mt-8 p-6 sm:p-10">
        <h2 className="text-2xl font-bold tracking-tight text-fg">Make one</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted">
          The generator fills in the Rule 46 fields, works out CGST + SGST or IGST from your state
          and the place of supply, and flags a serial number that breaks clause (b). It runs in your
          browser, so nothing you type is uploaded anywhere.
        </p>
        <Link href="/gst-invoice-generator/" className={`${buttonClass.primary} mt-6`}>
          Open the GST invoice generator
        </Link>
      </section>
    </ContentPage>
  );
}
