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