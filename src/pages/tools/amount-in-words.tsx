import React from 'react';
import Link from 'next/link';
import ContentPage from '../../components/ContentPage';
import RelatedLinks from '../../components/RelatedLinks';
import AmountWordsTool from '../../components/tools/AmountWordsTool';
import { Article, Faq, FaqList, GuideHero, faqSchema } from '../../components/Article';

const PATH = '/tools/amount-in-words/';

/**
 * The page whose best material is a negative finding: the amount in words is
 * not required on a GST invoice at all. It is required on a cheque, where the
 * Negotiable Instruments Act makes the words beat the figures -- which is the
 * distinction nobody draws.
 */
const FAQS: readonly Faq[] = [
  {
    q: 'Is the amount in words compulsory on a GST invoice?',
    a: 'No. Rule 46 lists the particulars of a tax invoice at clauses (a) to (s) and none of them is the amount in words; Rule 49 for a bill of supply and Rule 50 for a receipt voucher are the same. The GST e-invoice schema has no field for it either — the value block is numeric throughout. It is near-universal practice because it is a useful check, not because a rule requires it.',
  },
  {
    q: 'Where do the words actually matter, then?',
    a: 'On a cheque. Section 18 of the Negotiable Instruments Act 1881 is unambiguous: “If the amount undertaken or ordered to be paid is stated differently in figures and in words, the amount stated in words shall be the amount undertaken or ordered to be paid.” The words win. RBI’s cheque-clearing terminology reflects this — the figures are the “courtesy amount” and the words are the “legal amount”.',
  },
  {
    q: 'Why does my software write “One Million” instead of “Ten Lakh”?',
    a: 'Because it is using the international scale. Most off-the-shelf number-to-words routines group digits in threes, so ₹12,34,567 comes out as “One Million Two Hundred Thirty-Four Thousand Five Hundred Sixty-Seven”. The Indian system groups 2-2-3 and uses lakh and crore. This converter uses the Indian system for rupees and the international one for every other currency, matching the way the figures are grouped in each.',
  },
  {
    q: 'Why is “Only” written at the end?',
    a: 'It terminates the amount. Without it — and without a line filling the remaining space — there is room for someone to write more words after yours. It is a fraud control, which is why it survives on cheques long after it stopped being necessary anywhere else.',
  },
  {
    q: 'How should I write paise?',
    a: 'Spell them out and say so: “Rupees One Lakh Eighteen Thousand and Fifty Paise Only”. For other currencies this tool writes the fractional part as a fraction of the minor unit — “USD One Thousand Two Hundred Thirty-Four and 56/100 Only” — which is the international convention and avoids inventing a plural for a sub-unit name.',
  },
  {
    q: 'Why does it use the currency code and not the currency name?',
    a: 'Because pluralising a currency name is a trap. A naive “name plus s” prints “Japanese Yens” on someone’s invoice, and yen has no plural. The ISO 4217 code is unambiguous and is what a foreign bank expects to read. The number of decimal places follows the code too: the yen has none, the Kuwaiti dinar has three, so “and 56/100” would be wrong for both.',
  },
  {
    q: 'If I round the invoice total, do the words change?',
    a: 'Yes, and this is the one that causes real trouble. If you round the tax or the total to the nearest rupee, the words must follow the rounded figure. A figure, a words line and a GSTR-1 entry that disagree with each other is a reconciliation problem that surfaces months later.',
  },
];

export default function AmountInWordsPage() {
  return (
    <ContentPage
      title="Amount in words"
      metaTitle="Rupees in Words Converter — Lakh and Crore, with Paise"
      description="Convert an amount into words in the Indian system — lakh and crore, with paise — for a cheque or an invoice. Also covers whether Rule 46 requires it at all, and where the words legally beat the figures."
      path={PATH}
      schema={[faqSchema(FAQS)]}
      hero={
        <GuideHero
          h1="Amount in words"
          lede="Rupees written out in the Indian system, with paise, ready to copy onto a cheque or an invoice. It is the same converter that prints the line under the totals on every invoice this site generates."
          points={['Lakh and crore', 'Paise spelled out', '150+ currencies']}
        />
      }
    >
      <AmountWordsTool />

      <Article title="Where the words matter, and where they do not" headingId="where">
        <h2>Not on a GST invoice</h2>
        <p>
          This surprises people, so it is worth stating plainly. Rule 46 of the CGST Rules lists
          every particular a tax invoice must carry, at clauses (a) to (s). The amount in words is
          not among them. Rule 49 for a bill of supply and Rule 50 for a receipt voucher are the
          same, and the GST e-invoice schema has no field for it either &mdash; its value block is
          numeric from end to end.
        </p>
        <p>
          Every one of those lists is exhaustive, so this is a real negative finding rather than an
          omission. The line appears on almost every Indian invoice because it is a useful
          cross-check on a typo, and because the recipient&rsquo;s accounts team expects to see it.
          Not because a rule requires it. Print it &mdash; but do not believe anyone who tells you
          an invoice is defective without it.
        </p>

        <h2>On a cheque, the words win</h2>
        <p>
          Section 18 of the Negotiable Instruments Act 1881: &ldquo;If the amount undertaken or
          ordered to be paid is stated differently in figures and in words, the amount stated in
          words shall be the amount undertaken or ordered to be paid.&rdquo;
        </p>
        <p>
          That is why RBI&rsquo;s cheque-clearing material calls the figures the{' '}
          <strong>courtesy amount</strong> and the words the <strong>legal amount</strong>. If the
          two disagree, the words are what gets paid. Writing &ldquo;Rupees Twelve Lakh Only&rdquo;
          against a figure of ₹12,34,567 &mdash; usually because someone copied a rounded number
          &mdash; is not a cosmetic slip; it is an instruction to pay ₹12,00,000.
        </p>
        <p>
          Two related points from RBI&rsquo;s own guidance. Cheques with alterations or
          modifications are not accepted under the cheque truncation system, so correcting an amount
          and initialling it does not work &mdash; issue a fresh cheque. And instruments are valid
          for three months from their date, not six; that changed in 2012 and the old figure is
          still widely repeated.
        </p>

        <h2>Lakh and crore, not million</h2>
        <p>
          Indian figures group 2-2-3: ₹12,34,567 is twelve lakh thirty-four thousand five hundred
          and sixty-seven. The international system groups in threes and would render the same
          number as 1,234,567 &mdash; one million two hundred thirty-four thousand.
        </p>
        <p>
          A generic number-to-words routine borrowed from a spreadsheet or an npm package almost
          always produces the international version, which is how &ldquo;One Million&rdquo; ends up
          on a rupee cheque. This converter uses the Indian system for INR and the international one
          for everything else &mdash; and, importantly,{' '}
          <strong>the figures above are grouped the same way the words are</strong>. A page that
          printed ₹1,033,640.00 and then said &ldquo;Ten Lakh&rdquo; underneath would be telling you
          two different things at once.
        </p>

        <h2>The conventions worth keeping</h2>
        <ul>
          <li>
            <strong>Start with the currency.</strong> &ldquo;Rupees&hellip;&rdquo;, not a bare
            number.
          </li>
          <li>
            <strong>Say the sub-unit.</strong> &ldquo;&hellip;and Fifty Paise&rdquo;, spelled out.
          </li>
          <li>
            <strong>End with &ldquo;Only&rdquo;</strong>, and rule out the rest of the line. It
            stops anything being appended.
          </li>
          <li>
            <strong>Match the rounded figure.</strong> If you round the total to the nearest rupee,
            the words move with it.{' '}
            <Link href="/tools/gst-calculator/">More on rounding under Section 170</Link>.
          </li>
        </ul>

        <h2>Foreign currencies</h2>
        <p>
          For anything other than rupees this converter names the currency by its ISO 4217 code and
          writes the fractional part as a fraction of the minor unit &mdash; &ldquo;USD One Thousand
          Two Hundred Thirty-Four and 56/100 Only&rdquo;.
        </p>
        <p>
          Both choices avoid a specific failure. Pluralising a currency name by adding an
          &ldquo;s&rdquo; produces &ldquo;Japanese Yens&rdquo;, and yen has no plural. And the
          number of decimal places is a property of the currency, not a constant: the yen has none,
          so &ldquo;and 56/100&rdquo; is meaningless for it, while the Kuwaiti dinar has three and
          needs &ldquo;/1000&rdquo;. The converter reads the minor-unit exponent for each of the 150-odd
          currencies it supports rather than assuming two.
        </p>
        <p>
          Which exchange rate values the supply is a separate question, and a prescribed one &mdash;
          Rule 34 of the CGST Rules sets it, and it differs for goods and services.
        </p>

        <h2>On your invoices, automatically</h2>
        <p>
          Every invoice, proforma, quotation and challan generated on this site prints this line
          under the totals without being asked, in the right numbering system for the currency you
          picked. <Link href="/gst-invoice-generator/">Make one</Link>.
        </p>
      </Article>

      <RelatedLinks currentPath={PATH} />
      <FaqList faqs={FAQS} />
    </ContentPage>
  );
}
