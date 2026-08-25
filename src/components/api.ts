export const API = "https://booki-2od.pages.dev/api";

// Pre-configured axios instance for mutating requests (POST/PUT/DELETE).
// Reads the secret from the VITE_API_SECRET env var at build time —
// set this in Cloudflare Pages → Settings → Environment variables.
// GET requests (public view, initial load) use plain axios and don't need the key.
import axios from "axios";

export const authAxios = axios.create({
  headers: {
    "x-api-key": import.meta.env.VITE_API_SECRET,
  },
});

/** The DB may hold NULL for older rows that predate the times_read column;
 *  infer a sensible display value from the category (TBR = 0, ranked/reread = 1)
 *  until the row gets its next mutation and we backfill it for real. */
export const inferTimesRead = (book: any): number => {
  if (typeof book?.times_read === "number") return book.times_read;
  return book?.category === "tbr" ? 0 : 1;
};

/** Wrapper around authAxios.put that opportunistically fills in times_read
 *  when the DB row is currently NULL. Ensures a book's read count gets
 *  materialized the first time the user touches the row after the column
 *  was added — no separate backfill migration needed. */
export const putBook = (book: any, patch: Record<string, any>) => {
  const payload: Record<string, any> = { ...patch };
  if (typeof book?.times_read !== "number" && !("times_read" in patch)) {
    payload.times_read = inferTimesRead(book);
  }
  return authAxios.put(`${API}/books/${book.id}`, payload);
};

/** Mirror putBook's implicit times_read fill in the local state update, so
 *  the UI shows the materialized count immediately (no re-fetch required). */
export const applyBookPatch = (book: any, patch: Record<string, any>): any => {
  const merged = { ...book, ...patch };
  if (typeof merged.times_read !== "number") {
    merged.times_read = inferTimesRead(book);
  }
  return merged;
};

/** Turns an axios/network error into a user-facing string with the server's own
 *  error details when present, so toasts show why a mutation failed. */
export const apiErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const data: any = error.response?.data;
    if (typeof data?.details === "string") return `${fallback}: ${data.details}`;
    if (typeof data?.error === "string") return `${fallback}: ${data.error}`;
    if (error.response?.status) return `${fallback} (HTTP ${error.response.status})`;
    if (error.message) return `${fallback}: ${error.message}`;
  }
  return fallback;
};