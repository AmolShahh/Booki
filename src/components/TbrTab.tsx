import React, { useState } from "react";
import axios from "axios";
import Modal from "./Modal";
import Button from "./Button";
import { API } from "./api";

interface TbrTabProps {
  books: any;
  setBooks: React.Dispatch<React.SetStateAction<any>>;
  allTags: string[];
}

const CATEGORIES = ["tbr"];
const RANKING_CATEGORIES = ["liked it", "it was ok", "didn't like it"];

const CATEGORY_DOT: Record<string, string> = {
  "liked it": "bg-emerald-500",
  "it was ok": "bg-amber-500",
  "didn't like it": "bg-rose-500",
  tbr: "bg-sky-500",
};

const TbrTab: React.FC<TbrTabProps> = ({ books, setBooks, allTags }) => {
  const [editingBook, setEditingBook] = useState<any>(null);
  const [tagsInput, setTagsInput] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [bookToDelete, setBookToDelete] = useState<any>(null);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [scrollInterval, setScrollInterval] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [readingId, setReadingId] = useState<any>(null);

  // New state for moving book to read
  const [movingBook, setMovingBook] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState("liked it");
  const [moveTagsInput, setMoveTagsInput] = useState("");
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [low, setLow] = useState(0);
  const [high, setHigh] = useState(0);
  const [midIndex, setMidIndex] = useState(0);

  const handleEditTags = (book: any) => {
    setEditingBook(book);
    setTagsInput(book.tags || "");
  };

  const handleSaveTags = async () => {
    if (!editingBook) return;
    setIsSaving(true);
    try {
      await axios.put(`${API}/books/${editingBook.id}`, { tags: tagsInput });
      const updatedBooks = { ...books };
      updatedBooks[editingBook.category] = updatedBooks[editingBook.category].map((b: any) =>
        b.id === editingBook.id ? { ...b, tags: tagsInput } : b
      );
      setBooks(updatedBooks);
      setEditingBook(null);
      setTagsInput("");
    } catch (error) {
      console.error("Error saving tags:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!bookToDelete) return;
    setIsDeleting(true);
    try {
      await axios.delete(`${API}/books/${bookToDelete.id}`);
      const updatedBooks = { ...books };
      updatedBooks[bookToDelete.category] = updatedBooks[bookToDelete.category].filter(
        (b: any) => b.id !== bookToDelete.id
      );
      setBooks(updatedBooks);
      setBookToDelete(null);
    } catch (error) {
      console.error("Error deleting book:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle currently reading tag
  const handleMarkCurrentlyReading = async (book: any) => {
    setReadingId(book.id);
    try {
      const currentTags = book.tags || "";
      const tagsArray = currentTags.split(",").map((t: string) => t.trim()).filter(Boolean);

      let newTags: string;
      if (tagsArray.includes("currently-reading")) {
        newTags = tagsArray.filter((t: string) => t !== "currently-reading").join(", ");
      } else {
        newTags = [...tagsArray, "currently-reading"].join(", ");
      }

      await axios.put(`${API}/books/${book.id}`, { tags: newTags });
      const updatedBooks = { ...books };
      updatedBooks[book.category] = updatedBooks[book.category].map((b: any) =>
        b.id === book.id ? { ...b, tags: newTags } : b
      );
      setBooks(updatedBooks);
    } catch (error) {
      console.error("Error toggling currently-reading tag:", error);
    } finally {
      setReadingId(null);
    }
  };

  // Initiate move to read
  const handleMoveToRead = (book: any) => {
    setMovingBook(book);
    setSelectedCategory(RANKING_CATEGORIES[0]);
    setMoveTagsInput(book.tags || "");
    setShowMoveModal(true);
  };

  // Confirm category selection and start comparison
  const confirmMoveToRead = async () => {
    if (!movingBook) return;
    setIsMoving(true);

    const arr = (books[selectedCategory] || []).filter(
      (b: any) => !(b.title === movingBook.title && b.author === movingBook.author)
    );

    // First, delete from TBR
    try {
      await axios.delete(`${API}/books/${movingBook.id}`);
    } catch (error) {
      console.error("Error deleting from TBR:", error);
      setIsMoving(false);
      return;
    }

    // Update local state to remove from TBR
    const updatedBooks = { ...books };
    updatedBooks.tbr = updatedBooks.tbr.filter((b: any) => b.id !== movingBook.id);
    setBooks(updatedBooks);

    // If the category is empty, add directly
    if (arr.length === 0) {
      const updated = [{ ...movingBook, tags: moveTagsInput, category: selectedCategory }];
      setBooks({ ...updatedBooks, [selectedCategory]: updated });
      await axios.post(`${API}/books`, {
        title: movingBook.title,
        author: movingBook.author,
        category: selectedCategory,
        position: 0,
        tags: moveTagsInput,
      });
      setShowMoveModal(false);
      setMovingBook(null);
      setIsMoving(false);
    } else {
      // Start comparison process
      setShowMoveModal(false);
      setLow(0);
      setHigh(arr.length);
      setMidIndex(Math.floor(arr.length / 2));
      setShowComparisonModal(true);
      setIsMoving(false);
    }
  };

  // Handle comparison
  const handleComparison = async (newBetter: boolean) => {
    const arr = (books[selectedCategory] || []).filter(
      (b: any) => !(b.title === movingBook.title && b.author === movingBook.author)
    );

    let newLow = low;
    let newHigh = high;

    if (newBetter) newHigh = midIndex;
    else newLow = midIndex + 1;

    if (newLow >= newHigh) {
      const position = newLow;
      const updated = [...arr];
      updated.splice(position, 0, { ...movingBook, tags: moveTagsInput, category: selectedCategory });
      setBooks({ ...books, [selectedCategory]: updated });
      await axios.post(`${API}/books`, {
        title: movingBook.title,
        author: movingBook.author,
        category: selectedCategory,
        position,
        tags: moveTagsInput,
      });

      setMovingBook(null);
      setLow(0);
      setHigh(0);
      setMidIndex(0);
      setShowComparisonModal(false);
      return;
    }

    setLow(newLow);
    setHigh(newHigh);
    setMidIndex(Math.floor((newLow + newHigh) / 2));
  };

  const currentComparison = () => {
    const arr = (books[selectedCategory] || []).filter(
      (b: any) => !(b.title === movingBook.title && b.author === movingBook.author)
    );
    return arr[midIndex];
  };

  // Filter function: includes search by title/author
  const filteredBooks = (category: string) => {
    return (
      books[category]?.filter((b: any) => {
        const matchesTag = !filterTag || (b.tags || "").toLowerCase().includes(filterTag.toLowerCase());
        const matchesSearch =
          !searchQuery ||
          b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.author.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTag && matchesSearch;
      }) || []
    );
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
    setTagsInput(Array.from(newTags).join(", "));
  };

  const handleMoveTagClick = (tag: string) => {
    const currentTags = moveTagsInput
      .split(",")
      .map((t: string) => t.trim())
      .filter(Boolean);
    const newTags = new Set(currentTags);
    if (newTags.has(tag)) {
      newTags.delete(tag);
    } else {
      newTags.add(tag);
    }
    setMoveTagsInput(Array.from(newTags).join(", "));
  };

  const selectedTags = tagsInput.split(",").map((t: string) => t.trim()).filter(Boolean);
  const selectedMoveTags = moveTagsInput.split(",").map((t: string) => t.trim()).filter(Boolean);

  // --- Drag and Drop Handlers for "tbr" category ---
  const handleDragStart = (e: any, book: any) => {
    setDraggedItem(book);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: any) => {
    e.preventDefault();

    // Auto-scroll logic
    const scrollThreshold = 100; // pixels from top/bottom to trigger scroll
    const scrollSpeed = 12; // pixels per interval
    const mouseY = e.clientY;
    const windowHeight = window.innerHeight;

    const inTopZone = mouseY < scrollThreshold;
    const inBottomZone = mouseY > windowHeight - scrollThreshold;

    if (!inTopZone && !inBottomZone) {
      if (scrollInterval) {
        clearInterval(scrollInterval);
        setScrollInterval(null);
      }
      return;
    }

    if (scrollInterval) {
      return;
    }

    if (inTopZone) {
      const interval = setInterval(() => {
        window.scrollBy({ top: -scrollSpeed, behavior: "auto" });
      }, 30) as unknown as number;
      setScrollInterval(interval);
    } else if (inBottomZone) {
      const interval = setInterval(() => {
        window.scrollBy({ top: scrollSpeed, behavior: "auto" });
      }, 30) as unknown as number;
      setScrollInterval(interval);
    }
  };

  const handleDrop = async (e: any, droppedOnBook: any) => {
    e.preventDefault();

    if (scrollInterval) {
      clearInterval(scrollInterval);
      setScrollInterval(null);
    }

    if (!draggedItem || draggedItem.id === droppedOnBook.id) {
      setDraggedItem(null);
      return;
    }

    const tbrBooks = books.tbr.slice();
    const draggedIndex = tbrBooks.findIndex((b: any) => Number(b.id) === Number(draggedItem.id));
    const droppedOnIndex = tbrBooks.findIndex((b: any) => Number(b.id) === Number(droppedOnBook.id));

    tbrBooks.splice(draggedIndex, 1);
    tbrBooks.splice(droppedOnIndex, 0, draggedItem);

    const updatedBooks = { ...books, tbr: tbrBooks };
    setBooks(updatedBooks);

    const reorderedData = tbrBooks.map((book: any, index: any) => ({
      id: Number(book.id),
      position: Number(index),
    }));

    try {
      await axios.put(`${API}/reorder`, { reorderedData });
    } catch (error) {
      console.error("Error reordering books on backend:", error);
    }

    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    if (scrollInterval) {
      clearInterval(scrollInterval);
      setScrollInterval(null);
    }
    setDraggedItem(null);
  };
  // ---------------------------------------------------

  let continuousBookNumber = 0;

  return (
    <div>
      <div className="mb-6 space-y-3">
        <input
          placeholder="Search by book title or author..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 shadow-sm transition-colors focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <input
          placeholder="Filter by tag..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 shadow-sm transition-colors focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
        />
      </div>

      {CATEGORIES.map((cat) => {
        const booksInCategory = filteredBooks(cat);
        const startIndex = continuousBookNumber + 1;
        continuousBookNumber += booksInCategory.length;

        return (
          <div key={cat} className="mb-8">
            <h2 className="mb-4 flex items-center gap-2.5 font-serif text-xl font-semibold text-zinc-100">
              <span className={`h-2.5 w-2.5 rounded-full ${CATEGORY_DOT[cat]}`} />
              <span>{cat.toUpperCase()}</span>
              <span className="font-sans text-sm font-normal text-zinc-500">{booksInCategory.length} books</span>
            </h2>

            {booksInCategory.length === 0 && (
              <p className="rounded-lg border border-dashed border-zinc-800 p-4 text-sm italic text-zinc-500">
                No books in this category
              </p>
            )}

            <div className="space-y-3">
              {booksInCategory.map((book: any, index: number) => (
                <div
                  key={book.id}
                  draggable={cat === "tbr" ? "true" : "false"}
                  onDragStart={(e) => handleDragStart(e, book)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, book)}
                  onDragEnd={handleDragEnd}
                  className={`
                    rounded-xl border border-zinc-800 bg-zinc-900/60 p-5
                    transition-colors duration-150
                    ${cat === "tbr" ? "cursor-grab active:cursor-grabbing" : ""}
                    ${draggedItem && draggedItem.id === book.id ? "opacity-30" : "hover:border-zinc-700"}
                  `}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3">
                        {cat === "tbr" && (
                          <span
                            className="mt-1 flex-none select-none text-sm leading-none tracking-widest text-zinc-600"
                            title="Drag to reorder"
                          >
                            ⠿
                          </span>
                        )}
                        <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-sm font-semibold text-amber-400">
                          {startIndex + index}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-base font-medium text-zinc-100">{book.title}</p>
                          <p className="mt-0.5 text-sm text-zinc-500">{book.author}</p>
                          {book.tags && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {book.tags.split(",").map((tag: string, i: number) => (
                                <span
                                  key={i}
                                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                    tag.trim() === "currently-reading"
                                      ? "border border-sky-500/30 bg-sky-500/15 text-sky-300"
                                      : "border border-zinc-700 bg-zinc-800 text-zinc-400"
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

                    <div className="flex flex-wrap gap-2 sm:ml-4 sm:min-w-[180px] sm:flex-shrink-0 sm:flex-col">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleMoveToRead(book)}
                        className="flex-1 whitespace-nowrap sm:flex-none sm:w-full"
                      >
                        Move to Read
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleMarkCurrentlyReading(book)}
                        disabled={readingId === book.id}
                        className="flex-1 whitespace-nowrap sm:flex-none sm:w-full"
                      >
                        {book.tags?.includes("currently-reading") ? "✓ Reading" : "Currently Reading"}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEditTags(book)}
                        className="flex-1 whitespace-nowrap sm:flex-none sm:w-full"
                      >
                        Edit Tags
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setBookToDelete(book)}
                        className="flex-1 whitespace-nowrap text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 sm:flex-none sm:w-full"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Move to Read Modal - Category Selection */}
      {showMoveModal && movingBook && (
        <Modal
          onClose={() => {
            setShowMoveModal(false);
            setMovingBook(null);
          }}
        >
          <h2 className="mb-6 font-serif text-xl font-semibold text-zinc-100">Move to Read</h2>
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="font-medium text-zinc-100">{movingBook.title}</p>
            <p className="mt-1 text-sm text-zinc-400">by {movingBook.author}</p>
          </div>
          <div className="mb-6">
            <p className="mb-3 text-sm font-medium text-zinc-300">Category:</p>
            <div className="flex flex-wrap gap-2">
              {RANKING_CATEGORIES.map((c) => (
                <Button
                  key={c}
                  onClick={() => setSelectedCategory(c)}
                  variant={selectedCategory === c ? "primary" : "secondary"}
                  size="sm"
                >
                  {c}
                </Button>
              ))}
            </div>
          </div>
          <div className="mb-6">
            <p className="mb-2 text-sm font-medium text-zinc-300">Tags (optional):</p>
            <div className="mb-3">
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                placeholder="Type new tags or click on existing ones..."
                value={moveTagsInput}
                onChange={(e) => setMoveTagsInput(e.target.value)}
              />
            </div>
            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-2">
              {allTags.map((tag) => (
                <Button
                  key={tag}
                  onClick={() => handleMoveTagClick(tag)}
                  variant="tag"
                  active={selectedMoveTags.includes(tag)}
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>
          <Button onClick={confirmMoveToRead} disabled={isMoving} className="w-full">
            {isMoving ? "Moving..." : "Confirm & Compare"}
          </Button>
        </Modal>
      )}

      {/* Comparison Modal */}
      {showComparisonModal && currentComparison() && movingBook && (
        <Modal
          onClose={() => {
            setShowComparisonModal(false);
            setMovingBook(null);
            setLow(0);
            setHigh(0);
            setMidIndex(0);
          }}
        >
          <h2 className="mb-6 font-serif text-xl font-semibold text-zinc-100">Which book did you like more?</h2>
          <div className="mb-6 space-y-3">
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-5">
              <p className="font-medium text-zinc-100">{currentComparison().title}</p>
              <p className="mt-1 text-sm text-zinc-500">by {currentComparison().author}</p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
              <p className="font-medium text-zinc-100">{movingBook.title}</p>
              <p className="mt-1 text-sm text-zinc-400">by {movingBook.author}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => handleComparison(false)} variant="secondary" className="w-1/2">
              First Book
            </Button>
            <Button onClick={() => handleComparison(true)} variant="primary" className="w-1/2">
              Second Book
            </Button>
          </div>
        </Modal>
      )}

      {/* Edit Tags Modal */}
      {editingBook && (
        <Modal
          onClose={() => {
            setEditingBook(null);
            setTagsInput("");
          }}
        >
          <h2 className="mb-6 font-serif text-xl font-semibold text-zinc-100">Edit Tags</h2>
          <div className="mb-4">
            <p className="font-medium text-zinc-100">{editingBook.title}</p>
            <p className="text-sm text-zinc-500">{editingBook.author}</p>
          </div>
          <div className="mb-5">
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="Type new tags or click on existing ones..."
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>
          <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-2">
            {allTags.map((tag) => (
              <Button key={tag} onClick={() => handleTagClick(tag)} variant="tag" active={selectedTags.includes(tag)}>
                {tag}
              </Button>
            ))}
          </div>
          <Button onClick={handleSaveTags} disabled={isSaving} className="mt-6 w-full">
            {isSaving ? "Saving..." : "Save Tags"}
          </Button>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {bookToDelete && (
        <Modal onClose={() => setBookToDelete(null)}>
          <h2 className="mb-4 font-serif text-xl font-semibold text-zinc-100">Remove book</h2>
          <p className="mb-6 text-sm text-zinc-400">
            Are you sure you want to remove "
            <span className="font-medium text-zinc-200">{bookToDelete.title}</span>"? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setBookToDelete(null)} className="w-full">
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={isDeleting} className="w-full">
              {isDeleting ? "Removing..." : "Remove"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TbrTab;