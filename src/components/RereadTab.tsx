import React, { useState } from "react";
import { Check, Tag, Trash2 } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import SearchBar from "./SearchBar";
import BookList, { BookListItem } from "./BookList";
import BookSkeleton from "./BookSkeleton";
import IconAction from "./IconAction";
import ActiveTagFilters from "./ActiveTagFilters";
import TagInput from "./TagInput";
import { API, authAxios } from "./api";
import { RANKING_CATEGORIES } from "./bookMeta";
import { useToast } from "./ToastContext";

interface RereadTabProps {
  books: any;
  setBooks: React.Dispatch<React.SetStateAction<any>>;
  allTags: string[];
  loading?: boolean;
}

const RereadTab: React.FC<RereadTabProps> = ({ books, setBooks, allTags, loading }) => {
  const { show } = useToast();

  const [editingBook, setEditingBook] = useState<any>(null);
  const [tagsInput, setTagsInput] = useState("");
  const [bookToDelete, setBookToDelete] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [markingId, setMarkingId] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const toggleTagFilter = (tag: string) =>
    setTagFilters((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

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
      show({ message: `Updated tags for "${editingBook.title}"` });
      setEditingBook(null);
      setTagsInput("");
    } catch (error) {
      console.error("Error saving tags:", error);
      show({ message: "Failed to save tags" });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!bookToDelete) return;
    setIsDeleting(true);
    const snapshot = bookToDelete;
    const originalCategory = snapshot.category;
    const originalArr: any[] = books[originalCategory] || [];
    const originalPosition = originalArr.findIndex((b: any) => b.id === snapshot.id);
    try {
      await authAxios.delete(`${API}/books/${snapshot.id}`);
      const updatedBooks = { ...books };
      updatedBooks[originalCategory] = updatedBooks[originalCategory].filter(
        (b: any) => b.id !== snapshot.id
      );
      setBooks(updatedBooks);
      setBookToDelete(null);
      show({
        message: `Removed "${snapshot.title}"`,
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              const res = await authAxios.post(`${API}/books`, {
                title: snapshot.title,
                author: snapshot.author,
                category: originalCategory,
                position: originalPosition === -1 ? 0 : originalPosition,
                tags: snapshot.tags || "",
              });
              const restored = { ...snapshot, id: res.data?.id ?? snapshot.id };
              setBooks((prev: any) => {
                const arr = [...(prev[originalCategory] || [])];
                arr.splice(originalPosition === -1 ? arr.length : originalPosition, 0, restored);
                return { ...prev, [originalCategory]: arr };
              });
              show({ message: `Restored "${snapshot.title}"` });
            } catch (e) {
              console.error("Undo failed:", e);
              show({ message: "Undo failed" });
            }
          },
        },
      });
    } catch (error) {
      console.error("Error deleting book:", error);
      show({ message: "Failed to remove book" });
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
      show({ message: `"${book.title}" no longer marked to reread` });
    } catch (error) {
      console.error("Error removing reread tag:", error);
      show({ message: "Failed to update" });
    } finally {
      setMarkingId(null);
    }
  };

  const getRereadBooks = () => {
    const rereadBooks: any[] = [];
    RANKING_CATEGORIES.forEach((category) => {
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


  if (loading) {
    return (
      <div>
        <BookSkeleton count={4} />
      </div>
    );
  }

  const rereadBooks = getRereadBooks();
  const matchesText = (b: any, q: string) => {
    if (!q) return true;
    const l = q.toLowerCase();
    return (
      b.title.toLowerCase().includes(l) ||
      b.author.toLowerCase().includes(l) ||
      (b.tags || "").toLowerCase().includes(l)
    );
  };
  const matchesTags = (b: any, tags: string[]) => {
    if (tags.length === 0) return true;
    const bookTags = (b.tags || "").split(",").map((t: string) => t.trim().toLowerCase());
    return tags.every((t) => bookTags.includes(t.toLowerCase()));
  };
  const filtered = rereadBooks.filter((b) => matchesText(b, searchQuery) && matchesTags(b, tagFilters));

  const items: BookListItem[] = filtered.map((book: any) => ({
    key: book.id,
    book,
    categoryDot: book.category,
    actions: (
      <>
        <IconAction
          icon={Check}
          label="Mark as read (remove reread tag)"
          onClick={() => handleRemoveRereadTag(book)}
          disabled={markingId === book.id}
          tone="success"
        />
        <IconAction icon={Tag} label="Edit tags" onClick={() => handleEditTags(book)} />
        <IconAction icon={Trash2} label="Remove" onClick={() => setBookToDelete(book)} tone="danger" />
      </>
    ),
  }));

  return (
    <div>
      {rereadBooks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-subtle bg-surface p-8 text-center">
          <p className="text-base font-medium text-text-primary">No books marked for rereading yet</p>
          <p className="mt-2 text-sm text-text-secondary">
            Click the bookmark icon on any book in Rankings to add it here.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>
          <ActiveTagFilters
            tags={tagFilters}
            onRemove={(t) => setTagFilters((prev) => prev.filter((x) => x !== t))}
            onClearAll={() => setTagFilters([])}
            className="-mt-2 mb-4"
          />
          <div className="mb-3 flex items-center gap-2.5 px-1">
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{ background: "var(--cat-reread)" }}
            />
            <h2 className="font-serif text-base font-semibold text-text-primary">To reread</h2>
            <span className="text-xs text-text-muted tabular-nums">
              {searchQuery || tagFilters.length > 0
                ? `${filtered.length} of ${rereadBooks.length}`
                : rereadBooks.length}
            </span>
          </div>
          <BookList
            items={items}
            onTagClick={toggleTagFilter}
            activeTags={tagFilters}
            empty={
              <p className="rounded-lg border border-dashed border-border-subtle p-4 text-sm italic text-text-muted">
                No books match your search
              </p>
            }
          />
        </>
      )}

      {editingBook && (
        <Modal onClose={() => { setEditingBook(null); setTagsInput(""); }}>
          <h2 className="mb-6 font-serif text-xl font-semibold text-text-primary">Edit tags</h2>
          <div className="mb-4">
            <p className="font-medium text-text-primary">{editingBook.title}</p>
            <p className="text-sm text-text-secondary">{editingBook.author}</p>
          </div>
          <TagInput value={tagsInput} onChange={setTagsInput} allTags={allTags} autoFocus />
          <Button onClick={handleSaveTags} disabled={isSaving} className="mt-6 w-full">
            {isSaving ? "Saving…" : "Save tags"}
          </Button>
        </Modal>
      )}

      {bookToDelete && (
        <Modal onClose={() => setBookToDelete(null)}>
          <h2 className="mb-4 font-serif text-xl font-semibold text-text-primary">Remove book</h2>
          <p className="mb-6 text-sm text-text-secondary">
            Are you sure you want to remove "
            <span className="font-medium text-text-primary">{bookToDelete.title}</span>"? You can undo right after.
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
