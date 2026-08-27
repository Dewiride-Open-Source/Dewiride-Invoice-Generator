/**
 * Invoice designs.
 *
 * A template is not a second set of components. The preview already draws its
 * colours from the `--paper-*` custom properties in globals.css, so switching
 * design is mostly a matter of redefining those on the preview root -- and the
 * PDF builds its StyleSheet from the same object. One definition, two
 * renderers, and no way for the sheet on screen to disagree with the file.
 *
 * Only what actually varies lives here. Body text, muted text and hairline
 * borders are the same on every design, because a document that changes its
 * body colour is not a different design, it is a worse one.
 *
 * scripts/check-contrast.mjs reads the hex values out of this file and asserts
 * every foreground/background pair below against WCAG AA, so a new design
 * cannot ship with white-on-teal at 3:1.
 */

export type TemplateId = 'classic' | 'minimal' | 'modern' | 'bold';

export interface TemplatePalette {
  /** Section labels ("BILL FROM"), the rule under the header. */
  accent: string;
  /** Text drawn on top of `accent` -- only used when bandHeader is set. */
  accentFg: string;
  /** Table header fill. */
  header: string;
  headerFg: string;
  /** Address cards and the totals rows. */
  sunken: string;
  /** The final total. */
  total: string;
  totalFg: string;
}

export interface Template {
  id: TemplateId;
  name: string;
  /** One line, shown beside the name in the picker. */
  summary: string;
  /**
   * Solid fills, or rules and white space.
   *
   * The one structural switch. When false the address cards, the table header
   * and the total bar lose their backgrounds and are drawn with borders
   * instead -- which is what makes "minimal" minimal rather than just pale.
   */
  filled: boolean;
  /** The header sits inside a solid accent block. */
  bandHeader: boolean;
  /** Corner radius: points in the PDF, pixels in the preview. */
  radius: number;
  palette: TemplatePalette;
}

export const TEMPLATES: readonly Template[] = [
  {
    id: 'classic',
    name: 'Classic',
    summary: 'Blue accents, dark table header. The default.',
    filled: true,
    bandHeader: false,
    radius: 8,
    palette: {
      accent: '#2563eb',
      accentFg: '#ffffff',
      header: '#1f2937',
      headerFg: '#ffffff',
      sunken: '#f8fafc',
      total: '#2563eb',
      totalFg: '#ffffff',
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    summary: 'No fills at all — rules, weight and white space.',
    filled: false,
    bandHeader: false,
    radius: 0,
    palette: {
      accent: '#111827',
      accentFg: '#ffffff',
      header: '#ffffff',
      headerFg: '#111827',
      sunken: '#ffffff',
      total: '#ffffff',
      totalFg: '#111827',
    },
  },
  {
    id: 'modern',
    name: 'Modern',
    summary: 'Teal throughout, softly rounded.',
    filled: true,
    bandHeader: false,
    radius: 12,
    palette: {
      accent: '#0f766e',
      accentFg: '#ffffff',
      header: '#0f766e',
      headerFg: '#ffffff',
      sunken: '#f0fdfa',
      total: '#0f766e',
      totalFg: '#ffffff',
    },
  },
  {
    id: 'bold',
    name: 'Bold',
    summary: 'The header reversed out of a solid indigo block.',
    filled: true,
    bandHeader: true,
    radius: 6,
    palette: {
      accent: '#4338ca',
      accentFg: '#ffffff',
      header: '#312e81',
      headerFg: '#ffffff',
      sunken: '#eef2ff',
      total: '#4338ca',
      totalFg: '#ffffff',
    },
  },
];

export const DEFAULT_TEMPLATE: TemplateId = 'classic';

const BY_ID = new Map(TEMPLATES.map((template) => [template.id, template]));

export const isTemplateId = (value: unknown): value is TemplateId =>
  typeof value === 'string' && BY_ID.has(value as TemplateId);

/** Never throws: an unknown id -- from an old draft or a hand-edited export --
 *  falls back to the default rather than rendering a colourless invoice. */
export const getTemplate = (id: string): Template =>
  BY_ID.get(id as TemplateId) ?? BY_ID.get(DEFAULT_TEMPLATE)!;
