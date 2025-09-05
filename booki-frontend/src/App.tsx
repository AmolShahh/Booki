// src/App.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import AddBookTab from "./components/AddBookTab";
import RankingsTab from "./components/RankingsTab";
import TabButton from "./components/TabButton";

const API = "http://localhost:8000/api";

const App: React.FC = () => {
  const [books, setBooks] = useState<any>({});
  const [activeTab, setActiveTab] = useState<"add" | "rankings">("add");

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
        </div>

        {/* Tab content */}
        <div className="max-w-2xl mx-auto">
          {activeTab === "add" && (
            <AddBookTab
              books={books}
              setBooks={setBooks}
              addTabState={addTabState}
              setAddTabState={setAddTabState}
            />
          )}
          {activeTab === "rankings" && (
            <RankingsTab books={books} setBooks={setBooks} />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
