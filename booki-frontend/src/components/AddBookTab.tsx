import React, { useState } from "react";
import axios from "axios";
import Modal from "./Modal";
import Button from "./Button";

interface AddBookTabProps {
  books: any;
  setBooks: React.Dispatch<React.SetStateAction<any>>;
}

const CATEGORIES = ["liked it", "it was ok", "didn't like it"];
const API = "http://localhost:8000/api";

const AddBookTab: React.FC<AddBookTabProps> = ({ books, setBooks }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [addingBook, setAddingBook] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [tagsInput, setTagsInput] = useState("");
  const [low, setLow] = useState(0);
  const [high, setHigh] = useState(0);
  const [midIndex, setMidIndex] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [isComparing, setIsComparing] = useState(false);

  const allBooks = Object.values(books).flat();

  const handleSearch = async () => {
    if (!query) return;
    const res = await axios.get(`${API}/search?q=${encodeURIComponent(query)}`);
    setResults(res.data.results || []);
  };

  const openAddModal = (book: any) => {
    setAddingBook(book);
    setSelectedCategory(CATEGORIES[0]);
    setTagsInput("");
    setShowAddModal(true);
  };

  const confirmAddBook = async () => {
    setShowAddModal(false);

    const arr = (books[selectedCategory] || []).filter(
      b => !(b.title === addingBook.title && b.author === addingBook.author)
    );

    if (arr.length === 0) {
      const updated = [{ ...addingBook, tags: tagsInput }];
      setBooks({ ...books, [selectedCategory]: updated });
      await axios.post(`${API}/books`, { ...addingBook, category: selectedCategory, position: 0, tags: tagsInput });
      setAddingBook(null);
    } else {
      setLow(0);
      setHigh(arr.length);
      setMidIndex(Math.floor(arr.length / 2));
      setIsComparing(true);
      setShowComparisonModal(true);
    }
  };

  const currentComparison = () => {
    const arr = (books[selectedCategory] || []).filter(
      b => !(b.title === addingBook.title && b.author === addingBook.author)
    );
    return arr[midIndex];
  };

  const handleComparison = async (newBetter: boolean) => {
    const arr = (books[selectedCategory] || []).filter(
      b => !(b.title === addingBook.title && b.author === addingBook.author)
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
      await axios.post(`${API}/books`, { ...addingBook, category: selectedCategory, position, tags: tagsInput });

      setAddingBook(null);
      setLow(0);
      setHigh(0);
      setMidIndex(0);
      setShowComparisonModal(false);
      setIsComparing(false);
      return;
    }

    setLow(newLow);
    setHigh(newHigh);
    setMidIndex(Math.floor((newLow + newHigh) / 2));
  };

  return (
    <div>
      <div className="flex mb-6 gap-3">
        <input
          className="flex-1 px-5 py-3 rounded-full bg-white shadow-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all"
          placeholder="Search for a book..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
                if (e.key === "Enter") {
                e.preventDefault(); // prevents form submission if inside a form
                handleSearch();
                }
            }}
        />
        <Button onClick={handleSearch}>
          Search
        </Button>
      </div>

      {!isComparing && results.map((book, i) => {
        const exists = allBooks.some(b => b.title === book.title && b.author === book.author);
        return (
          <div key={`${book.title}-${book.author}-${i}`} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-3 flex justify-between items-center hover:shadow-md hover:border-orange-200 transition-all duration-200">
            <div>
              <p className="font-semibold text-gray-800 text-lg">{book.title}</p>
              <p className="text-gray-500 mt-1">{book.author}</p>
            </div>
            <Button
              onClick={() => openAddModal(book)}
              disabled={exists}
              variant={exists ? "secondary" : "primary"}
              className="ml-4"
            >
              {exists ? "Added" : "Add +"}
            </Button>
          </div>
        );
      })}

      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)}>
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Add Book</h2>
          <div className="mb-6">
            <p className="mb-3 font-medium text-gray-700">Category:</p>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(c => (
                <Button
                  key={c}
                  onClick={() => setSelectedCategory(c)}
                  variant={selectedCategory === c ? "primary" : "secondary"}
                  className="text-sm"
                >
                  {c}
                </Button>
              ))}
            </div>
          </div>
          <div className="mb-6">
            <p className="mb-2 font-medium text-gray-700">Tags (optional):</p>
            <input
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
              placeholder="e.g., fiction, mystery, favorite"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
            />
          </div>
          <Button onClick={confirmAddBook} className="w-full">
            Add & Compare
          </Button>
        </Modal>
      )}

      {showComparisonModal && currentComparison() && (
        <Modal onClose={() => { setShowComparisonModal(false); setIsComparing(false); }}>
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Which book did you like more?</h2>
          <div className="space-y-4 mb-6">
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200">
              <p className="font-semibold text-gray-800">{currentComparison().title}</p>
              <p className="text-gray-500 mt-1">by {currentComparison().author}</p>
            </div>
            <div className="p-5 bg-orange-50 rounded-2xl border border-orange-200">
              <p className="font-semibold text-gray-800">{addingBook.title}</p>
              <p className="text-gray-500 mt-1">by {addingBook.author}</p>
            </div>
          </div>
          <div className="flex justify-between gap-3">
            <Button onClick={() => handleComparison(false)} variant="secondary" className="w-1/2">
              First Book
            </Button>
            <Button onClick={() => handleComparison(true)} variant="primary" className="w-1/2">
              Second Book
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AddBookTab;