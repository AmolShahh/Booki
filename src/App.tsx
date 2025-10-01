import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import AddBookTab from "./components/AddBookTab";
import RankingsTab from "./components/RankingsTab";
import TbrTab from "./components/TbrTab";
import TabButton from "./components/TabButton";

const API = "https://booki-2od.pages.dev/api";

const App: React.FC = () => {
  const [books, setBooks] = useState<any>({});
  const [activeTab, setActiveTab] = useState<"add" | "rankings" | "tbr">("add");

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

  // Generate a list of all unique tags from the 'books' state
  const allTags = useMemo(() => {
    const uniqueTags = new Set<string>();
    Object.values(books).forEach((categoryBooks) => {
      if (Array.isArray(categoryBooks)) {
        categoryBooks.forEach((book) => {
          if (book.tags) {
            book.tags.split(",").forEach((tag: string) => {
              const trimmedTag = tag.trim();
              if (trimmedTag) {
                uniqueTags.add(trimmedTag.toLowerCase());
              }
            });
          }
        });
      }
    });
    return Array.from(uniqueTags);
  }, [books]);

  return (
    <div className="min-h-screen bg-orange-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center text-gray-800">
          <span className="text-orange-500">📚</span> Booki
        </h1>

        {/* Tabs */}
        <div className="flex justify-center mb-8 gap-2">
          <TabButton
            label="Add Book"
            isActive={activeTab === "add"}
            onClick={() => setActiveTab("add")}
          />
          <TabButton
            label="Rankings"
            isActive={activeTab === "rankings"}
            onClick={() => setActiveTab("rankings")}
          />
          <TabButton
            label="TBR"
            isActive={activeTab === "tbr"}
            onClick={() => setActiveTab("tbr")}
          />
        </div>

        {/* Tab content */}
        <div className="max-w-2xl mx-auto">
          {activeTab === "add" && (
            <AddBookTab
              books={books}
              setBooks={setBooks}
              addTabState={addTabState}
              setAddTabState={setAddTabState}
              allTags={allTags}
            />
          )}
          {activeTab === "rankings" && (
            <RankingsTab books={books} setBooks={setBooks} allTags={allTags} />
          )}
          {activeTab === "tbr" && (
            <TbrTab books={books} setBooks={setBooks} allTags={allTags} />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;