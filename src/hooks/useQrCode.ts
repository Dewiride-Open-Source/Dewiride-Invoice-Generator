import { useEffect, useMemo, useState } from 'react';
import type { QrPath } from '../utils/qr';

/**
 * A QR path for the on-screen preview, with the encoder loaded on demand.
 *
 * The import is dynamic for the same reason the PDF engine's is: nobody who
 * never types a UPI ID should pay for an encoder. Unlike the PDF, there is no
 * click to hang it off -- the preview simply needs the code as soon as the
 * field is valid -- so the module is fetched the first time this hook is asked
 * for a code, and cached at module scope for every later render and every
 * other component.
 *
 * Returns null while loading, when there is nothing to encode, and if the
 * chunk fails to fetch. Callers render nothing in all three cases: a payment
 * QR that is absent is a small loss, whereas a broken or half-drawn one
 * invites someone to scan it.
 */

type QrModule = typeof import('../utils/qr');

let encoder: QrModule | null = null;
let pending: Promise<QrModule> | null = null;

const load = (): Promise<QrModule> => {
  pending ??= import('../utils/qr').then((module) => {
    encoder = module;
    return module;
  });
  return pending;
};

export const useQrCode = (text: string | null): QrPath | null => {
  // The module itself is the state, rather than a "loaded" flag: it is what
  // the memo below actually depends on, and holding it here means the
  // dependency is real instead of something the exhaustive-deps rule has to be
  // argued out of.
  //
  // The initialiser reads module scope, which is null during the static export
  // and on the first client render, so the prerendered HTML and the hydrated
  // tree agree. A later mount that finds the encoder already cached skips the
  // empty frame entirely.
  const [module, setModule] = useState<QrModule | null>(() => encoder);

  useEffect(() => {
    if (!text || module) return;
    let cancelled = false;
    void load()
      .then((loaded) => {
        if (!cancelled) setModule(loaded);
      })
      .catch(() => {
        // A failed chunk fetch leaves the QR absent. Clearing `pending` lets
        // the next change of `text` retry, since a rejected import() would
        // otherwise stay rejected forever.
        pending = null;
      });
    return () => {
      cancelled = true;
    };
  }, [text, module]);

  return useMemo(() => {
    if (!text || !module) return null;
    try {
      return module.toQrPath(text);
    } catch {
      // Only thrown if the payload exceeds what a QR can hold. A UPI link is
      // ~100 characters, so this is unreachable in practice -- but it would
      // otherwise take the whole preview down with it.
      return null;
    }
  }, [text, module]);
};
