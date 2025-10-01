import axios from "axios";

const API = "https://booki-2od.pages.dev/api";

export const searchBooks = (query: string) =>
  axios.get(`${API}/search?q=${encodeURIComponent(query)}`).then(res => res.data);

export const getBooks = () =>
  axios.get(`${API}/books`).then(res => res.data);

export const nextComparison = (category: string) =>
  axios.get(`${API}/next_comparison?category=${encodeURIComponent(category)}`).then(res => res.data);

export const recordComparison = (category: string, newBook: any, midIndex: number, betterThan: boolean) =>
  axios.post(
    `${API}/record_comparison?category=${encodeURIComponent(category)}&mid_index=${midIndex}&better_than=${betterThan}`,
    { ...newBook, category }
  ).then(res => res.data);
