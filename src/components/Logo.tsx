import React from "react";

interface LogoProps {
  /** Icon-only size in pixels. */
  size?: number;
  className?: string;
}

/**
 * Booki mark: three stacked books forming a small pyramid. Uses currentColor
 * so it inherits the accent color when placed inside a text-accent wrapper.
 */
const Logo: React.FC<LogoProps> = ({ size = 20, className = "" }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Top book */}
      <rect
        x="7"
        y="4"
        width="10"
        height="4.5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      {/* Middle book (offset left) */}
      <rect
        x="4"
        y="10"
        width="13"
        height="4.5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      {/* Bottom book (widest, offset right) */}
      <rect
        x="6"
        y="16"
        width="14"
        height="4.5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      {/* Amber accent dot on the middle book — the "bookmark" */}
      <circle cx="14.5" cy="12.25" r="0.9" fill="currentColor" />
    </svg>
  );
};

export default Logo;
