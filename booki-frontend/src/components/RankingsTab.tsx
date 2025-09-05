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
    );
  };

  return (
    <div>
      <div className="mb-4">
        <input
          placeholder="Filter by tag..."
          className="border p-2 rounded w-full"
          value={filterTag}
          onChange={e => setFilterTag(e.target.value)}
        />
      </div>

      {CATEGORIES.map(cat => (
        <div key={cat} className="mb-6">
          <h2 className="text-xl font-bold mb-3">{cat}</h2>
          {filteredBooks(cat).length === 0 && <p className="text-gray-400">No books</p>}
          {filteredBooks(cat).map((book: any) => (
            <div
              key={book.id}
              className="bg-white rounded-xl shadow-md p-4 mb-3 flex justify-between items-center hover:shadow-lg transition"
            >
              <div>
                <p className="font-semibold">{book.title}</p>
                <p className="text-gray-500">{book.author}</p>
                <div className="flex flex-wrap mt-2">
                  {(book.tags || "").split(",").map((tag, i) => (
                    <span
                      key={i}
                      className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full mr-1 mb-1"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="secondary" className="bg-yellow-500 hover:bg-yellow-600" onClick={() => openEditModal(book)}>
                  Edit
                </Button>
                <Button variant="danger" onClick={() => deleteBook(book)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      ))}

      {editingBook && (
        <Modal onClose={() => setEditingBook(null)}>
          <h2 className="text-xl font-bold mb-4">Edit Tags</h2>
          <input
            className="border p-2 rounded w-full mb-4"
            value={tagsInput}
            onChange={e => setTagsInput(e.target.value)}
          />
          <Button onClick={confirmEditTags} className="w-full">
            Save
          </Button>
        </Modal>
      )}
    </div>
  );
};

export default RankingsTab;
