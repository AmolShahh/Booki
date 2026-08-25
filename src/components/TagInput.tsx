import React, { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

interface TagInputProps {
  /** Comma-separated tag string (matches the existing storage format). */
  value: string;
  onChange: (v: string) => void;
  allTags: string[];
  placeholder?: string;
  autoFocus?: boolean;
}

const splitTags = (v: string): string[] =>
  v.split(",").map((t) => t.trim()).filter(Boolean);

const joinTags = (tags: string[]): string =>
  tags.length === 0 ? "" : tags.join(", ") + ", ";

const TagInput: React.FC<TagInputProps> = ({
  value,
  onChange,
  allTags,
  placeholder = "Type to add a tag…",
  autoFocus,
}) => {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const committed = useMemo(() => splitTags(value), [value]);
  const committedLower = useMemo(() => committed.map((t) => t.toLowerCase()), [committed]);

  const suggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    return allTags
      .filter((t) => !committedLower.includes(t.toLowerCase()))
      .filter((t) => !q || t.toLowerCase().includes(q))
      .sort((a, b) => a.localeCompare(b));
  }, [allTags, committedLower, draft]);

  const canCreate =
    draft.trim().length > 0 &&
    !suggestions.some((s) => s.toLowerCase() === draft.trim().toLowerCase()) &&
    !committedLower.includes(draft.trim().toLowerCase());

  // Reset highlight when the suggestion list changes.
  useEffect(() => {
    setActiveIndex(0);
  }, [draft, value]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Close on outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const commit = (tag: string) => {
    const clean = tag.trim();
    if (!clean) return;
    if (committedLower.includes(clean.toLowerCase())) {
      // Already present — just clear the draft.
      setDraft("");
      return;
    }
    onChange(joinTags([...committed, clean]));
    setDraft("");
    setActiveIndex(0);
    inputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    onChange(joinTags(committed.filter((t) => t !== tag)));
    inputRef.current?.focus();
  };

  const totalOptions = suggestions.length + (canCreate ? 1 : 0);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      if (open && totalOptions > 0) {
        e.preventDefault();
        if (activeIndex < suggestions.length) commit(suggestions[activeIndex]);
        else commit(draft);
      } else if (draft.trim()) {
        e.preventDefault();
        commit(draft);
      }
    } else if (e.key === "ArrowDown") {
      if (!open) setOpen(true);
      e.preventDefault();
      setActiveIndex((i) => (totalOptions === 0 ? 0 : Math.min(i + 1, totalOptions - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "," || (e.key === " " && draft.endsWith(" "))) {
      if (draft.trim()) {
        e.preventDefault();
        commit(draft);
      }
    } else if (e.key === "Backspace" && draft === "" && committed.length > 0) {
      e.preventDefault();
      removeTag(committed[committed.length - 1]);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex min-h-[42px] w-full cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-sunken px-2 py-1.5 text-sm transition-colors focus-within:border-accent focus-within:ring-1 focus-within:ring-accent"
      >
        {committed.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent-bg px-2 py-0.5 text-[11px] font-medium text-accent"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="rounded-full p-0.5 opacity-70 transition-opacity hover:opacity-100"
              aria-label={`Remove ${tag}`}
            >
              <X size={11} strokeWidth={2.5} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={committed.length === 0 ? placeholder : ""}
          className="min-w-[8ch] flex-1 bg-transparent px-1 py-0.5 text-sm text-text-primary placeholder-text-muted focus:outline-none"
        />
      </div>

      {open && totalOptions > 0 && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border-subtle bg-surface shadow-lg shadow-black/20"
        >
          {suggestions.map((tag, i) => (
            <button
              key={tag}
              type="button"
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                commit(tag);
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm transition-colors ${
                i === activeIndex ? "bg-accent-bg text-accent" : "text-text-primary hover:bg-surface-hover"
              }`}
            >
              <span>{tag}</span>
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              role="option"
              aria-selected={activeIndex === suggestions.length}
              onMouseDown={(e) => {
                e.preventDefault();
                commit(draft);
              }}
              onMouseEnter={() => setActiveIndex(suggestions.length)}
              className={`flex w-full items-center justify-between border-t border-border-subtle px-3 py-1.5 text-left text-sm transition-colors ${
                activeIndex === suggestions.length ? "bg-accent-bg text-accent" : "text-text-primary hover:bg-surface-hover"
              }`}
            >
              <span>
                Create <span className="font-medium">"{draft.trim()}"</span>
              </span>
              <span className="text-xs text-text-muted">↵</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TagInput;
