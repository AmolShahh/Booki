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
      <div className="flex mb-4">
        <input
          className="flex-1 px-4 py-2 rounded-full shadow-sm border focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Search for a book..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <Button onClick={handleSearch} className="ml-2">
          Search
        </Button>
      </div>

      {!isComparing && results.map((book, i) => {
        const exists = allBooks.some(b => b.title === book.title && b.author === book.author);
        return (
          <div key={`${book.title}-${book.author}-${i}`} className="bg-white rounded-xl shadow-md p-4 mb-3 flex justify-between items-center hover:shadow-lg transition">
            <div>
              <p className="font-semibold">{book.title}</p>
              <p className="text-gray-500">{book.author}</p>
            </div>
            <Button
              onClick={() => openAddModal(book)}
              disabled={exists}
              variant="success"
              className="px-3 py-1"
            >
              {exists ? "Already added" : "+"}
            </Button>
          </div>
        );
      })}

      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)}>
          <h2 className="text-xl font-bold mb-4">Add Book</h2>
          <div className="mb-4">
            <p className="mb-1 font-medium">Category:</p>
            <div className="flex space-x-2">
              {CATEGORIES.map(c => (
                <Button
                  key={c}
                  onClick={() => setSelectedCategory(c)}
                  variant={selectedCategory === c ? "primary" : "secondary"}
                  className="px-3 py-1"
                >
                  {c}
                </Button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <p className="mb-1 font-medium">Tags (optional):</p>
            <input
              className="border p-2 rounded w-full"
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
          <h2 className="text-xl font-bold mb-4">Which book is better?</h2>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg shadow">{currentComparison().title} by {currentComparison().author}</div>
            <div className="p-4 bg-blue-50 rounded-lg shadow">{addingBook.title} by {addingBook.author}</div>
          </div>
          <div className="flex justify-between mt-4">
            <Button onClick={() => handleComparison(false)} variant="danger" className="w-1/2 mr-2">
              Existing Wins
            </Button>
            <Button onClick={() => handleComparison(true)} variant="success" className="w-1/2 ml-2">
              New Wins
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AddBookTab;
