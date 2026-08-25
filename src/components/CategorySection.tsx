import React from "react";
import { CATEGORY_DOT_VAR, CATEGORY_LABEL } from "./bookMeta";

interface CategorySectionProps {
  category: string;
  count: number;
  totalCount?: number;
  children: React.ReactNode;
  /** Optional right-slot content (e.g. an inline action). */
  right?: React.ReactNode;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  count,
  totalCount,
  children,
  right,
}) => {
  return (
    <section className="mb-8">
      <div className="sticky top-14 z-10 -mx-3 mb-3 flex items-center justify-between gap-3 border-b border-border-subtle bg-canvas/85 px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="h-2 w-2 rounded-full"
            style={{ background: CATEGORY_DOT_VAR[category] }}
          />
          <h2 className="font-serif text-base font-semibold text-text-primary">
            {CATEGORY_LABEL[category] ?? category}
          </h2>
          <span className="text-xs text-text-muted tabular-nums">
            {totalCount !== undefined && totalCount !== count
              ? `${count} of ${totalCount}`
              : count}
          </span>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
};

export default CategorySection;
