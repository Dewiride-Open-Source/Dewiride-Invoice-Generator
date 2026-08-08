import React from 'react';

/**
 * Every SVG in the app, in one place.
 *
 * Previously these were pasted inline at each call site -- the trash icon
 * appeared verbatim three times in SavedDataManager alone -- and the marketing
 * feature "icons" were literal emoji, which render inconsistently across
 * platforms and are announced as their unicode names by screen readers.
 *
 * All icons are decorative: they sit next to a visible label or an sr-only
 * one, so they carry aria-hidden and never contribute an accessible name.
 */

type IconProps = React.SVGProps<SVGSVGElement>;

const Icon: React.FC<IconProps & { children: React.ReactNode }> = ({
  children,
  className = 'size-5',
  ...rest
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    className={className}
    {...rest}
  >
    {children}
  </svg>
);

export const SunIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </Icon>
);

export const MoonIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
  </Icon>
);

export const ComputerIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <rect x="2" y="4" width="20" height="12" rx="2" />
    <path d="M8 20h8m-4-4v4" />
  </Icon>
);

export const TrashIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6m4-6v6" />
  </Icon>
);

export const PlusIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const CloseIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icon>
);

export const ChevronDownIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

export const SearchIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);

export const DownloadIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M12 3v12m0 0 4-4m-4 4-4-4M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
  </Icon>
);

export const DatabaseIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <ellipse cx="12" cy="5" rx="8" ry="3" />
    <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
  </Icon>
);

export const WarningIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <path d="M12 9v4m0 4h.01" />
  </Icon>
);

/* --- marketing feature icons (previously 💯 📄 💰 ⚡) --- */

export const FreeIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.5 2.5 2.5 4.5-5" />
  </Icon>
);

export const DocumentIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
    <path d="M14 3v5h5M9 13h6m-6 4h4" />
  </Icon>
);

export const CurrencyIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M14.5 9a2.5 2.5 0 0 0-2.5-1.5c-1.4 0-2.5.8-2.5 2s1.1 1.8 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2A2.5 2.5 0 0 1 9.5 15M12 6v12" />
  </Icon>
);

export const BoltIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M13 2 4.5 13H11l-1 9 8.5-11H12l1-9Z" />
  </Icon>
);
