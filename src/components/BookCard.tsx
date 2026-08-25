import React from "react";
import TagList from "./TagList";
import { CATEGORY_DOT_VAR } from "./bookMeta";

export interface BookCardProps {
  book: any;
  rank?: number;
  isTop3?: boolean;
  categoryDot?: string;
  actions?: React.ReactNode;
  wrapperProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragging?: boolean;
  prefix?: React.ReactNode;
  onTagClick?: (tag: string) => void;
  activeTags?: string[];
}

const BookCard: React.FC<BookCardProps> = ({
  book,
  rank,
  isTop3,
  categoryDot,
  actions,
  wrapperProps,
  isDragging,
  prefix,
  onTagClick,
  activeTags,
}) => {
  return (
    <div
      {...wrapperProps}
      className={`group relative rounded-xl border border-border-subtle bg-surface p-4 transition-all ${
        isDragging ? "opacity-30" : "hover:border-border-strong hover:shadow-sm"
      } ${wrapperProps?.className ?? ""}`}
    >
      <div className="flex items-start gap-3">
        {prefix}

        {rank !== undefined && (
          <span
            className={`mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full border font-mono text-sm tabular-nums ${
              isTop3
                ? "border-accent/40 bg-accent-bg font-semibold text-accent"
                : "border-border-subtle bg-surface-hover text-text-secondary"
            }`}
          >
            {rank}
          </span>
        )}

        {categoryDot && !rank && (
          <span
            aria-hidden
            className="mt-2 h-2.5 w-2.5 flex-none rounded-full"
            style={{ background: CATEGORY_DOT_VAR[categoryDot] }}
            title={categoryDot}
          />
        )}

        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold leading-snug text-text-primary break-words">
            {book.title}
          </p>
          <p className="mt-0.5 text-sm text-text-secondary">{book.author}</p>
          {categoryDot && rank !== undefined && (
            <p className="mt-1 text-xs capitalize text-text-muted">
              Originally in {categoryDot}
            </p>
          )}
          <TagList tags={book.tags} className="mt-2.5" onTagClick={onTagClick} activeTags={activeTags} />
        </div>

        {actions && (
          <div className="flex-none flex items-center gap-0.5">{actions}</div>
        )}
      </div>
    </div>
  );
};

export default BookCard;
