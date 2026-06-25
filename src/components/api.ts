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