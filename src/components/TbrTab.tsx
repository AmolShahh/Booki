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
const API = "https://booki-2od.pages.dev/api";

const TbrTab: React.FC<TbrTabProps> = ({ books, setBooks, allTags }) => {
  const [editingBook, setEditingBook] = useState<any>(null);
  const [tagsInput, setTagsInput] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [bookToDelete, setBookToDelete] = useState<any>(null);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [scrollInterval, setScrollInterval] = useState<number | null>(null);

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

  const filteredBooks = (category: string) => {
    return books[category]?.filter((b: any) =>
      !filterTag || (b.tags || "").toLowerCase().includes(filterTag.toLowerCase())
    ) || [];
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
  
  const selectedTags = tagsInput.split(",").map((t: string) => t.trim()).filter(Boolean);

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
      <div className="mb-6">
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
                                  className="bg-orange-100 text-orange-700 text-xs px-3 py-1 rounded-full font-medium"
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
                    <div className="flex gap-2 sm:flex-shrink-0 sm:ml-4">
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