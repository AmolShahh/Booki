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
  title?: string;
  "aria-label"?: string;
}

const baseStyles =
  "inline-flex items-center justify-center font-medium transition-colors duration-150 " +
  "disabled:opacity-40 disabled:cursor-not-allowed " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm rounded-md gap-1.5",
  md: "px-4 py-2 text-sm rounded-lg gap-2",
};

const variantStyles: Record<Exclude<ButtonVariant, "tag">, string> = {
  primary:
    "bg-accent text-accent-fg hover:bg-accent-hover shadow-sm shadow-black/10",
  secondary:
    "bg-surface-hover text-text-primary border border-border-subtle hover:border-border-strong",
  success:
    "bg-cat-liked text-white hover:opacity-90",
  danger:
    "bg-cat-disliked text-white hover:opacity-90",
  ghost:
    "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover",
};

const tagStyles = {
  active: "bg-accent-bg text-accent border border-accent/40",
  inactive:
    "bg-surface-hover text-text-secondary border border-border-subtle hover:border-border-strong hover:text-text-primary",
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
  title,
  "aria-label": ariaLabel,
}) => {
  const isTag = variant === "tag";
  const shapeStyles = isTag ? "px-3 py-1 text-xs rounded-full" : sizeStyles[size];
  const colorStyles = isTag ? (active ? tagStyles.active : tagStyles.inactive) : variantStyles[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className={`${baseStyles} ${shapeStyles} ${colorStyles} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
