import React from "react";
import { X } from "lucide-react";

interface ActiveTagFiltersProps {
  tags: string[];
  onRemove: (tag: string) => void;
  onClearAll: () => void;
  className?: string;
}

const ActiveTagFilters: React.FC<ActiveTagFiltersProps> = ({
  tags,
  onRemove,
  onClearAll,
  className = "",
}) => {
  if (tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="text-xs text-text-muted">Filtering by</span>
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => onRemove(tag)}
          className="inline-flex items-center gap-1 rounded-full border border-accent bg-accent-bg px-2 py-0.5 text-[11px] font-medium text-accent transition-opacity hover:opacity-80"
          title={`Remove "${tag}" filter`}
        >
          {tag}
          <X size={11} strokeWidth={2.5} />
        </button>
      ))}
      {tags.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="ml-1 text-xs text-text-muted transition-colors hover:text-text-primary"
        >
          Clear all
        </button>
      )}
    </div>
  );
};

export default ActiveTagFilters;
