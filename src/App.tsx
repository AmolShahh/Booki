import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import AddBookTab from "./components/AddBookTab";
import RankingsTab from "./components/RankingsTab";
import TbrTab from "./components/TbrTab";
import RereadTab from "./components/RereadTab";
import Header from "./components/Header";
import PublicView from "./components/PublicView";
import { API } from "./components/api";

type TabKey = "add" | "rankings" | "tbr" | "reread";

const TABS: { key: TabKey; label: string }[] = [
  { key: "add", label: "Add" },
  { key: "rankings", label: "Rankings" },
  { key: "tbr", label: "TBR" },
  { key: "reread", label: "Reread" },
];

const App: React.FC = () => {
  // Serve the read-only public view at /public — no auth, no edit controls.
  // Share yourdomain.pages.dev/public with anyone.
  if (window.location.pathname === "/public") {
    return <PublicView />;
  }

  const [books, setBooks] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("add");

  const [addTabState, setAddTabState] = useState<any>({
    query: "",
    results: [],
    addingBook: null,
    selectedCategory: "liked it",
    tagsInput: "",
    low: 0,
    high: 0,
    midIndex: 0,
    showAddModal: false,
    showComparisonModal: false,
    isComparing: false,
  });

  const fetchBooks = async () => {
    try {
      const res = await axios.get(`${API}/books`);
      setBooks(res.data);
    } catch (e) {
      console.error("Failed to fetch books:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  // Keyboard shortcut: 1/2/3/4 switches tabs (ignored while typing).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target;
      if (t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const idx = ["1", "2", "3", "4"].indexOf(e.key);
      if (idx === -1) return;
      const key = TABS[idx]?.key;
      if (key) setActiveTab(key);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const allTags = useMemo(() => {
    const uniqueTags = new Set<string>();
    Object.values(books).forEach((categoryBooks) => {
      if (Array.isArray(categoryBooks)) {
        categoryBooks.forEach((book) => {
          if (book.tags) {
            book.tags.split(",").forEach((tag: string) => {
              const trimmedTag = tag.trim();
              if (trimmedTag) uniqueTags.add(trimmedTag.toLowerCase());
            });
          }
        });
      }
    });
    return Array.from(uniqueTags);
  }, [books]);

  return (
    <div className="min-h-screen bg-canvas text-text-primary">
      <Header tabs={TABS} activeTab={activeTab} onSelectTab={setActiveTab} />

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {activeTab === "add" && (
          <AddBookTab books={books} setBooks={setBooks} addTabState={addTabState} setAddTabState={setAddTabState} allTags={allTags} />
        )}
        {activeTab === "rankings" && <RankingsTab books={books} setBooks={setBooks} allTags={allTags} loading={loading} />}
        {activeTab === "tbr" && <TbrTab books={books} setBooks={setBooks} allTags={allTags} loading={loading} />}
        {activeTab === "reread" && <RereadTab books={books} setBooks={setBooks} allTags={allTags} loading={loading} />}
      </main>
    </div>
  );
};

export default App;
