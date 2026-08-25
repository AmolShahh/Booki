import React from "react";
import TagList from "./TagList";
import { CATEGORY_DOT_VAR } from "./bookMeta";

export interface BookRowProps {
  book: any;
  rank?: number;
  isTop3?: boolean;
  /** Optional category dot shown between rank and title (useful in Reread view). */
  categoryDot?: string;
  /** Icon-cluster actions rendered on the right; revealed on hover. */
  actions?: React.ReactNode;
  /** Wraps the row; used by TBR drag-and-drop to attach handlers. */
  wrapperProps?: React.HTMLAttributes<HTMLDivElement>;
  /** True while this row is being dragged (dim + reduce interaction). */
  isDragging?: boolean;
  /** Optional prefix (e.g. drag handle). */
  prefix?: React.ReactNode;
  /** When provided, tag pills become clickable filters. */
  onTagClick?: (tag: string) => void;
  /** Currently-active tag filters (visually highlights matching pills). */
  activeTags?: string[];
}

const BookRow: React.FC<BookRowProps> = ({
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
      className={`group relative flex items-start gap-3 border-b border-border-subtle/60 px-3 py-2.5 transition-colors last:border-b-0 ${
        isDragging ? "opacity-30" : "hover:bg-surface-hover"
      } ${wrapperProps?.className ?? ""}`}
    >
      {prefix}

      {rank !== undefined && (
        <span
          className={`mt-0.5 w-8 flex-none text-right font-mono text-sm tabular-nums ${
            isTop3 ? "font-semibold text-accent" : "text-text-muted"
          }`}
        >
          {rank}
        </span>
      )}

      {categoryDot && (
        <span
          aria-hidden
          className="mt-[9px] h-2 w-2 flex-none rounded-full"
          style={{ background: CATEGORY_DOT_VAR[categoryDot] }}
          title={categoryDot}
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-x-2 gap-y-0.5 flex-wrap">
          <span className="text-[15px] font-medium leading-snug text-text-primary break-words">
            {book.title}
          </span>
          <span className="text-sm text-text-secondary">{book.author}</span>
        </div>
        <TagList tags={book.tags} className="mt-1" onTagClick={onTagClick} activeTags={activeTags} />
      </div>

      {actions && (
        <div className="flex-none self-center flex items-center gap-0.5 opacity-100 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          {actions}
        </div>
      )}
    </div>
  );
};

export default BookRow;
