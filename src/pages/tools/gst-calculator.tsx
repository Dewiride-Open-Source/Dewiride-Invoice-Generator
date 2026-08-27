import React from 'react';
import Link from 'next/link';
import ContentPage from '../../components/ContentPage';
import RelatedLinks from '../../components/RelatedLinks';
import GstCalculator from '../../components/tools/GstCalculator';
import { Article, Faq, FaqList, GuideHero, faqSchema } from '../../components/Article';

const PATH = '/tools/gst-calculator/';

/**
 * The arithmetic page. It owns the rate schedule and the rounding chain
 * outright -- every other page on this site links here rather than restating
 * either, because eight pages each explaining the September 2025 slabs is
 * eight near-duplicates of one paragraph.
 */
const FAQS: readonly Faq[] = [
  {
    q: 'How do I remove GST from an inclusive amount?',
    a: 'Divide, do not subtract. Rule 35 of the CGST Rules gives the formula: the tax amount equals the value inclusive of tax multiplied by the tax rate, divided by 100 plus the sum of the applicable rates. On ₹1,18,000 inclusive at 18% intra-State, CGST is 1,18,000 × 9 ÷ 118 = ₹9,000 and SGST the same. Taking 18% off ₹1,180 gives ₹967.60, which is wrong by ₹32.40.',
  },
  {
    q: 'Is 12% GST still a thing?',
    a: 'Almost never. The 56th GST Council meeting of 3 September 2025 collapsed the four-slab structure, and Notification 09/2025-Central Tax (Rate) gave effect to it from 22 September 2025: 5% merit, 18% standard, 40% for sin and luxury goods, plus the narrow schedules at 0.25%, 1.5% and 3%. A 6% central rate (12% combined) survives separately for fly ash bricks, building bricks and similar entries under Notification 14/2025-CT(R). The 28% schedule was omitted with effect from 1 February 2026.',
  },
  {
    q: 'Why is 40% the highest possible rate?',
    a: 'Because of the statutory ceilings. Section 9(1) of the CGST Act caps central tax at 20%, and Section 7(1) of the UTGST Act does the same for Union territory tax; Section 5(1) of the IGST Act caps integrated tax at 40%. A 40% intra-State supply is 20% + 20%, which is the ceiling in both directions.',
  },
  {
    q: 'CGST + SGST or IGST — how is that decided?',
    a: 'By Sections 7 and 8 of the IGST Act, comparing the location of the supplier with the place of supply — not by the customer’s billing address. Section 8 makes it intra-State where both are in the same State or Union territory; Section 7 makes it inter-State otherwise. For goods that move, Section 10(1)(a) puts the place of supply where the movement terminates for delivery to the recipient.',
  },
  {
    q: 'When is it UTGST rather than SGST?',
    a: 'Only in Union Territories without a legislature — Chandigarh, the Andaman and Nicobar Islands, Lakshadweep, Dadra and Nagar Haveli and Daman and Diu, and Ladakh. Delhi, Puducherry and Jammu and Kashmir have legislatures and are treated as States for GST, so supplies there carry CGST + SGST. The arithmetic is identical either way: half the rate under each head.',
  },
  {
    q: 'Should I round the tax to the nearest rupee?',
    a: 'Section 170 of the CGST Act requires amounts of tax, interest, penalty, fine, refund or any other sum payable under the Act to be rounded to the nearest rupee, treating 50 paise and above as a rupee. What it does not say is whether that applies per line, per tax head, or only at the return and payment stage, and no CBIC circular resolves it. This calculator works to the paisa and shows you the difference; the practical convention is to round the tax heads at the invoice level, which is what the e-invoice schema’s round-off field is for.',
  },
  {
    q: 'Do I still need to add compensation cess?',
    a: 'No, not on anything issued now. Compensation cess was reduced to Nil across the specified goods from 22 September 2025, and Notification 03/2025-Compensation Cess (Rate) took the remaining pan masala and tobacco entries to Nil from 1 February 2026. What replaced it on sin goods is not GST — pan masala carries the Health Security se National Security Cess, levied per machine installed rather than on output, and tobacco carries an additional Central Excise Duty — and neither belongs in a CGST, SGST or IGST field on your invoice.',
  },
];

export default function GstCalculatorPage() {
  return (
    <ContentPage
      title="GST calculator"
      metaTitle="GST Calculator — Add or Remove GST, with the CGST/SGST Split"
      description="Add GST to an amount or take it back out using Rule 35's actual formula, with the CGST + SGST or IGST split shown. Current rate schedule as at 2026. Runs entirely in your browser."
      path={PATH}
      schema={[faqSchema(FAQS)]}
      hero={
        <GuideHero
          h1="GST calculator"
          lede="Add GST to a price, or pull it back out of a GST-inclusive one. The split is the same code that produces the tax invoices on this site, so the number here and the number on your invoice cannot disagree."
          points={['Inclusive and exclusive', 'CGST + SGST or IGST', 'Rule 35 formula']}
        />
      }
    >
      <GstCalculator />

      <Article title="The arithmetic, as the rules actually write it" headingId="arithmetic">
        <h2>Taking GST out of an inclusive amount</h2>
        <p>
          The instinct is to subtract the percentage, and it is wrong every time. Rule 35 of the
          CGST Rules gives the formula: where the value of supply is inclusive of tax, the tax
          amount is
        </p>
        <p>
          <strong>
            (value inclusive of tax &times; rate of tax) &divide; (100 + sum of the applicable
            rates)
          </strong>
        </p>
        <p>
          The word doing the work is <strong>sum</strong>. The denominator is 100 plus the total of
          <em> all</em> the applicable rates, while the numerator is the rate of the single head you
          are computing. On a ₹1,18,000 intra-State supply at 18%:
        </p>
        <ul>
          <li>CGST = 1,18,000 &times; 9 &divide; 118 = ₹9,000</li>
          <li>SGST = 1,18,000 &times; 9 &divide; 118 = ₹9,000</li>
          <li>Taxable value = ₹1,00,000</li>
        </ul>
        <p>
          Note the denominator is 118, not 109 &mdash; it uses the combined 18%, not the 9% of the
          head being calculated. Subtracting 18% instead would have given ₹96,760 and a tax figure
          out by ₹3,240.
        </p>
        <p>
          The Rules contain a worked example of the same operation: Rule 31A(2) values a lottery
          supply at 100/140 of the face value, which is the inclusive back-calculation at a 40%
          rate.
        </p>

        <h2>What the rates are now</h2>
        <p>
          Most calculators still offer 5, 12, 18 and 28. That structure ended on 22 September 2025.
          The 56th GST Council meeting of 3 September 2025 collapsed it, and Notification
          09/2025-Central Tax (Rate) gave effect to the change with seven schedules of central tax
          &mdash; 0.125%, 0.75%, 1.5%, 2.5%, 9%, 14% and 20% &mdash; which double, on an intra-State
          supply, to these combined rates:
        </p>
        <table>
          <caption className="sr-only">Combined GST rates in force</caption>
          <thead>
            <tr>
              <th scope="col">Combined</th>
              <th scope="col">What it covers</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>0.25%</td>
              <td>Rough diamonds and similar.</td>
            </tr>
            <tr>
              <td>1.5%</td>
              <td>Cut and polished diamonds.</td>
            </tr>
            <tr>
              <td>3%</td>
              <td>Gold, silver and other precious metals.</td>
            </tr>
            <tr>
              <td>5%</td>
              <td>The merit rate.</td>
            </tr>
            <tr>
              <td>12%</td>
              <td>
                Survives only for specific brick entries &mdash; fly ash bricks and blocks, building
                bricks, bricks of fossil meals &mdash; notified separately by 14/2025-CT(R).
              </td>
            </tr>
            <tr>
              <td>18%</td>
              <td>The standard rate, and the default for services.</td>
            </tr>
            <tr>
              <td>40%</td>
              <td>
                Sin and luxury goods, and services such as betting and gambling. Also the statutory
                maximum.
              </td>
            </tr>
          </tbody>
        </table>
        <p>
          The 28% schedule held pan masala and tobacco after September 2025 and was itself omitted
          with effect from 1 February 2026. Compensation cess is now Nil throughout &mdash;
          Notification 03/2025-Compensation Cess (Rate) took the pan masala and tobacco entries to
          Nil from that date. What replaced it is not GST: pan masala carries the{' '}
          <strong>Health Security se National Security Cess</strong>, levied per machine installed
          rather than on what is produced, and tobacco carries an additional Central Excise Duty.
          Neither belongs in a CGST, SGST or IGST field on an invoice.
        </p>

        <h2>Which two heads, and why</h2>
        <p>
          Sections 7 and 8 of the IGST Act decide it, by comparing the{' '}
          <strong>location of the supplier</strong> with the <strong>place of supply</strong>. Same
          State or Union territory, and it is intra-State: CGST and SGST, half the rate under each
          head. Different, and it is inter-State: IGST at the full rate.
        </p>
        <p>
          Neither of those is the customer&rsquo;s billing address. For goods that move, Section
          10(1)(a) fixes the place of supply where the movement terminates for delivery to the
          recipient, and Section 10(1)(b) deals with bill-to/ship-to, where the goods are deemed
          received by the third person. Getting it wrong does not just misprint a label &mdash; it
          pays the tax to the wrong government, and unwinding that is slow.
        </p>
        <p>
          In Union Territories without a legislature the second head is UTGST rather than SGST. The
          arithmetic is unchanged.
        </p>

        <h2>Discount first, then tax</h2>
        <p>
          Section 15(3) excludes from the value of supply a discount given before or at the time of
          supply where it is duly recorded in the invoice. So a discount shown on the face of the
          invoice comes off <em>before</em> the tax is worked out. Rule 46(k) then requires the
          invoice to print the taxable value &ldquo;taking into account discount or abatement, if
          any&rdquo;, separately from the rate at clause (l) and the tax amount at clause (m).
        </p>

        <h2>Rounding</h2>
        <p>
          Section 170 requires the amount of tax, interest, penalty, fine or any other sum payable
          or refundable under the Act to be rounded to the nearest rupee, with fifty paise and above
          treated as a whole rupee. What the section does not settle is the level at which that
          happens &mdash; per line, per tax head, or only at the return and payment stage &mdash;
          and no circular resolves it.
        </p>
        <p>
          The practical answer is to work to the paisa and round the tax heads once, at the invoice
          level. Line-by-line rounding is what produces the small mismatches that get e-invoices
          rejected. The e-invoice schema allows a round-off adjustment between &minus;99.99 and
          +99.99 on the invoice total for exactly this reason. This calculator rounds every figure
          to the paisa and tells you when the parts do not add back to the inclusive amount you
          typed, rather than quietly forcing them to.
        </p>
        <p>
          If you round the printed total, remember that the{' '}
          <Link href="/tools/amount-in-words/">amount in words</Link> has to move with it &mdash;
          the figure, the words and the return all have to say the same thing.
        </p>
      </Article>

      <RelatedLinks currentPath={PATH} />
      <FaqList faqs={FAQS} />
    </ContentPage>
  );
}
