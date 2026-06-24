import React from "react";

type ButtonVariant = "primary" | "secondary" | "success" | "danger" | "ghost" | "tag";
type ButtonSize = "sm" | "md";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Only used with variant="tag" — toggles the selected/highlighted look. */
  active?: boolean;
  type?: "button" | "submit";
  className?: string;
}

const baseStyles =
  "inline-flex items-center justify-center font-medium transition-colors duration-150 " +
  "disabled:opacity-40 disabled:cursor-not-allowed " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900";

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm rounded-md gap-1.5",
  md: "px-4 py-2 text-sm rounded-lg gap-2",
};

// Each variant sits one step lighter than the panel it's normally placed on
// (cards and modals are zinc-800), so buttons read as distinctly raised
// controls instead of blending into their container.
const variantStyles: Record<Exclude<ButtonVariant, "tag">, string> = {
  primary: "bg-amber-500 text-zinc-950 hover:bg-amber-400 shadow-sm shadow-black/20",
  secondary: "bg-zinc-700 text-zinc-100 border border-zinc-600 hover:bg-zinc-600 hover:border-zinc-500",
  success: "bg-emerald-600 text-white hover:bg-emerald-500",
  danger: "bg-rose-600 text-white hover:bg-rose-500",
  ghost: "bg-transparent text-zinc-300 hover:text-zinc-50 hover:bg-zinc-700",
};

// "tag" is a distinct shape (small pill) used for the tag-toggle chips that
// show up in the tag editor and tag filter UI. Previously these reused the
// regular Button with className overrides for padding (e.g. "px-3 py-1"),
// which silently fought the base button's own padding classes since both
// have equal CSS specificity — the result depended on stylesheet generation
// order rather than markup order. Giving "tag" its own first-class variant
// removes that footgun entirely.
const tagStyles = {
  active: "bg-amber-500/20 text-amber-300 border border-amber-500/50",
  inactive: "bg-zinc-700/70 text-zinc-300 border border-zinc-600 hover:border-zinc-500 hover:text-zinc-100",
};

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled,
  variant = "primary",
  size = "md",
  active = false,
  type = "button",
  className = "",
}) => {
  const isTag = variant === "tag";
  const shapeStyles = isTag ? "px-3 py-1 text-xs rounded-full" : sizeStyles[size];
  const colorStyles = isTag ? (active ? tagStyles.active : tagStyles.inactive) : variantStyles[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${shapeStyles} ${colorStyles} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;