// Central definitions for category display data so private/public views agree.
export const CATEGORY_LABEL: Record<string, string> = {
  "liked it": "Liked it",
  "it was ok": "It was ok",
  "didn't like it": "Didn't like it",
  tbr: "To be read",
  reread: "To reread",
};

// Uses CSS custom properties (set in index.css per theme) so dots re-color
// automatically when the user flips the theme.
export const CATEGORY_DOT_VAR: Record<string, string> = {
  "liked it": "var(--cat-liked)",
  "it was ok": "var(--cat-ok)",
  "didn't like it": "var(--cat-disliked)",
  tbr: "var(--cat-tbr)",
  reread: "var(--cat-reread)",
};

export const RANKING_CATEGORIES = ["liked it", "it was ok", "didn't like it"] as const;

export const isSpecialTag = (tag: string) =>
  tag === "currently-reading" || tag === "to-reread";
