import React from 'react';
import Link from 'next/link';
import LegalPage from '../components/LegalPage';

/**
 * The trust page.
 *
 * A tool that asks people to type their business details, their clients' names
 * and their revenue figures has to answer "who is behind this and how does it
 * make money" somewhere. Until now the only answer was a footer link to a
 * different domain. Search engines weigh this for a finance-adjacent tool, and
 * it gives the Organization `sameAs` in _document somewhere on this site to
 * point back at.
 */
export default function About() {
  return (
    <LegalPage
      title="About this invoice generator"
      metaTitle="About — Dewiride Invoice Generator"
      description="Who builds and operates the Dewiride invoice generator, how it stays free, and why your invoice data never leaves your browser."
      path="/about/"
    >
      <h2>What this is</h2>
      <p>
        A free invoice generator that runs entirely in your browser. You fill in a form, watch a
        live preview, and download a PDF. There is no account to create, no invoice limit, and no
        paid tier that unlocks the features you actually need.
      </p>

      <h2>Who builds it</h2>
      <p>
        It is built and operated by <strong>Dewiride Technologies Private Limited</strong>, a
        software company based in Jodhpur, Rajasthan, India, working primarily on AI and
        automation projects. This tool started as something we needed ourselves and kept because
        other people found it useful.
      </p>

      <h2>Why it is free</h2>
      <p>
        There is no server processing invoices, so serving one more user costs us close to
        nothing. The site runs as static files behind a CDN, and every expensive part &mdash; the
        PDF rendering, the storage, the calculations &mdash; happens on your own machine. That is
        also why there is no upsell: there is no infrastructure bill scaling with your usage that
        we would need to recover.
      </p>
      <p>
        We build custom software for clients, and this tool serves as a public demonstration of
        how we work. That is the whole business model behind it.
      </p>

      <h2>Where your data goes</h2>
      <p>
        Nowhere. There is no backend that could receive an invoice. Your draft is held in your
        browser&rsquo;s session storage, the businesses and item descriptions you reuse are held in
        local storage for autocomplete, and the PDF is generated on your device. You can inspect
        and delete all of it from the &ldquo;Saved data&rdquo; button in the header.
      </p>
      <p>
        We do collect anonymous, aggregate usage statistics &mdash; which pages get visited, which
        currencies get picked, how many line items a typical invoice has. We do not collect
        invoice text, names, addresses or amounts tied to anyone. The{' '}
        <Link href="/privacy">privacy policy</Link> sets out exactly what is and is not collected.
      </p>

      <h2>How it is built</h2>
      <p>
        A statically exported Next.js site with no server-side runtime, deployed to a CDN. The PDF
        engine is around 1.5&nbsp;MB and is deliberately never loaded until you click download, so
        the page itself stays fast on a slow connection. Colour contrast is checked against WCAG AA
        in both themes on every build, and an automated accessibility suite runs against the real
        export before anything ships.
      </p>

      <h2>Contact</h2>
      <p>
        Corrections, bug reports and feature requests are all welcome.
        <br />
        <strong>Dewiride Technologies Private Limited</strong>
        <br />
        C/o Jagdish Kumawat, Village Tena, Tehsil Shergarh, Jodhpur &ndash; 342028, Rajasthan, India
        <br />
        Email:{' '}
        <a href="mailto:support@dewiride.com">support@dewiride.com</a>
        <br />
        Web:{' '}
        <a href="https://dewiride.com" target="_blank" rel="noopener noreferrer">
          dewiride.com
        </a>
      </p>
    </LegalPage>
  );
}
