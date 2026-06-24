import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import AddBookTab from "./components/AddBookTab";
import RankingsTab from "./components/RankingsTab";
import TbrTab from "./components/TbrTab";
import RereadTab from "./components/RereadTab";
import TabButton from "./components/TabButton";
import PublicView from "./components/PublicView";
import { API } from "./components/api";

const App: React.FC = () => {
  // Serve the read-only public view at /public — no auth, no edit controls.
  // Share yourdomain.pages.dev/public with anyone.
  if (window.location.pathname === "/public") {
    return <PublicView />;
  }

  const [books, setBooks] = useState<any>({});
  const [activeTab, setActiveTab] = useState<"add" | "rankings" | "tbr" | "reread">("add");

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
    }
  };

  useEffect(() => {
    fetchBooks();
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
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100 sm:p-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">Reading Log</span>
          </div>
          <h1 className="font-serif text-4xl font-semibold text-amber-400">Booki</h1>
        </header>

        {/* Tab bar */}
        <div className="mb-10 flex flex-wrap justify-center gap-1 border-b border-zinc-700">
          <TabButton label="Add Book" isActive={activeTab === "add"} onClick={() => setActiveTab("add")} />
          <TabButton label="Rankings" isActive={activeTab === "rankings"} onClick={() => setActiveTab("rankings")} />
          <TabButton label="TBR" isActive={activeTab === "tbr"} onClick={() => setActiveTab("tbr")} />
          <TabButton label="To Reread" isActive={activeTab === "reread"} onClick={() => setActiveTab("reread")} />
        </div>

        {/* Tab content */}
        <div className="mx-auto max-w-2xl">
          {activeTab === "add" && (
            <AddBookTab books={books} setBooks={setBooks} addTabState={addTabState} setAddTabState={setAddTabState} allTags={allTags} />
          )}
          {activeTab === "rankings" && <RankingsTab books={books} setBooks={setBooks} allTags={allTags} />}
          {activeTab === "tbr" && <TbrTab books={books} setBooks={setBooks} allTags={allTags} />}
          {activeTab === "reread" && <RereadTab books={books} setBooks={setBooks} allTags={allTags} />}
        </div>
      </div>
    </div>
  );
};

export default App;