import React, { useState } from "react";
import axios from "axios";
import Modal from "./Modal";
import Button from "./Button";

interface TbrTabProps {
  books: any;
  setBooks: React.Dispatch<React.SetStateAction<any>>;
  allTags: string[];
}

const CATEGORIES = ["tbr"];
const RANKING_CATEGORIES = ["liked it", "it was ok", "didn't like it"];
const API = "https://booki-2od.pages.dev/api";

const TbrTab: React.FC<TbrTabProps> = ({ books, setBooks, allTags }) => {
  const [editingBook, setEditingBook] = useState<any>(null);
  const [tagsInput, setTagsInput] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [bookToDelete, setBookToDelete] = useState<any>(null);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [scrollInterval, setScrollInterval] = useState<number | null>(null);
  
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
    try {
      await axios.put(`${API}/books/${editingBook.id}`, { tags: tagsInput });
      const updatedBooks = { ...books };
      updatedBooks[editingBook.category] = updatedBooks[editingBook.category].map((b: any) =>
        b.id === editingBook.id ? { ...b, tags: tagsInput } : b
      );
      setBooks(updatedBooks);
    } catch (error) {
      console.error("Error saving tags:", error);
    } finally {
      setEditingBook(null);
      setTagsInput("");
    }
  };

  const confirmDelete = async () => {
    if (!bookToDelete) return;
    try {
      await axios.delete(`${API}/books/${bookToDelete.id}`);
      const updatedBooks = { ...books };
      updatedBooks[bookToDelete.category] = updatedBooks[bookToDelete.category].filter((b: any) => b.id !== bookToDelete.id);
      setBooks(updatedBooks);
    } catch (error) {
      console.error("Error deleting book:", error);
    } finally {
      setBookToDelete(null);
    }
  };

  // New function: Mark as currently reading
  const handleMarkCurrentlyReading = async (book: any) => {
    try {
      const currentTags = book.tags || "";
      const tagsArray = currentTags.split(",").map((t: string) => t.trim()).filter(Boolean);
      
      if (tagsArray.includes("currently-reading")) {
        return; // Already has the tag
      }
      
      const newTags = [...tagsArray, "currently-reading"].join(", ");
      
      await axios.put(`${API}/books/${book.id}`, { tags: newTags });
      const updatedBooks = { ...books };
      updatedBooks[book.category] = updatedBooks[book.category].map((b: any) =>
        b.id === book.id ? { ...b, tags: newTags } : b
      );
      setBooks(updatedBooks);
    } catch (error) {
      console.error("Error adding currently-reading tag:", error);
    }
  };

  // New function: Initiate move to read
  const handleMoveToRead = (book: any) => {
    setMovingBook(book);
    setSelectedCategory(RANKING_CATEGORIES[0]);
    setMoveTagsInput(book.tags || "");
    setShowMoveModal(true);
  };

  // New function: Confirm category selection and start comparison
  const confirmMoveToRead = async () => {
    if (!movingBook) return;

    const arr = (books[selectedCategory] || []).filter(
      (b: any) => !(b.title === movingBook.title && b.author === movingBook.author)
    );

    // First, delete from TBR
    try {
      await axios.delete(`${API}/books/${movingBook.id}`);
    } catch (error) {
      console.error("Error deleting from TBR:", error);
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
    } else {
      // Start comparison process
      setShowMoveModal(false);
      setLow(0);
      setHigh(arr.length);
      setMidIndex(Math.floor(arr.length / 2));
      setShowComparisonModal(true);
    }
  };

  // New function: Handle comparison
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

  // Updated filter function to include search by title/author
  const filteredBooks = (category: string) => {
    return books[category]?.filter((b: any) => {
      const matchesTag = !filterTag || (b.tags || "").toLowerCase().includes(filterTag.toLowerCase());
      const matchesSearch = !searchQuery || 
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.author.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTag && matchesSearch;
    }) || [];
  };

  const getCategoryEmoji = (category: string) => {
    switch(category) {
      case "liked it": return "❤️";
      case "it was ok": return "👍";
      case "didn't like it": return "👎";
      default: return "📚";
    }
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
    
    // Check if we're in a scroll zone
    const inTopZone = mouseY < scrollThreshold;
    const inBottomZone = mouseY > windowHeight - scrollThreshold;
    
    // If not in any scroll zone, clear the interval
    if (!inTopZone && !inBottomZone) {
      if (scrollInterval) {
        clearInterval(scrollInterval);
        setScrollInterval(null);
      }
      return;
    }
    
    // Don't create a new interval if one already exists
    if (scrollInterval) {
      return;
    }
    
    // Scroll up when near top
    if (inTopZone) {
      const interval = setInterval(() => {
        window.scrollBy({ top: -scrollSpeed, behavior: 'auto' });
      }, 30) as unknown as number;
      setScrollInterval(interval);
    }
    // Scroll down when near bottom
    else if (inBottomZone) {
      const interval = setInterval(() => {
        window.scrollBy({ top: scrollSpeed, behavior: 'auto' });
      }, 30) as unknown as number;
      setScrollInterval(interval);
    }
  };

  const handleDrop = async (e: any, droppedOnBook: any) => {
    e.preventDefault();
    
    // Clear scroll interval
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

    // Remove the dragged book
    tbrBooks.splice(draggedIndex, 1);
    // Insert it at the new position
    tbrBooks.splice(droppedOnIndex, 0, draggedItem);

    const updatedBooks = { ...books, tbr: tbrBooks };
    setBooks(updatedBooks);

    // Prepare payload for backend API call
    const reorderedData = tbrBooks.map((book: any, index: any) => ({
      id: Number(book.id),
      position: Number(index),
    }));

    // Call the new API endpoint to persist the reordering
    try {
        await axios.put(`${API}/reorder`, {reorderedData});
    } catch (error) {
        console.error("Error reordering books on backend:", error);
    }

    setDraggedItem(null);
  };
  
  const handleDragEnd = () => {
    // Clean up scroll interval when drag ends
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
          className="w-full px-5 py-3 rounded-full bg-white shadow-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <input
          placeholder="Filter by tag..."
          className="w-full px-5 py-3 rounded-full bg-white shadow-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all"
          value={filterTag}
          onChange={e => setFilterTag(e.target.value)}
        />
      </div>

      {CATEGORIES.map(cat => {
        const booksInCategory = filteredBooks(cat);
        const startIndex = continuousBookNumber + 1;
        continuousBookNumber += booksInCategory.length;

        return (
          <div key={cat} className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center gap-2">
              <span>{getCategoryEmoji(cat)}</span>
              <span className="capitalize">{cat.toUpperCase()}</span>
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({booksInCategory.length} books)
              </span>
            </h2>
            
            {booksInCategory.length === 0 && (
              <p className="text-gray-400 italic p-4">No books in this category</p>
            )}
            
            <div className="space-y-3">
              {booksInCategory.map((book: any, index: number) => (
                <div
                  key={book.id}
                  draggable={cat === "tbr" ? "true" : "false"}
                  onDragStart={e => handleDragStart(e, book)}
                  onDragOver={handleDragOver}
                  onDrop={e => handleDrop(e, book)}
                  onDragEnd={handleDragEnd}
                  className={`
                    bg-white rounded-2xl shadow-sm border border-gray-100 p-5 
                    transition-all duration-200 
                    ${cat === "tbr" ? "cursor-grab active:cursor-grabbing" : ""}
                    ${draggedItem && draggedItem.id === book.id ? "opacity-30" : "hover:shadow-md hover:border-orange-200"}
                  `}
                >
                  {/* Mobile and Desktop responsive layout */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    {/* Book info section - full width on mobile */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl font-bold text-orange-500 mt-1 flex-shrink-0">
                          {startIndex + index}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-lg break-words">{book.title}</p>
                          <p className="text-gray-500 mt-1">{book.author}</p>
                          {book.tags && (
                            <div className="flex flex-wrap mt-3 gap-2">
                              {book.tags.split(",").map((tag: string, i: number) => (
                                <span
                                  key={i}
                                  className={`text-xs px-3 py-1 rounded-full font-medium ${
                                    tag.trim() === "currently-reading"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-orange-100 text-orange-700"
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
                    
                    {/* Buttons - stack on mobile, side by side on desktop */}
                    <div className="flex gap-2 sm:flex-shrink-0 sm:ml-4 flex-wrap">
                      <Button 
                        variant="success" 
                        onClick={() => handleMoveToRead(book)}
                        className="text-sm flex-1 sm:flex-none"
                      >
                        Move to Read
                      </Button>
                      <Button 
                        variant="secondary" 
                        onClick={() => handleMarkCurrentlyReading(book)}
                        className="text-sm flex-1 sm:flex-none"
                        disabled={book.tags?.includes("currently-reading")}
                      >
                        {book.tags?.includes("currently-reading") ? "✓ Reading" : "Currently Reading"}
                      </Button>
                      <Button 
                        variant="secondary" 
                        onClick={() => handleEditTags(book)}
                        className="text-sm flex-1 sm:flex-none"
                      >
                        Edit Tags
                      </Button>
                      <Button 
                        variant="danger" 
                        onClick={() => setBookToDelete(book)}
                        className="text-sm flex-1 sm:flex-none"
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
        <Modal onClose={() => {
          setShowMoveModal(false);
          setMovingBook(null);
        }}>
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Move to Read</h2>
          <div className="mb-4 p-4 rounded-xl bg-orange-50 border border-orange-200">
            <p className="font-semibold text-gray-800">{movingBook.title}</p>
            <p className="text-gray-500 mt-1">by {movingBook.author}</p>
          </div>
          <div className="mb-6">
            <p className="mb-3 font-medium text-gray-700">Category:</p>
            <div className="flex gap-2 flex-wrap">
              {RANKING_CATEGORIES.map((c) => (
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
            <div className="mb-3">
              <input
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                placeholder="Type new tags or click on existing ones..."
                value={moveTagsInput}
                onChange={(e) => setMoveTagsInput(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2">
              {allTags.map((tag) => (
                <Button
                  key={tag}
                  onClick={() => handleMoveTagClick(tag)}
                  variant={selectedMoveTags.includes(tag) ? "primary" : "secondary"}
                  className="rounded-full px-3 py-1 text-xs whitespace-nowrap"
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>
          <Button onClick={confirmMoveToRead} className="w-full">
            Confirm & Compare
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
          <h2 className="text-2xl font-bold mb-6 text-gray-800">
            Which book did you like more?
          </h2>
          <div className="space-y-4 mb-6">
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200">
              <p className="font-semibold text-gray-800">{currentComparison().title}</p>
              <p className="text-gray-500 mt-1">by {currentComparison().author}</p>
            </div>
            <div className="p-5 bg-orange-50 rounded-2xl border border-orange-200">
              <p className="font-semibold text-gray-800">{movingBook.title}</p>
              <p className="text-gray-500 mt-1">by {movingBook.author}</p>
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

      {/* Edit Tags Modal */}
      {editingBook && (
        <Modal onClose={() => setEditingBook(null)}>
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Edit Tags</h2>
          <div className="mb-4">
            <p className="font-semibold text-gray-800">{editingBook.title}</p>
            <p className="text-gray-500">{editingBook.author}</p>
          </div>
          <div className="mb-6">
            <input
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
              placeholder="Type new tags or click on existing ones..."
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
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
          <Button onClick={handleSaveTags} className="w-full mt-6">
            Save Tags
          </Button>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {bookToDelete && (
        <Modal onClose={() => setBookToDelete(null)}>
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Confirm Deletion</h2>
          <p className="text-gray-600 mb-6">
            Are you sure you want to remove "<span className="font-semibold">{bookToDelete.title}</span>"? This action cannot be undone.
          </p>
          <div className="flex justify-between gap-4">
            <Button variant="secondary" onClick={() => setBookToDelete(null)} className="w-full">
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} className="w-full">
              Confirm Delete
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TbrTab;
