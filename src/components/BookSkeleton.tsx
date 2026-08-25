import React from "react";

interface BookSkeletonProps {
  count?: number;
  showHeader?: boolean;
}

const BookSkeleton: React.FC<BookSkeletonProps> = ({ count = 5, showHeader = true }) => {
  return (
    <div className="mb-8">
      {showHeader && (
        <div className="mb-3 flex items-center gap-2.5 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-surface-hover animate-pulse" />
          <span className="h-4 w-24 rounded bg-surface-hover animate-pulse" />
          <span className="h-3 w-8 rounded bg-surface-hover animate-pulse" />
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-border-subtle/60 px-3 py-3 last:border-b-0"
          >
            <span className="h-4 w-6 rounded bg-surface-hover animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-2/3 rounded bg-surface-hover animate-pulse" />
              <div className="h-3 w-1/3 rounded bg-surface-hover animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookSkeleton;
