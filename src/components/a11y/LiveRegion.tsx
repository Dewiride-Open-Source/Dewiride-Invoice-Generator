import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type Politeness = 'polite' | 'assertive';

interface AnnouncerValue {
  announce: (message: string, politeness?: Politeness) => void;
}

const AnnouncerContext = createContext<AnnouncerValue>({ announce: () => {} });

/**
 * A single pair of live regions for the whole app.
 *
 * Without this, none of the app's state changes reach a screen reader: adding
 * or removing a line item, applying a saved company, deleting saved data and
 * generating a PDF were all silent. Sighted users see the table change;
 * everyone else got nothing.
 *
 * Two regions, mounted for the life of the page. Live regions must exist in
 * the DOM before their content changes -- injecting a populated region is
 * frequently missed by assistive tech.
 */
export const LiveRegionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [polite, setPolite] = useState('');
  const [assertive, setAssertive] = useState('');
  const lastRef = useRef('');

  const announce = useCallback((message: string, politeness: Politeness = 'polite') => {
    const setter = politeness === 'assertive' ? setAssertive : setPolite;

    // Repeating an identical string does not re-trigger an announcement, so
    // append a zero-width space to force a change when it genuinely repeats
    // (e.g. removing two items in a row).
    const next = message === lastRef.current ? `${message}​` : message;
    lastRef.current = next;
    setter(next);
  }, []);

  const value = useMemo(() => ({ announce }), [announce]);

  return (
    <AnnouncerContext.Provider value={value}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {polite}
      </div>
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {assertive}
      </div>
    </AnnouncerContext.Provider>
  );
};

export const useAnnounce = (): AnnouncerValue['announce'] => useContext(AnnouncerContext).announce;
