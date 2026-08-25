import React, { useState } from "react";
import { ArrowUpDown, Bookmark, Tag, Trash2 } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import SearchBar from "./SearchBar";
import CategorySection from "./CategorySection";
import BookList, { BookListItem } from "./BookList";
import BookSkeleton from "./BookSkeleton";
import IconAction from "./IconAction";
import ActiveTagFilters from "./ActiveTagFilters";
import TagInput from "./TagInput";
import { API, authAxios, apiErrorMessage } from "./api";
import { RANKING_CATEGORIES, CATEGORY_LABEL } from "./bookMeta";
import { useToast } from "./ToastContext";

interface RankingsTabProps {
  books: any;
  setBooks: React.Dispatch<React.SetStateAction<any>>;
  allTags: string[];
  loading?: boolean;
}

const RankingsTab: React.FC<RankingsTabProps> = ({ books, setBooks, allTags, loading }) => {
  const { show } = useToast();

  const [editingBook, setEditingBook] = useState<any>(null);
  const [tagsInput, setTagsInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const toggleTagFilter = (tag: string) =>
    setTagFilters((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  const [bookToDelete, setBookToDelete] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Re-rank state (binary-search comparison against the current category).
  const [rerankingBook, setRerankingBook] = useState<any>(null);
  const [rerankLow, setRerankLow] = useState(0);
  const [rerankHigh, setRerankHigh] = useState(0);
  const [rerankMid, setRerankMid] = useState(0);

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
      show({ message: apiErrorMessage(error, "Failed to save tags") });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!bookToDelete) return;
    setIsDeleting(true);
    const snapshot = bookToDelete; // capture for undo
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
      show({ message: apiErrorMessage(error, "Failed to remove book") });
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
      show({ message: `Marked "${book.title}" to reread` });
    } catch (error) {
      console.error("Error adding reread tag:", error);
      show({ message: apiErrorMessage(error, "Failed to mark reread") });
    }
  };

  // ── Re-rank ────────────────────────────────────────────────────────────────
  const startRerank = (book: any) => {
    const others: any[] = (books[book.category] || []).filter((b: any) => b.id !== book.id);
    if (others.length === 0) {
      show({ message: `"${book.title}" is the only book in this category` });
      return;
    }
    setRerankingBook(book);
    setRerankLow(0);
    setRerankHigh(others.length);
    setRerankMid(Math.floor(others.length / 2));
  };

  const rerankCandidate = () => {
    if (!rerankingBook) return null;
    const others: any[] = (books[rerankingBook.category] || []).filter(
      (b: any) => b.id !== rerankingBook.id
    );
    return others[rerankMid];
  };

  const applyRerank = async (newPosition: number) => {
    if (!rerankingBook) return;
    const cat = rerankingBook.category;
    const others: any[] = (books[cat] || []).filter((b: any) => b.id !== rerankingBook.id);
    const newOrder = [...others.slice(0, newPosition), rerankingBook, ...others.slice(newPosition)];
    setBooks({ ...books, [cat]: newOrder });
    try {
      await authAxios.put(`${API}/reorder`, {
        reorderedData: newOrder.map((b: any, i: number) => ({ id: Number(b.id), position: Number(i) })),
      });
      show({ message: `Re-ranked "${rerankingBook.title}" to #${newPosition + 1} in ${CATEGORY_LABEL[cat] ?? cat}` });
    } catch (e) {
      console.error("Rerank persist failed:", e);
      show({ message: "Failed to save new rank" });
    }
    setRerankingBook(null);
    setRerankLow(0); setRerankHigh(0); setRerankMid(0);
  };

  const rerankChoose = (newBetter: boolean) => {
    let newLow = rerankLow;
    let newHigh = rerankHigh;
    if (newBetter) newHigh = rerankMid;
    else newLow = rerankMid + 1;
    if (newLow >= newHigh) {
      applyRerank(newLow);
      return;
    }
    setRerankLow(newLow);
    setRerankHigh(newHigh);
    setRerankMid(Math.floor((newLow + newHigh) / 2));
  };

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
  const matches = (b: any) => matchesText(b, searchQuery) && matchesTags(b, tagFilters);

  let continuousBookNumber = 0;

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <SearchBar value="" onChange={() => {}} />
        </div>
        <BookSkeleton count={4} />
        <BookSkeleton count={3} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      <ActiveTagFilters
        tags={tagFilters}
        onRemove={(t) => setTagFilters((prev) => prev.filter((x) => x !== t))}
        onClearAll={() => setTagFilters([])}
        className="-mt-2 mb-4"
      />

      {RANKING_CATEGORIES.map((cat) => {
        const all: any[] = books[cat] || [];
        const filtered = all
          .map((book, index) => ({ book, index }))
          .filter(({ book }) => matches(book));

        const startIndex = continuousBookNumber;
        continuousBookNumber += all.length;

        const items: BookListItem[] = filtered.map(({ book, index }) => {
          const rank = startIndex + index + 1;
          const isTop3 = index < 3;
          const isReread = (book.tags || "").split(",").map((t: string) => t.trim()).includes("to-reread");
          return {
            key: book.id,
            book,
            rank,
            isTop3,
            actions: (
              <>
                <IconAction icon={ArrowUpDown} label="Re-rank" onClick={() => startRerank(book)} tone="accent" />
                <IconAction
                  icon={Bookmark}
                  label={isReread ? "Marked to reread" : "Mark to reread"}
                  onClick={() => handleReread(book)}
                  disabled={isReread}
                  active={isReread}
                  tone="accent"
                />
                <IconAction icon={Tag} label="Edit tags" onClick={() => handleEditTags(book)} />
                <IconAction icon={Trash2} label="Remove" onClick={() => setBookToDelete(book)} tone="danger" />
              </>
            ),
          };
        });

        return (
          <CategorySection
            key={cat}
            category={cat}
            count={filtered.length}
            totalCount={all.length}
          >
            <BookList
              items={items}
              onTagClick={toggleTagFilter}
              activeTags={tagFilters}
              empty={
                <p className="rounded-lg border border-dashed border-border-subtle p-4 text-sm italic text-text-muted">
                  {all.length === 0 ? "No books in this category yet" : "No books match your search"}
                </p>
              }
            />
          </CategorySection>
        );
      })}

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

      {rerankingBook && rerankCandidate() && (
        <Modal onClose={() => { setRerankingBook(null); setRerankLow(0); setRerankHigh(0); setRerankMid(0); }}>
          <h2 className="mb-1 font-serif text-xl font-semibold text-text-primary">Re-rank</h2>
          <p className="mb-6 text-sm text-text-muted">Which did you like more?</p>
          <div className="mb-6 space-y-3">
            <div className="rounded-xl border border-border-subtle bg-surface-sunken p-5">
              <p className="font-medium text-text-primary">{rerankCandidate()!.title}</p>
              <p className="mt-1 text-sm text-text-secondary">by {rerankCandidate()!.author}</p>
            </div>
            <div className="rounded-xl border border-accent/30 bg-accent-bg p-5">
              <p className="font-medium text-text-primary">{rerankingBook.title}</p>
              <p className="mt-1 text-sm text-text-secondary">by {rerankingBook.author}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => rerankChoose(false)} variant="secondary" className="w-1/2">First book</Button>
            <Button onClick={() => rerankChoose(true)} variant="primary" className="w-1/2">Second book</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default RankingsTab;
