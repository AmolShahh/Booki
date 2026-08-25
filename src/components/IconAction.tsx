import React from "react";
import type { LucideIcon } from "lucide-react";

type Tone = "default" | "danger" | "success" | "accent";

interface IconActionProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  tone?: Tone;
}

const toneStyles: Record<Tone, string> = {
  default: "text-text-muted hover:text-text-primary hover:bg-surface-hover",
  danger: "text-text-muted hover:text-[color:var(--cat-disliked)] hover:bg-[color:var(--cat-disliked)]/10",
  success: "text-text-muted hover:text-[color:var(--cat-liked)] hover:bg-[color:var(--cat-liked)]/10",
  accent: "text-text-muted hover:text-accent hover:bg-accent-bg",
};

const activeStyles: Record<Tone, string> = {
  default: "text-accent bg-accent-bg",
  danger: "text-[color:var(--cat-disliked)] bg-[color:var(--cat-disliked)]/10",
  success: "text-[color:var(--cat-liked)] bg-[color:var(--cat-liked)]/10",
  accent: "text-accent bg-accent-bg",
};

const IconAction: React.FC<IconActionProps> = ({
  icon: Icon,
  label,
  onClick,
  disabled,
  active,
  tone = "default",
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? activeStyles[tone] : toneStyles[tone]
      }`}
    >
      <Icon size={16} strokeWidth={2} />
    </button>
  );
};

export default IconAction;
