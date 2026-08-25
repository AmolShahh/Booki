import React from "react";
import { BookOpen, Bookmark } from "lucide-react";

interface TagListProps {
  tags?: string;
  className?: string;
  /** Compact removes the outer padding/border so tags feel inline. */
  variant?: "chip" | "inline";
  /** When provided, tags render as buttons that filter the parent list. */
  onTagClick?: (tag: string) => void;
  /** Highlights pills matching any of these tags (used to show active filters). */
  activeTags?: string[];
}

const parseTags = (tags?: string): string[] =>
  (tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

const specialIcon = (tag: string) => {
  if (tag === "currently-reading") return <BookOpen size={11} strokeWidth={2.5} />;
  if (tag === "to-reread") return <Bookmark size={11} strokeWidth={2.5} />;
  return null;
};

const specialStyle = (tag: string): string | null => {
  if (tag === "currently-reading")
    return "border-[color:var(--cat-tbr)]/40 bg-[color:var(--cat-tbr)]/15 text-[color:var(--cat-tbr)]";
  if (tag === "to-reread")
    return "border-[color:var(--cat-reread)]/40 bg-[color:var(--cat-reread)]/15 text-[color:var(--cat-reread)]";
  return null;
};

const TagList: React.FC<TagListProps> = ({ tags, className = "", variant = "chip", onTagClick, activeTags }) => {
  const list = parseTags(tags);
  if (list.length === 0) return null;

  const chipBase =
    variant === "chip"
      ? "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      : "inline-flex items-center gap-1 text-[11px] font-medium";
  const interactive = onTagClick
    ? "cursor-pointer transition-colors hover:border-accent/50 hover:text-accent"
    : "";
  const activeStyle = "border-accent bg-accent-bg text-accent";

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {list.map((tag, i) => {
        const isActive = !!onTagClick && !!activeTags?.includes(tag);
        const special = specialStyle(tag);
        const baseColor = special ?? "border-border-subtle bg-surface-hover text-text-secondary";
        const cls = isActive
          ? `${chipBase} ${activeStyle} ${interactive}`
          : `${chipBase} ${baseColor} ${interactive}`;
        if (onTagClick) {
          return (
            <button
              key={`${tag}-${i}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTagClick(tag);
              }}
              className={cls}
              title={isActive ? `Clear "${tag}" filter` : `Filter by "${tag}"`}
            >
              {specialIcon(tag)}
              {tag}
            </button>
          );
        }
        return (
          <span key={`${tag}-${i}`} className={cls}>
            {specialIcon(tag)}
            {tag}
          </span>
        );
      })}
    </div>
  );
};

export default TagList;
