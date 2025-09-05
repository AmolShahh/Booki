import React from "react";
import axios from "axios";
import Modal from "./Modal";
import Button from "./Button";

interface AddBookTabProps {
  books: any;
  setBooks: React.Dispatch<React.SetStateAction<any>>;
  addTabState: any;
  setAddTabState: React.Dispatch<React.SetStateAction<any>>;
  allTags: string[];
}

const CATEGORIES = ["liked it", "it was ok", "didn't like it"];
const API = "http://localhost:8000/api";

const AddBookTab: React.FC<AddBookTabProps> = ({
  books,
  setBooks,
  addTabState,
  setAddTabState,
  allTags,
}) => {
  const {
    query,
    results,
    addingBook,
    selectedCategory,
    tagsInput,
    low,
    high,
    midIndex,
    showAddModal,
    showComparisonModal,
    isComparing,
  } = addTabState;

  const update = (field: string, value: any) =>
    setAddTabState((prev: any) => ({ ...prev, [field]: value }));

  const allBooks = Object.values(books).flat();

  const handleSearch = async () => {
    if (!query) return;
    const res = await axios.get(`${API}/search?q=${encodeURIComponent(query)}`);
    update("results", res.data.results || []);
  };

  const openAddModal = (book: any) => {
    update("addingBook", book);
    update("selectedCategory", CATEGORIES[0]);
    update("tagsInput", "");
    update("showAddModal", true);
  };

  const handleTagClick = (tag: string) => {
    const currentTags = tagsInput
      .split(",")
      .map((t: string) => t.trim())
      .filter(Boolean);
    const newTags = new Set(currentTags);
    if (newTags.has(tag)) {
      newTags.delete(tag);
    } else {
      newTags.add(tag);
    }
    update("tagsInput", Array.from(newTags).join(", "));
  };

  const confirmAddBook = async () => {
    update("showAddModal", false);

    const arr = (books[selectedCategory] || []).filter(
      (b: any) => !(b.title === addingBook.title && b.author === addingBook.author)
    );

    if (arr.length === 0) {
      const updated = [{ ...addingBook, tags: tagsInput }];
      setBooks({ ...books, [selectedCategory]: updated });
      await axios.post(`${API}/books`, {
        ...addingBook,
        category: selectedCategory,
        position: 0,
        tags: tagsInput,
      });
      update("addingBook", null);
    } else {
      update("low", 0);
      update("high", arr.length);
      update("midIndex", Math.floor(arr.length / 2));
      update("isComparing", true);
      update("showComparisonModal", true);
    }
  };

  const currentComparison = () => {
    const arr = (books[selectedCategory] || []).filter(
      (b: any) => !(b.title === addingBook.title && b.author === addingBook.author)
    );
    return arr[midIndex];
  };

  const handleComparison = async (newBetter: boolean) => {
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
      await axios.post(`${API}/books`, {
        ...addingBook,
        category: selectedCategory,
        position,
        tags: tagsInput,
      });

      update("addingBook", null);
      update("low", 0);
      update("high", 0);
      update("midIndex", 0);
      update("showComparisonModal", false);
      update("isComparing", false);
      return;
    }

    update("low", newLow);
    update("high", newHigh);
    update("midIndex", Math.floor((newLow + newHigh) / 2));
  };

  const selectedTags = tagsInput.split(",").map((t: string) => t.trim()).filter(Boolean);

  return (
    <div>
      <div className="flex mb-6 gap-3">
        <input
          className="flex-1 px-5 py-3 rounded-full bg-white shadow-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all"
          placeholder="Search for a book..."
          value={query}
          onChange={(e) => update("query", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
        />
        <Button onClick={handleSearch}>Search</Button>
      </div>

      {!isComparing &&
        results.map((book: any, i: number) => {
          const exists = allBooks.some(
            (b: any) => b.title === book.title && b.author === book.author
          );
          return (
            <div
              key={`${book.title}-${book.author}-${i}`}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-3 flex justify-between items-center hover:shadow-md hover:border-orange-200 transition-all duration-200"
            >
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
        <Modal onClose={() => update("showAddModal", false)}>
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Add Book</h2>
          <div className="mb-6">
            <p className="mb-3 font-medium text-gray-700">Category:</p>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((c) => (
                <Button
                  key={c}
                  onClick={() => update("selectedCategory", c)}
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
            <div className="mb-3">
              <input
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                placeholder="Type new tags or click on existing ones..."
                value={tagsInput}
                onChange={(e) => update("tagsInput", e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2">
              {allTags.map((tag) => (
                <Button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  variant={selectedTags.includes(tag) ? "primary" : "secondary"}
                  className="rounded-full px-3 py-1 text-xs whitespace-nowrap"
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>
          <Button onClick={confirmAddBook} className="w-full">
            Add & Compare
          </Button>
        </Modal>
      )}

      {showComparisonModal && currentComparison() && (
        <Modal
          onClose={() => {
            update("showComparisonModal", false);
            update("isComparing", false);
          }}
        >
          <h2 className="text-2xl font-bold mb-6 text-gray-800">
            Which book did you like more?
          </h2>
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
            <Button
              onClick={() => handleComparison(false)}
              variant="secondary"
              className="w-1/2"
            >
              First Book
            </Button>
            <Button
              onClick={() => handleComparison(true)}
              variant="primary"
              className="w-1/2"
            >
              Second Book
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AddBookTab;