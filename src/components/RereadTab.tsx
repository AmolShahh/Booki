import React, { useState } from "react";
import axios from "axios";
import Modal from "./Modal";
import Button from "./Button";
import { API, authAxios } from "./api";

interface RereadTabProps {
  books: any;
  setBooks: React.Dispatch<React.SetStateAction<any>>;
  allTags: string[];
}

const CATEGORIES = ["liked it", "it was ok", "didn't like it"];

const CATEGORY_DOT: Record<string, string> = {
  "liked it": "bg-emerald-400",
  "it was ok": "bg-amber-400",
  "didn't like it": "bg-rose-400",
};

const RereadTab: React.FC<RereadTabProps> = ({ books, setBooks, allTags }) => {
  const [editingBook, setEditingBook] = useState<any>(null);
  const [tagsInput, setTagsInput] = useState("");
  const [bookToDelete, setBookToDelete] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [markingId, setMarkingId] = useState<any>(null);

  const handleEditTags = (book: any) => {
    setEditingBook(book);
    setTagsInput(book.tags || "");
  };

  const handleSaveTags = async () => {
    if (!editingBook) return;
    setIsSaving(true);
    try {
      await authAxios.put(`${API}/books/${editingBook.id}`, { tags: tagsInput });
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
      await authAxios.delete(`${API}/books/${bookToDelete.id}`);
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

  const handleRemoveRereadTag = async (book: any) => {
    setMarkingId(book.id);
    try {
      const currentTags = book.tags || "";
      const tagsArray = currentTags.split(",").map((t: string) => t.trim()).filter(Boolean);
      const newTags = tagsArray.filter((t: string) => t !== "to-reread").join(", ");
      await authAxios.put(`${API}/books/${book.id}`, { tags: newTags });
      const updatedBooks = { ...books };
      updatedBooks[book.category] = updatedBooks[book.category].map((b: any) =>
        b.id === book.id ? { ...b, tags: newTags } : b
      );
      setBooks(updatedBooks);
    } catch (error) {
      console.error("Error removing reread tag:", error);
    } finally {
      setMarkingId(null);
    }
  };

  const getRereadBooks = () => {
    const rereadBooks: any[] = [];
    CATEGORIES.forEach((category) => {
      if (books[category]) {
        books[category].forEach((book: any) => {
          if (book.tags?.includes("to-reread")) {
            rereadBooks.push({ ...book, category });
          }
        });
      }
    });
    return rereadBooks;
  };

  const handleTagClick = (tag: string) => {
    const currentTags = tagsInput.split(",").map((t: string) => t.trim()).filter(Boolean);
    const newTags = new Set(currentTags);
    if (newTags.has(tag)) newTags.delete(tag);
    else newTags.add(tag);
    setTagsInput(Array.from(newTags).join(", "));
  };

  const selectedTags = tagsInput.split(",").map((t: string) => t.trim()).filter(Boolean);
  const rereadBooks = getRereadBooks();

  return (
    <div>
      {rereadBooks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-600 bg-zinc-800 p-8 text-center">
          <p className="text-base font-medium text-zinc-200">No books marked for rereading yet</p>
          <p className="mt-2 text-sm text-zinc-400">
            Click "Reread" on any book in the Rankings tab to add it here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rereadBooks.map((book: any) => (
            <div
              key={book.id}
              className="rounded-xl border border-zinc-600 bg-zinc-800 p-5 transition-colors duration-150 hover:border-zinc-500"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-3">
                    <span className={`mt-2 h-2.5 w-2.5 flex-none rounded-full ${CATEGORY_DOT[book.category]}`} />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-base font-semibold text-zinc-50">{book.title}</p>
                      <p className="mt-0.5 text-sm text-zinc-300">{book.author}</p>
                      <p className="mt-1 text-xs capitalize text-zinc-500">Originally in: {book.category}</p>
                      {book.tags && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {book.tags.split(",").map((tag: string, i: number) => (
                            <span
                              key={i}
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                tag.trim() === "to-reread"
                                  ? "border border-sky-500/40 bg-sky-500/20 text-sky-300"
                                  : "border border-zinc-600 bg-zinc-700 text-zinc-300"
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

                <div className="flex flex-wrap gap-2 sm:ml-4 sm:flex-shrink-0">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleRemoveRereadTag(book)}
                    disabled={markingId === book.id}
                    className="flex-1 sm:flex-none"
                  >
                    {markingId === book.id ? "Saving…" : "Mark as Read"}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleEditTags(book)}
                    className="flex-1 sm:flex-none"
                  >
                    Edit Tags
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBookToDelete(book)}
                    className="flex-1 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 sm:flex-none"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingBook && (
        <Modal onClose={() => { setEditingBook(null); setTagsInput(""); }}>
          <h2 className="mb-6 font-serif text-xl font-semibold text-zinc-50">Edit Tags</h2>
          <div className="mb-4">
            <p className="font-medium text-zinc-100">{editingBook.title}</p>
            <p className="text-sm text-zinc-400">{editingBook.author}</p>
          </div>
          <div className="mb-5">
            <input
              className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="Type new tags or click existing ones…"
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
            {isSaving ? "Saving…" : "Save Tags"}
          </Button>
        </Modal>
      )}

      {bookToDelete && (
        <Modal onClose={() => setBookToDelete(null)}>
          <h2 className="mb-4 font-serif text-xl font-semibold text-zinc-50">Remove book</h2>
          <p className="mb-6 text-sm text-zinc-300">
            Are you sure you want to remove "
            <span className="font-medium text-zinc-100">{bookToDelete.title}</span>"? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setBookToDelete(null)} className="w-full">Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={isDeleting} className="w-full">
              {isDeleting ? "Removing…" : "Remove"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default RereadTab;