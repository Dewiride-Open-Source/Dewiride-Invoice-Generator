import React, { useEffect, useId, useRef } from 'react';
import { CloseIcon } from '../icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'md' | 'lg';
  /** Renders the title visually; screen readers get it either way. */
  hideTitle?: boolean;
}

/**
 * A modal built on the native <dialog> element with showModal().
 *
 * Chosen over a hand-rolled div because the browser then supplies the parts
 * that are laborious and easy to get subtly wrong: a real focus trap, Escape
 * to close, rendering in the top layer above any stacking context, and marking
 * the rest of the document inert so both the tab sequence and the screen
 * reader's virtual cursor stay inside. The previous implementation had none of
 * those -- Tab walked straight out into the page behind it.
 *
 * ::backdrop is styled in the className below rather than by painting our own
 * overlay div. (The old overlay used `bg-black bg-opacity-50`, and since
 * Tailwind v4 removed bg-opacity-*, it was rendering fully opaque black.)
 */
const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'lg',
  hideTitle = false,
}) => {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
      // Prevent the page behind from scrolling while the dialog is up.
      document.body.style.overflow = 'hidden';
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // `close` fires for Escape and for form[method=dialog] as well as our own
  // close(), so routing state through it keeps React in sync however the
  // dialog was dismissed.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  // Click outside to dismiss. The dialog element's box covers only the panel,
  // so a click whose coordinates fall outside it landed on the backdrop.
  const handleBackdropClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target !== ref.current) return;
    const { left, right, top, bottom } = ref.current.getBoundingClientRect();
    const outside =
      event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom;
    if (outside) onClose();
  };

  return (
    // Click-outside-to-dismiss is a pointer affordance. Its keyboard
    // equivalent is Escape, which <dialog> implements natively and which the
    // close listener above routes back into React state, so a key handler here
    // would be redundant.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClick={handleBackdropClick}
      className={`
        m-auto w-[calc(100vw-2rem)] ${size === 'lg' ? 'max-w-3xl' : 'max-w-md'}
        rounded-panel border border-border bg-surface p-0 text-fg shadow-overlay
        backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm
        open:flex open:max-h-[min(90vh,48rem)] open:flex-col
      `}
    >
      <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2
            id={titleId}
            className={hideTitle ? 'sr-only' : 'text-lg font-semibold tracking-tight text-fg'}
          >
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="mt-1 text-sm text-fg-muted">
              {description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg"
        >
          <CloseIcon className="size-5" />
          <span className="sr-only">Close dialog</span>
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

      {footer && (
        <footer className="border-t border-border px-5 py-4 sm:px-6">{footer}</footer>
      )}
    </dialog>
  );
};

export default Modal;
