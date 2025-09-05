import React, { useState } from "react";
import axios from "axios";
import Modal from "./Modal";
import Button from "./Button";

interface RankingsTabProps {
  books: any;
  setBooks: React.Dispatch<React.SetStateAction<any>>;
}

const CATEGORIES = ["liked it", "it was ok", "didn't like it"];
const API = "http://localhost:8000/api";

const RankingsTab: React.FC<RankingsTabProps> = ({ books, setBooks }) => {
  const [editingBook, setEditingBook] = useState<any>(null);
  const [tagsInput, setTagsInput] = useState("");
  const [filterTag, setFilterTag] = useState("");

  const openEditModal = (book: any) => {
    setEditingBook(book);
    setTagsInput(book.tags || "");
  };

  const confirmEditTags = async () => {
    if (!editingBook) return;
    await axios.put(`${API}/books/${editingBook.id}`, { tags: tagsInput });
    const updatedBooks = { ...books };
    updatedBooks[editingBook.category] = updatedBooks[editingBook.category].map((b: any) =>
      b.id === editingBook.id ? { ...b, tags: tagsInput } : b
    );
    setBooks(updatedBooks);
    setEditingBook(null);
  };

  const deleteBook = async (book: any) => {
    await axios.delete(`${API}/books/${book.id}`);
    const updatedBooks = { ...books };
    updatedBooks[book.category] = updatedBooks[book.category].filter((b: any) => b.id !== book.id);
    setBooks(updatedBooks);
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

      {CATEGORIES.map(cat => (
        <div key={cat} className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center gap-2">
            <span>{getCategoryEmoji(cat)}</span>
            <span className="capitalize">{cat}</span>
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({filteredBooks(cat).length} books)
            </span>
          </h2>
          
          {filteredBooks(cat).length === 0 && (
            <p className="text-gray-400 italic p-4">No books in this category</p>
          )}
          
          {filteredBooks(cat).map((book: any, index: number) => (
            <div
              key={book.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-3 flex justify-between items-center hover:shadow-md hover:border-orange-200 transition-all duration-200"
            >
              <div className="flex-1">
                <div className="flex items-start gap-3">
                  <span className="text-2xl font-bold text-orange-500 mt-1">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-800 text-lg">{book.title}</p>
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
              <div className="flex gap-2 ml-4">
                <Button 
                  variant="secondary" 
                  onClick={() => openEditModal(book)}
                  className="text-sm"
                >
                  Edit Tags
                </Button>
                <Button 
                  variant="danger" 
                  onClick={() => deleteBook(book)}
                  className="text-sm"
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      ))}

      {editingBook && (
        <Modal onClose={() => setEditingBook(null)}>
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Edit Tags</h2>
          <div className="mb-4">
            <p className="font-semibold text-gray-800">{editingBook.title}</p>
            <p className="text-gray-500">{editingBook.author}</p>
          </div>
          <input
            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 mb-6"
            placeholder="e.g., fiction, mystery, favorite"
            value={tagsInput}
            onChange={e => setTagsInput(e.target.value)}
          />
          <Button onClick={confirmEditTags} className="w-full">
            Save Tags
          </Button>
        </Modal>
      )}
    </div>
  );
};

export default RankingsTab;