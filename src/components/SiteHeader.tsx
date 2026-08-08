import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ThemeToggle from './ThemeToggle';

/**
 * Shared by the home, privacy and terms pages, which previously each repeated
 * their own logo markup (including three copies of an onError PNG fallback).
 */
const SiteHeader: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <header className="sticky top-0 z-30 border-b border-border bg-canvas/85 backdrop-blur-md">
    <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
      <Link
        href="/"
        className="flex items-center gap-2.5 rounded-lg font-semibold tracking-tight text-fg"
      >
        {/* Decorative: the adjacent wordmark already names the link.
            next/image emits the intrinsic size, so this reserves layout space
            and cannot shift. Optimisation is off for the static export. */}
        <Image
          src="/logo.svg"
          alt=""
          width={32}
          height={32}
          className="size-8 shrink-0"
          priority
        />
        <span className="text-sm sm:text-base">
          Dewiride <span className="text-fg-muted">Invoice</span>
        </span>
      </Link>

      <div className="flex items-center gap-2">
        {children}
        <ThemeToggle />
      </div>
    </div>
  </header>
);

export default SiteHeader;
