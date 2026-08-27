import React, { useCallback, useId, useRef, useState } from 'react';
import { buttonClass } from './fields';
import { TrashIcon } from './icons';
import { useAnnounce } from './a11y/LiveRegion';
import { IMAGE_ACCEPT_ATTRIBUTE, ImageError, prepareImage } from '../utils/image';

interface ImageFieldProps {
  /** Visible label, and the stem of every announcement: "Business logo added." */
  label: string;
  value: string;
  onChange: (image: string) => void;
  /** Form control name, for autofill and for agents driving the page. */
  name: string;
  /** What the picked image is, described for someone who cannot see it. */
  alt: string;
  /** Prefixes -input, -thumbnail, -remove and -error. */
  testId: string;
  /** Sentence appended to the format note. */
  hint?: string;
  /** Tailwind classes bounding the thumbnail, so a wide signature is not cropped. */
  thumbnailClassName?: string;
}

/**
 * A picker for the two images an invoice can carry: the business logo and the
 * signature.
 *
 * A plain <input type="file"> with a real <label>, styled through Tailwind's
 * `file:` variants rather than hidden behind a button. The hidden-input pattern
 * used elsewhere in the app exists because those triggers sit in a row of
 * other buttons; here the control is the only thing in its block, so the native
 * input keeps its own label, keyboard behaviour and mobile picker.
 *
 * Resizing happens in utils/image.ts. This component owns only the state that
 * cannot live there: which file is being processed, and what went wrong.
 */
const ImageField: React.FC<ImageFieldProps> = ({
  label,
  value,
  onChange,
  name,
  alt,
  testId,
  hint,
  thumbnailClassName = 'max-h-12 max-w-32',
}) => {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const announce = useAnnounce();

  const handleFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // Cleared straight away so picking the same file twice -- after cropping
      // it, say -- still fires a change event.
      event.target.value = '';
      if (!file) return;

      setError('');
      setBusy(true);
      try {
        const image = await prepareImage(file);
        onChange(image);
        announce(`${label} added.`);
      } catch (cause) {
        const message =
          cause instanceof ImageError
            ? cause.message
            : 'That image could not be used. Try a different file.';
        setError(message);
        announce(message, 'assertive');
      } finally {
        setBusy(false);
      }
    },
    [announce, label, onChange],
  );

  const remove = useCallback(() => {
    onChange('');
    setError('');
    announce(`${label} removed.`);
    input.current?.focus();
  }, [announce, label, onChange]);

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-fg">
        {label}
      </label>

      {value && (
        <div className="mb-2 flex items-center gap-3 rounded-lg border border-border bg-surface p-2">
          {/*
            A local data URI produced by prepareImage, capped at 128 KB and
            already at its display size -- next/image would add a wrapper and a
            loader to re-serve bytes that never touch the network.

            bg-white because a signature is usually black on transparent, which
            is invisible against the dark-theme surface behind it.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={alt}
            className={`rounded bg-white object-contain ${thumbnailClassName}`}
            data-testid={`${testId}-thumbnail`}
          />
          <button
            type="button"
            onClick={remove}
            className={`${buttonClass.dangerGhost} ml-auto px-3 py-2`}
            data-testid={`${testId}-remove`}
          >
            <TrashIcon className="size-4" />
            Remove
          </button>
        </div>
      )}

      {/*
        control-has-associated-label cannot see a <label htmlFor> association
        built from useId, and only stays quiet on the other fields in this app
        because they spread {...rest} onto the input and the rule then bails.
        The label above is a real one; tests/a11y.spec.ts asserts the resulting
        accessible name rather than trusting either the rule or this comment.
      */}
      {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
      <input
        ref={input}
        id={inputId}
        type="file"
        name={name}
        accept={IMAGE_ACCEPT_ATTRIBUTE}
        onChange={handleFile}
        disabled={busy}
        aria-describedby={error ? `${hintId} ${errorId}` : hintId}
        aria-invalid={error ? true : undefined}
        aria-busy={busy || undefined}
        className={
          'block w-full cursor-pointer rounded-lg border border-border-strong bg-surface text-sm text-fg-muted ' +
          'file:mr-3 file:cursor-pointer file:border-0 file:border-r file:border-border-strong ' +
          'file:bg-surface-sunken file:px-3 file:py-2.5 file:text-sm file:font-medium file:text-fg ' +
          'hover:border-brand disabled:cursor-not-allowed disabled:opacity-60'
        }
        data-testid={`${testId}-input`}
      />

      <p id={hintId} className="mt-1 text-xs text-fg-muted">
        {value ? 'Choose another file to replace it. ' : ''}
        PNG, JPEG or WebP. Resized to 512px and kept in your browser.
        {hint ? ` ${hint}` : ''}
      </p>

      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 text-xs text-danger-text"
          data-testid={`${testId}-error`}
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default ImageField;
