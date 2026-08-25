import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API } from "./api";
import Header from "./Header";
import SearchBar from "./SearchBar";
import CategorySection from "./CategorySection";
import BookList, { BookListItem } from "./BookList";
import BookSkeleton from "./BookSkeleton";
import ActiveTagFilters from "./ActiveTagFilters";
import { RANKING_CATEGORIES } from "./bookMeta";

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

  const stats = useMemo(() => {
    const ranked = RANKING_CATEGORIES.reduce(
      (n, cat) => n + ((books[cat] as any[] | undefined)?.length ?? 0),
      0
    );
    const tbr = (books.tbr as any[] | undefined)?.length ?? 0;
    let reading = 0;
    Object.values(books).forEach((arr) => {
      if (!Array.isArray(arr)) return;
      arr.forEach((b: any) => {
        const tags = (b.tags || "").toLowerCase();
        if (tags.includes("currently-reading")) reading += 1;
      });
    });
    return { total: ranked + tbr, tbr, reading };
  }, [books]);

  return (
    <div className="min-h-screen bg-canvas text-text-primary">
      <Header
        tabs={[
          { key: "rankings", label: "Rankings" },
          { key: "tbr", label: "TBR" },
        ]}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {!loading && stats.total > 0 && (
          <p className="mb-6 text-sm text-text-secondary">
            <span className="font-medium text-text-primary tabular-nums">{stats.total}</span> books
            {stats.reading > 0 && (
              <>
                {" · "}
                <span className="tabular-nums">{stats.reading}</span> currently reading
              </>
            )}
            {stats.tbr > 0 && (
              <>
                {" · "}
                <span className="tabular-nums">{stats.tbr}</span> to read
              </>
            )}
          </p>
        )}

        {loading ? (
          <>
            <BookSkeleton count={4} />
            <BookSkeleton count={3} />
          </>
        ) : activeTab === "rankings" ? (
          <PublicRankings books={books} />
        ) : (
          <PublicTbr books={books} />
        )}
      </main>
    </div>
  );
};

// ── Read-only Rankings ────────────────────────────────────────────────────────

const matchesText = (b: any, q: string) => {
  if (!q) return true;
  const l = q.toLowerCase();
  return (
    b.title.toLowerCase().includes(l) ||
    b.author.toLowerCase().includes(l) ||
    (b.tags || "").toLowerCase().includes(l)
  );
};

const matchesTags = (b: any, tags: string[]) => {
  if (tags.length === 0) return true;
  const bookTags = (b.tags || "").split(",").map((t: string) => t.trim().toLowerCase());
  return tags.every((t) => bookTags.includes(t.toLowerCase()));
};

const PublicRankings: React.FC<{ books: any }> = ({ books }) => {
  const [search, setSearch] = useState("");
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const toggleTag = (tag: string) =>
    setTagFilters((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  let continuousIndex = 0;

  return (
    <div>
      <div className="mb-6">
        <SearchBar value={search} onChange={setSearch} />
      </div>

      <ActiveTagFilters
        tags={tagFilters}
        onRemove={(t) => setTagFilters((prev) => prev.filter((x) => x !== t))}
        onClearAll={() => setTagFilters([])}
        className="-mt-2 mb-4"
      />

      {RANKING_CATEGORIES.map((cat) => {
        const all: any[] = books[cat] || [];
        const filtered = all
          .map((book, index) => ({ book, index }))
          .filter(({ book }) => matchesText(book, search) && matchesTags(book, tagFilters));

        const startIndex = continuousIndex;
        continuousIndex += all.length;

        const items: BookListItem[] = filtered.map(({ book, index }) => ({
          key: book.id,
          book,
          rank: startIndex + index + 1,
          isTop3: index < 3,
        }));

        return (
          <CategorySection
            key={cat}
            category={cat}
            count={filtered.length}
            totalCount={all.length}
          >
            <BookList
              items={items}
              onTagClick={toggleTag}
              activeTags={tagFilters}
              empty={
                <p className="rounded-lg border border-dashed border-border-subtle p-4 text-sm italic text-text-muted">
                  {all.length === 0 ? "No books in this category yet" : "No books match your search"}
                </p>
              }
            />
          </CategorySection>
        );
      })}
    </div>
  );
};

// ── Read-only TBR ─────────────────────────────────────────────────────────────

const PublicTbr: React.FC<{ books: any }> = ({ books }) => {
  const [search, setSearch] = useState("");
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const toggleTag = (tag: string) =>
    setTagFilters((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const all: any[] = books.tbr || [];
  const filtered = all
    .map((book, index) => ({ book, index }))
    .filter(({ book }) => matchesText(book, search) && matchesTags(book, tagFilters));

  const items: BookListItem[] = filtered.map(({ book, index }) => ({
    key: book.id,
    book,
    rank: index + 1,
  }));

  return (
    <div>
      <div className="mb-6">
        <SearchBar value={search} onChange={setSearch} />
      </div>

      <ActiveTagFilters
        tags={tagFilters}
        onRemove={(t) => setTagFilters((prev) => prev.filter((x) => x !== t))}
        onClearAll={() => setTagFilters([])}
        className="-mt-2 mb-4"
      />

      <CategorySection
        category="tbr"
        count={filtered.length}
        totalCount={all.length}
      >
        <BookList
          items={items}
          onTagClick={toggleTag}
          activeTags={tagFilters}
          empty={
            <p className="rounded-lg border border-dashed border-border-subtle p-4 text-sm italic text-text-muted">
              {all.length === 0 ? "No books in the TBR list yet" : "No books match your search"}
            </p>
          }
        />
      </CategorySection>
    </div>
  );
};

export default PublicView;
