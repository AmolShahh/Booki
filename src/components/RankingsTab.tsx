import React, { useState } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { API, authAxios } from "./api";

interface RankingsTabProps {
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

const RankingsTab: React.FC<RankingsTabProps> = ({ books, setBooks, allTags }) => {
  const [editingBook, setEditingBook] = useState<any>(null);
  const [tagsInput, setTagsInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [bookToDelete, setBookToDelete] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleReread = async (book: any) => {
    try {
      const currentTags = book.tags || "";
      const tagsArray = currentTags.split(",").map((t: string) => t.trim()).filter(Boolean);
      if (tagsArray.includes("to-reread")) return;
      const newTags = [...tagsArray, "to-reread"].join(", ");
      await authAxios.put(`${API}/books/${book.id}`, { tags: newTags });
      const updatedBooks = { ...books };
      updatedBooks[book.category] = updatedBooks[book.category].map((b: any) =>
        b.id === book.id ? { ...b, tags: newTags } : b
      );
      setBooks(updatedBooks);
    } catch (error) {
      console.error("Error adding reread tag:", error);
    }
  };

  // Single search bar matches title, author, OR any tag
  const filteredBooks = (category: string) => {
    const allBooksInCategory = books[category] || [];
    return allBooksInCategory
      .map((book: any, index: number) => ({ ...book, originalIndex: index }))
      .filter((b: any) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          (b.tags || "").toLowerCase().includes(q)
        );
      });
  };

  const handleTagClick = (tag: string) => {
    const currentTags = tagsInput.split(",").map((t: string) => t.trim()).filter(Boolean);
    const newTags = new Set(currentTags);
    if (newTags.has(tag)) newTags.delete(tag);
    else newTags.add(tag);
    setTagsInput(Array.from(newTags).join(", "));
  };

  const selectedTags = tagsInput.split(",").map((t: string) => t.trim()).filter(Boolean);

  let continuousBookNumber = 0;

  return (
    <div>
      <div className="mb-6">
        <input
          placeholder="Search by title, author, or tag…"
          className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 shadow-sm transition-colors focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {CATEGORIES.map((cat) => {
        const booksInCategory = filteredBooks(cat);
        const totalBooksInCategory = books[cat]?.length || 0;
        const startIndex = continuousBookNumber;
        continuousBookNumber += totalBooksInCategory;

        return (
          <div key={cat} className="mb-8">
            <h2 className="mb-4 flex items-center gap-2.5 font-serif text-xl font-semibold text-zinc-50">
              <span className={`h-2.5 w-2.5 rounded-full ${CATEGORY_DOT[cat]}`} />
              <span className="capitalize">{cat}</span>
              <span className="font-sans text-sm font-normal text-zinc-400">
                {booksInCategory.length} of {totalBooksInCategory}
              </span>
            </h2>

            {booksInCategory.length === 0 && totalBooksInCategory === 0 && (
              <p className="rounded-lg border border-dashed border-zinc-700 p-4 text-sm italic text-zinc-500">
                No books in this category yet
              </p>
            )}
            {booksInCategory.length === 0 && totalBooksInCategory > 0 && (
              <p className="rounded-lg border border-dashed border-zinc-700 p-4 text-sm italic text-zinc-500">
                No books match your search
              </p>
            )}

            {booksInCategory.map((book: any) => (
              <div
                key={book.id}
                className="mb-3 rounded-xl border border-zinc-600 bg-zinc-800 p-5 transition-colors duration-150 hover:border-zinc-500 hover:bg-zinc-750"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full border border-zinc-600 bg-zinc-700 text-sm font-semibold text-amber-400">
                        {startIndex + book.originalIndex + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-base font-semibold text-zinc-50">{book.title}</p>
                        <p className="mt-0.5 text-sm text-zinc-300">{book.author}</p>
                        {book.tags && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {book.tags.split(",").map((tag: string, i: number) => (
                              <span
                                key={i}
                                className="rounded-full border border-zinc-600 bg-zinc-700 px-2.5 py-0.5 text-xs font-medium text-zinc-300"
                              >
                                {tag.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:ml-4 sm:min-w-[150px] sm:flex-shrink-0 sm:flex-col">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleReread(book)}
                      className="flex-1 sm:flex-none sm:w-full"
                      disabled={book.tags?.includes("to-reread")}
                    >
                      {book.tags?.includes("to-reread") ? "✓ To Reread" : "Reread"}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEditTags(book)}
                      className="flex-1 sm:flex-none sm:w-full"
                    >
                      Edit Tags
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setBookToDelete(book)}
                      className="flex-1 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 sm:flex-none sm:w-full"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })}

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

export default RankingsTab;