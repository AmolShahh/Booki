import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import Modal from "./Modal";
import Button from "./Button";
import { API, authAxios } from "./api";

interface AddBookTabProps {
  books: any;
  setBooks: React.Dispatch<React.SetStateAction<any>>;
  addTabState: any;
  setAddTabState: React.Dispatch<React.SetStateAction<any>>;
  allTags: string[];
}

const CATEGORIES = ["liked it", "it was ok", "didn't like it", "tbr"];

const AddBookTab: React.FC<AddBookTabProps> = ({ books, setBooks, addTabState, setAddTabState, allTags }) => {
  const {
    query, results, addingBook, selectedCategory, tagsInput,
    low, high, midIndex, showAddModal, showComparisonModal, isComparing,
  } = addTabState;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importQueue, setImportQueue] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");
  const [manualError, setManualError] = useState("");
  const [csvError, setCsvError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const update = (field: string, value: any) => setAddTabState((prev: any) => ({ ...prev, [field]: value }));
  const allBooks = Object.values(books).flat();

  const handleSearch = async () => {
    if (!query) return;
    setIsSearching(true);
    try {
      const res = await axios.get(`${API}/search?q=${encodeURIComponent(query)}`);
      update("results", res.data.results || []);
    } catch (error) {
      console.error("Error searching books:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const openAddModal = (book: any) => {
    update("addingBook", book);
    update("selectedCategory", CATEGORIES[0]);
    update("tagsInput", "");
    update("showAddModal", true);
  };

  const handleTagClick = (tag: string) => {
    const currentTags = tagsInput.split(",").map((t: string) => t.trim()).filter(Boolean);
    const newTags = new Set(currentTags);
    if (newTags.has(tag)) newTags.delete(tag);
    else newTags.add(tag.toLowerCase());
    update("tagsInput", Array.from(newTags).join(", "));
  };

  const confirmAddBook = async () => {
    setIsProcessing(true);
    const arr = (books[selectedCategory] || []).filter(
      (b: any) => !(b.title === addingBook.title && b.author === addingBook.author)
    );
    if (selectedCategory === "tbr") {
      update("showAddModal", false);
      let updated = books[selectedCategory] || [];
      updated.splice(updated.length, 0, { ...addingBook, tags: tagsInput });
      setBooks({ ...books, [selectedCategory]: updated });
      await authAxios.post(`${API}/books`, { ...addingBook, category: selectedCategory, position: updated.length - 1, tags: tagsInput });
      setAddTabState((prev: any) => ({ ...prev, addingBook: null, showAddModal: false, showComparisonModal: false, isComparing: false }));
      setIsProcessing(false);
      return;
    } else if (arr.length === 0) {
      update("showAddModal", false);
      setBooks({ ...books, [selectedCategory]: [{ ...addingBook, tags: tagsInput }] });
      await authAxios.post(`${API}/books`, { ...addingBook, category: selectedCategory, position: 0, tags: tagsInput });
      setAddTabState((prev: any) => ({ ...prev, addingBook: null, showAddModal: false, showComparisonModal: false, isComparing: false }));
      setIsProcessing(false);
    } else {
      setAddTabState((prev: any) => ({
        ...prev, showAddModal: false, low: 0, high: arr.length,
        midIndex: Math.floor(arr.length / 2), isComparing: true, showComparisonModal: true,
      }));
      setIsProcessing(false);
    }
  };

  const currentComparison = () => {
    const arr = (books[selectedCategory] || []).filter(
      (b: any) => !(b.title === addingBook.title && b.author === addingBook.author)
    );
    return arr[midIndex];
  };

  const handleComparison = async (newBetter: boolean) => {
    setIsProcessing(true);
    const arr = (books[selectedCategory] || []).filter(
      (b: any) => !(b.title === addingBook.title && b.author === addingBook.author)
    );
    let newLow = low;
    let newHigh = high;
    if (newBetter) newHigh = midIndex;
    else newLow = midIndex + 1;

    if (newLow >= newHigh) {
      const position = newLow;
      const updated = [...arr];
      updated.splice(position, 0, { ...addingBook, tags: tagsInput });
      setBooks({ ...books, [selectedCategory]: updated });
      await authAxios.post(`${API}/books`, { ...addingBook, category: selectedCategory, position, tags: tagsInput });
      setAddTabState((prev: any) => ({ ...prev, addingBook: null, low: 0, high: 0, midIndex: 0, showComparisonModal: false, isComparing: false }));
      setIsProcessing(false);
      return;
    }
    update("low", newLow); update("high", newHigh); update("midIndex", Math.floor((newLow + newHigh) / 2));
    setIsProcessing(false);
  };

  const handleManualAdd = () => {
    if (!manualTitle.trim() || !manualAuthor.trim()) { setManualError("Please enter both a title and an author."); return; }
    const exists = allBooks.some((b: any) => b.title === manualTitle.trim() && b.author === manualAuthor.trim());
    if (exists) { setManualError("This book is already in your collection."); return; }
    setManualError("");
    setShowManualEntryModal(false);
    openAddModal({ title: manualTitle.trim(), author: manualAuthor.trim() });
    setManualTitle(""); setManualAuthor("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvError("");
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => parseGoodreadsCsv(event.target?.result as string);
      reader.readAsText(file);
    }
  };

  const parseGoodreadsCsv = (csvText: string) => {
    const lines = csvText.split("\n");
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const titleIndex = headers.indexOf("Title");
    const authorIndex = headers.indexOf("Author");
    const myRatingIndex = headers.indexOf("My Rating");
    const shelfIndex = headers.indexOf("Exclusive Shelf");
    const readCountIndex = headers.indexOf("Read Count");

    if (titleIndex === -1 || authorIndex === -1 || myRatingIndex === -1 || shelfIndex === -1) {
      setCsvError("Invalid Goodreads CSV file. Missing required columns (Title, Author, My Rating, Exclusive Shelf).");
      return;
    }

    const newBooks = lines.slice(1).map((line) => {
      if (!line.trim()) return null;
      const cols: any = [];
      let inQuote = false; let col = "";
      for (const char of line) {
        if (char === '"') inQuote = !inQuote;
        else if (char === "," && !inQuote) { cols.push(col.trim().replace(/"/g, "")); col = ""; }
        else col += char;
      }
      cols.push(col.trim().replace(/"/g, ""));
      if (cols.length <= Math.max(titleIndex, authorIndex, myRatingIndex, shelfIndex, readCountIndex)) return null;
      const getCol = (i: number) => cols[i] || "";
      const title = getCol(titleIndex);
      const author = getCol(authorIndex);
      const rating = parseInt(getCol(myRatingIndex), 10);
      const shelf = getCol(shelfIndex);
      const readCount = readCountIndex !== -1 ? parseInt(getCol(readCountIndex), 10) : 1;
      let category = "";
      if (shelf === "to-read") category = "tbr";
      else if (rating >= 4) category = "liked it";
      else if (rating === 3) category = "it was ok";
      else if (rating > 0) category = "didn't like it";
      return { title, author, category, rating, readCount };
    }).filter(Boolean);

    const uniqueNewBooks = newBooks.filter((book) =>
      !allBooks.some((eb: any) => eb.title === book?.title && eb.author === book?.author)
    );
    setImportQueue(uniqueNewBooks);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    if (importQueue.length > 0 && !isProcessing && !addTabState.showAddModal && !addTabState.showComparisonModal && !addTabState.addingBook) {
      const nextBook = importQueue[0];
      update("addingBook", { title: nextBook.title, author: nextBook.author, rating: nextBook.rating, readCount: nextBook.readCount });
      update("selectedCategory", nextBook.category);
      update("tagsInput", "");
      update("showAddModal", true);
      setImportQueue(importQueue.slice(1));
    }
  }, [importQueue, isProcessing, addTabState.showAddModal, addTabState.showComparisonModal, addTabState.addingBook]);

  const selectedTags = tagsInput.split(",").map((t: string) => t.trim()).filter(Boolean);

  return (
    <div>
      {csvError && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-rose-500/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-300">
          <span>{csvError}</span>
          <button onClick={() => setCsvError("")} aria-label="Dismiss" className="flex-none text-rose-400 hover:text-rose-200">✕</button>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-3">
        <input
          className="min-w-[200px] flex-1 rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 shadow-sm transition-colors focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          placeholder="Search for a book…"
          value={query}
          onChange={(e) => update("query", e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
        />
        <Button onClick={handleSearch} disabled={isSearching}>
          {isSearching ? "Searching…" : "Search"}
        </Button>
        <Button onClick={() => setShowManualEntryModal(true)} variant="secondary">Add Manually</Button>
        <Button onClick={() => fileInputRef.current?.click()} variant="secondary">Import CSV</Button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" style={{ display: "none" }} />
      </div>

      {!isComparing && results.map((book: any, i: number) => {
        const exists = allBooks.some((b: any) => b.title === book.title && b.author === book.author);
        return (
          <div
            key={`${book.title}-${book.author}-${i}`}
            className="mb-3 flex items-center justify-between rounded-xl border border-zinc-600 bg-zinc-800 p-5 transition-colors duration-150 hover:border-zinc-500"
          >
            <div className="min-w-0">
              <p className="break-words text-base font-semibold text-zinc-50">{book.title}</p>
              <p className="mt-0.5 text-sm text-zinc-300">{book.author}</p>
            </div>
            <Button onClick={() => openAddModal(book)} disabled={exists} variant={exists ? "secondary" : "primary"} size="sm" className="ml-4 flex-none">
              {exists ? "Added" : "Add +"}
            </Button>
          </div>
        );
      })}

      {/* Manual Entry Modal */}
      {showManualEntryModal && (
        <Modal onClose={() => { setShowManualEntryModal(false); setManualTitle(""); setManualAuthor(""); setManualError(""); }}>
          <h2 className="mb-6 font-serif text-xl font-semibold text-zinc-50">Add Book Manually</h2>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-zinc-300">Book Title</label>
            <input
              className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="Enter book title…"
              value={manualTitle}
              onChange={(e) => { setManualTitle(e.target.value); if (manualError) setManualError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleManualAdd(); } }}
            />
          </div>
          <div className="mb-2">
            <label className="mb-2 block text-sm font-medium text-zinc-300">Author</label>
            <input
              className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="Enter author name…"
              value={manualAuthor}
              onChange={(e) => { setManualAuthor(e.target.value); if (manualError) setManualError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleManualAdd(); } }}
            />
          </div>
          {manualError && <p className="mb-4 mt-2 text-sm text-rose-400">{manualError}</p>}
          <Button onClick={handleManualAdd} className="mt-4 w-full">Continue</Button>
        </Modal>
      )}

      {/* Add Book Modal */}
      {showAddModal && addingBook && (
        <Modal onClose={() => { setAddTabState((prev: any) => ({ ...prev, showAddModal: false, addingBook: null, isComparing: false, showComparisonModal: false })); setIsProcessing(false); }}>
          <h2 className="mb-6 font-serif text-xl font-semibold text-zinc-50">Add Book</h2>
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="font-medium text-zinc-100">{addingBook.title}</p>
            <p className="mt-1 text-sm text-zinc-400">by {addingBook.author}</p>
            {addingBook.rating > 0 && <p className="mt-2 text-sm font-medium text-amber-400">Goodreads rating: {addingBook.rating}/5</p>}
            {addingBook.readCount > 1 && <p className="mt-1 text-sm font-medium text-amber-400">Read count: {addingBook.readCount}</p>}
          </div>
          <div className="mb-6">
            <p className="mb-3 text-sm font-medium text-zinc-300">Category:</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Button key={c} onClick={() => update("selectedCategory", c)} variant={selectedCategory === c ? "primary" : "secondary"} size="sm">{c}</Button>
              ))}
            </div>
          </div>
          <div className="mb-6">
            <p className="mb-2 text-sm font-medium text-zinc-300">Tags (optional):</p>
            <input
              className="mb-3 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="Type tags or click existing ones…"
              value={tagsInput}
              onChange={(e) => update("tagsInput", e.target.value)}
            />
            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-2">
              {allTags.map((tag) => (
                <Button key={tag} onClick={() => handleTagClick(tag)} variant="tag" active={selectedTags.includes(tag)}>{tag}</Button>
              ))}
            </div>
          </div>
          <Button onClick={confirmAddBook} disabled={isProcessing} className="w-full">
            {isProcessing ? "Adding…" : "Add & Compare"}
          </Button>
        </Modal>
      )}

      {/* Comparison Modal */}
      {showComparisonModal && currentComparison() && (
        <Modal onClose={() => { setAddTabState((prev: any) => ({ ...prev, showComparisonModal: false, isComparing: false, addingBook: null, low: 0, high: 0, midIndex: 0 })); setIsProcessing(false); }}>
          <h2 className="mb-6 font-serif text-xl font-semibold text-zinc-50">Which did you like more?</h2>
          <div className="mb-6 space-y-3">
            <div className="rounded-xl border border-zinc-600 bg-zinc-900 p-5">
              <p className="font-medium text-zinc-100">{currentComparison().title}</p>
              <p className="mt-1 text-sm text-zinc-400">by {currentComparison().author}</p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
              <p className="font-medium text-zinc-100">{addingBook.title}</p>
              <p className="mt-1 text-sm text-zinc-400">by {addingBook.author}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => handleComparison(false)} variant="secondary" disabled={isProcessing} className="w-1/2">First Book</Button>
            <Button onClick={() => handleComparison(true)} variant="primary" disabled={isProcessing} className="w-1/2">Second Book</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AddBookTab;