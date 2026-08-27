import React, { useId } from 'react';
import { TEMPLATES, TemplateId, getTemplate } from '../utils/templates';

interface TemplatePickerProps {
  value: TemplateId;
  onChange: (id: TemplateId) => void;
}

/**
 * The invoice design.
 *
 * Radios rather than a <select>: there are four, they are a visual choice, and
 * a swatch beside each is worth more than its name. A native radio group also
 * gives arrow-key navigation and a single tab stop for free, which a row of
 * buttons would have to reimplement.
 *
 * The swatch is drawn from the template's own palette rather than a picture, so
 * it cannot fall out of date with the design it advertises.
 */
const TemplatePicker: React.FC<TemplatePickerProps> = ({ value, onChange }) => {
  const name = useId();

  return (
    <div role="radiogroup" aria-label="Invoice design" className="mt-3 grid gap-2 @lg:grid-cols-2">
      {TEMPLATES.map((template) => {
        const selected = template.id === value;
        return (
          <label
            key={template.id}
            className={`flex cursor-pointer items-center gap-3 rounded-card border p-3 transition-colors ${
              selected ? 'border-brand bg-brand-subtle' : 'border-border bg-surface hover:border-brand'
            }`}
          >
            {/*
              Named and described explicitly rather than by the wrapping label.
              The label would fold the summary into the accessible name, so a
              screen reader would announce "Classic, Blue accents, dark table
              header. The default." as the option itself. Split, it reads as a
              name with a description -- which is what it is.
            */}
            <input
              type="radio"
              name={name}
              value={template.id}
              checked={selected}
              onChange={() => onChange(template.id)}
              aria-labelledby={`${name}-${template.id}-name`}
              aria-describedby={`${name}-${template.id}-summary`}
              className="size-4 shrink-0 accent-brand"
              data-testid={`template-${template.id}`}
            />
            {/*
              Decorative: the name and summary beside it already say which
              design this is, so announcing three colours would only add noise.
            */}
            <span aria-hidden="true" className="flex shrink-0 overflow-hidden rounded border border-border-strong">
              {[template.palette.accent, template.palette.header, template.palette.sunken].map(
                (colour, index) => (
                  <span key={index} className="block size-5" style={{ backgroundColor: colour }} />
                ),
              )}
            </span>
            <span className="min-w-0">
              <span id={`${name}-${template.id}-name`} className="block text-sm font-medium text-fg">
                {template.name}
              </span>
              <span
                id={`${name}-${template.id}-summary`}
                className="block text-xs text-fg-muted"
              >
                {template.summary}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
};

export default TemplatePicker;

/** Re-exported so callers do not need a second import for the lookup. */
export { getTemplate };
