import React from 'react';

/**
 * Long-form prose styling, defined once.
 *
 * The guides and the legal pages are the same kind of document -- headings,
 * paragraphs, lists, the occasional table -- and they had two copies of this
 * class list between them, which is how one of them ends up with unstyled
 * <ol>s nobody notices for months.
 */
export const proseClass = `
  space-y-4 text-sm leading-relaxed text-fg-muted
  [&_a]:text-brand-text [&_a]:underline [&_a]:underline-offset-4
  [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-fg
  [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-fg
  [&_li]:mt-1.5
  [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6
  [&_strong]:font-semibold [&_strong]:text-fg
  [&_table]:w-full [&_table]:text-left [&_table]:text-xs
  [&_td]:border-t [&_td]:border-border [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top
  [&_th]:py-2 [&_th]:pr-4 [&_th]:align-top [&_th]:font-semibold [&_th]:text-fg
  [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6
`;

interface ArticleProps {
  /** Rendered as the section's accessible name. */
  title: string;
  headingId?: string;
  children: React.ReactNode;
}

/** A body-copy card, matching the tool panels above it. */
export const Article: React.FC<ArticleProps> = ({ title, headingId = 'guide-heading', children }) => (
  <section aria-labelledby={headingId} className="card mt-12 p-6 sm:p-10">
    <h2 id={headingId} className="text-2xl font-bold tracking-tight text-fg">
      {title}
    </h2>
    {/* A wide table on a phone scrolls inside its own box rather than pushing
        the page sideways. */}
    <div className={`mt-8 max-w-3xl [&_table]:block [&_table]:overflow-x-auto ${proseClass}`}>
      {children}
    </div>
  </section>
);

export interface Faq {
  q: string;
  a: string;
}

/**
 * The visible FAQ list. The same array drives the FAQPage JSON-LD via
 * `faqSchema` below, so the two cannot drift -- which they had already done on
 * the home page before they were derived from one source.
 */
export const FaqList: React.FC<{ faqs: readonly Faq[]; headingId?: string; title?: string }> = ({
  faqs,
  headingId = 'faq-heading',
  title = 'Frequently asked questions',
}) => (
  <section aria-labelledby={headingId} className="card mt-8 p-6 sm:p-10">
    <h2 id={headingId} className="text-2xl font-bold tracking-tight text-fg">
      {title}
    </h2>
    <dl className="mt-8 max-w-3xl space-y-6">
      {faqs.map(({ q, a }) => (
        <div key={q}>
          <dt className="text-sm font-semibold text-fg">{q}</dt>
          <dd className="mt-1.5 text-sm leading-relaxed text-fg-muted">{a}</dd>
        </div>
      ))}
    </dl>
  </section>
);

export const faqSchema = (faqs: readonly Faq[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
});

/** The hero shared by every guide: h1, standfirst, and a run of key facts. */
export const GuideHero: React.FC<{
  h1: string;
  lede: string;
  points?: readonly string[];
}> = ({ h1, lede, points }) => (
  <>
    <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">{h1}</h1>
    <p className="mt-3 max-w-2xl text-base leading-relaxed text-fg-muted">{lede}</p>
    {points && points.length > 0 && (
      <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-fg-muted">
        {points.map((point) => (
          <li key={point} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="text-brand-text">
              &bull;
            </span>
            {point}
          </li>
        ))}
      </ul>
    )}
  </>
);
