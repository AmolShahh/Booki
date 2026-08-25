import React from "react";
import BookRow, { BookRowProps } from "./BookRow";
import BookCard, { BookCardProps } from "./BookCard";
import { useDensity } from "./DensityContext";

export interface BookListItem
  extends Omit<BookRowProps, "actions" | "wrapperProps" | "isDragging" | "prefix"> {
  key: string | number;
  actions?: React.ReactNode;
  wrapperProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragging?: boolean;
  prefix?: React.ReactNode;
}

interface BookListProps {
  items: BookListItem[];
  empty?: React.ReactNode;
  onTagClick?: (tag: string) => void;
  activeTags?: string[];
}

const BookList: React.FC<BookListProps> = ({ items, empty, onTagClick, activeTags }) => {
  const { density } = useDensity();

  if (items.length === 0 && empty) return <>{empty}</>;

  if (density === "compact") {
    return (
      <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface">
        {items.map(({ key, ...props }) => (
          <BookRow key={key} {...(props as BookRowProps)} onTagClick={onTagClick} activeTags={activeTags} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map(({ key, ...props }) => (
        <BookCard key={key} {...(props as BookCardProps)} onTagClick={onTagClick} activeTags={activeTags} />
      ))}
    </div>
  );
};

export default BookList;
