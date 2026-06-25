import React, { useEffect, useState } from "react";
import axios from "axios";
import { API } from "./api";

const RANKING_CATEGORIES = ["liked it", "it was ok", "didn't like it"] as const;

const CATEGORY_DOT: Record<string, string> = {
  "liked it": "bg-emerald-400",
  "it was ok": "bg-amber-400",
  "didn't like it": "bg-rose-400",
  tbr: "bg-sky-400",
};

const PublicView: React.FC = () => {
  const [books, setBooks] = useState<any>({});
  const [activeTab, setActiveTab] = useState<"rankings" | "tbr">("rankings");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API}/books`)
      .then((res) => setBooks(res.data))
      .catch((e) => console.error("Failed to fetch books:", e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100 sm:p-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">Reading Log</span>
          </div>
          <h1 className="font-serif text-4xl font-semibold text-amber-400">Booki</h1>
          <p className="mt-3 text-sm text-zinc-500">Public read-only view</p>
        </header>

        {/* Tab bar */}
        <div className="mb-10 flex justify-center gap-1 border-b border-zinc-700">
          {(["rankings", "tbr"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-5 py-2.5 text-sm font-medium transition-colors duration-150 ${
                activeTab === tab ? "text-amber-400" : "text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {tab === "rankings" ? "Rankings" : "TBR"}
              <span
                className={`absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-amber-400 transition-opacity duration-150 ${
                  activeTab === tab ? "opacity-100" : "opacity-0"
                }`}
              />
            </button>
          ))}
        </div>

        <div className="mx-auto max-w-2xl">
          {loading ? (
            <p className="text-center text-sm text-zinc-500">Loading…</p>
          ) : activeTab === "rankings" ? (
            <PublicRankings books={books} />
          ) : (
            <PublicTbr books={books} />
          )}
        </div>
      </div>
    </div>
  );
};

// ── Read-only Rankings ────────────────────────────────────────────────────────

const PublicRankings: React.FC<{ books: any }> = ({ books }) => {
  const [search, setSearch] = useState("");

  let continuousIndex = 0;

  return (
    <div>
      <div className="mb-6">
        <input
          placeholder="Search by title, author, or tag…"
          className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {RANKING_CATEGORIES.map((cat) => {
        const all: any[] = books[cat] || [];
        const filtered = all
          .map((b, i) => ({ ...b, originalIndex: i }))
          .filter((b) => {
            if (!search) return true;
            const q = search.toLowerCase();
            return (
              b.title.toLowerCase().includes(q) ||
              b.author.toLowerCase().includes(q) ||
              (b.tags || "").toLowerCase().includes(q)
            );
          });

        const startIndex = continuousIndex;
        continuousIndex += all.length;

        return (
          <div key={cat} className="mb-8">
            <h2 className="mb-4 flex items-center gap-2.5 font-serif text-xl font-semibold text-zinc-50">
              <span className={`h-2.5 w-2.5 rounded-full ${CATEGORY_DOT[cat]}`} />
              <span className="capitalize">{cat}</span>
              <span className="font-sans text-sm font-normal text-zinc-400">
                {filtered.length} of {all.length}
              </span>
            </h2>

            {all.length === 0 && (
              <p className="rounded-lg border border-dashed border-zinc-700 p-4 text-sm italic text-zinc-500">
                No books in this category yet
              </p>
            )}
            {all.length > 0 && filtered.length === 0 && (
              <p className="rounded-lg border border-dashed border-zinc-700 p-4 text-sm italic text-zinc-500">
                No books match your search
              </p>
            )}

            {filtered.map((book) => (
              <div
                key={book.id}
                className="mb-3 rounded-xl border border-zinc-600 bg-zinc-800 p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full border border-zinc-600 bg-zinc-700 text-sm font-semibold text-amber-400">
                    {startIndex + book.originalIndex + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-base font-semibold text-zinc-50">{book.title}</p>
                    <p className="mt-0.5 text-sm text-zinc-300">{book.author}</p>
                    {book.tags && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {book.tags.split(",").map((tag: string, i: number) => (
                          <span
                            key={i}
                            className="rounded-full border border-zinc-600 bg-zinc-700 px-2.5 py-0.5 text-xs font-medium text-zinc-300"
                          >
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

// ── Read-only TBR ─────────────────────────────────────────────────────────────

const PublicTbr: React.FC<{ books: any }> = ({ books }) => {
  const [search, setSearch] = useState("");

  const all: any[] = books["tbr"] || [];
  const filtered = all.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      (b.tags || "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="mb-6">
        <input
          placeholder="Search by title, author, or tag…"
          className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mb-4 flex items-center gap-2.5">
        <span className={`h-2.5 w-2.5 rounded-full ${CATEGORY_DOT["tbr"]}`} />
        <h2 className="font-serif text-xl font-semibold text-zinc-50">TBR</h2>
        <span className="font-sans text-sm font-normal text-zinc-400">
          {filtered.length} of {all.length} books
        </span>
      </div>

      {all.length === 0 && (
        <p className="rounded-lg border border-dashed border-zinc-700 p-4 text-sm italic text-zinc-500">
          No books in the TBR list yet
        </p>
      )}

      <div className="space-y-3">
        {filtered.map((book, index) => (
          <div
            key={book.id}
            className="rounded-xl border border-zinc-600 bg-zinc-800 p-5"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full border border-zinc-600 bg-zinc-700 text-sm font-semibold text-amber-400">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-base font-semibold text-zinc-50">{book.title}</p>
                <p className="mt-0.5 text-sm text-zinc-300">{book.author}</p>
                {book.tags && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {book.tags.split(",").map((tag: string, i: number) => (
                      <span
                        key={i}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          tag.trim() === "currently-reading"
                            ? "border border-sky-500/40 bg-sky-500/20 text-sky-300"
                            : "border border-zinc-600 bg-zinc-700 text-zinc-300"
                        }`}
                      >
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PublicView;