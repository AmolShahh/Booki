import React, { useState } from "react";
import { BookOpen, ArrowUpRight, Tag, Trash2, GripVertical } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import SearchBar from "./SearchBar";
import CategorySection from "./CategorySection";
import BookList, { BookListItem } from "./BookList";
import BookSkeleton from "./BookSkeleton";
import IconAction from "./IconAction";
import ActiveTagFilters from "./ActiveTagFilters";
import TagInput from "./TagInput";
import { API, authAxios, apiErrorMessage, putBook, applyBookPatch, inferTimesRead } from "./api";
import { useToast } from "./ToastContext";

interface TbrTabProps {
  books: any;
  setBooks: React.Dispatch<React.SetStateAction<any>>;
  allTags: string[];
  loading?: boolean;
}

const RANKING_CATEGORIES = ["liked it", "it was ok", "didn't like it"];

const TbrTab: React.FC<TbrTabProps> = ({ books, setBooks, allTags, loading }) => {
  const { show } = useToast();
  const [editingBook, setEditingBook] = useState<any>(null);
  const [tagsInput, setTagsInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const toggleTagFilter = (tag: string) =>
    setTagFilters((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  const [bookToDelete, setBookToDelete] = useState<any>(null);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [scrollInterval, setScrollInterval] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [readingId, setReadingId] = useState<any>(null);

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
      await putBook(editingBook, { tags: tagsInput });
      const updatedBooks = { ...books };
      updatedBooks[editingBook.category] = updatedBooks[editingBook.category].map((b: any) =>
        b.id === editingBook.id ? applyBookPatch(b, { tags: tagsInput }) : b
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
      show({ message: apiErrorMessage(error, "Failed to remove book") });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMarkCurrentlyReading = async (book: any) => {
    setReadingId(book.id);
    try {
      const currentTags = book.tags || "";
      const tagsArray = currentTags.split(",").map((t: string) => t.trim()).filter(Boolean);
      const newTags = tagsArray.includes("currently-reading")
        ? tagsArray.filter((t: string) => t !== "currently-reading").join(", ")
        : [...tagsArray, "currently-reading"].join(", ");
      await putBook(book, { tags: newTags });
      const updatedBooks = { ...books };
      updatedBooks[book.category] = updatedBooks[book.category].map((b: any) =>
        b.id === book.id ? applyBookPatch(b, { tags: newTags }) : b
      );
      setBooks(updatedBooks);
      show({ message: tagsArray.includes("currently-reading") ? `Unmarked "${book.title}" as currently reading` : `Marked "${book.title}" as currently reading` });
    } catch (error) {
      console.error("Error toggling currently-reading tag:", error);
      show({ message: apiErrorMessage(error, "Failed to update") });
    } finally {
      setReadingId(null);
    }
  };

  const handleMoveToRead = (book: any) => {
    setMovingBook(book);
    setSelectedCategory(RANKING_CATEGORIES[0]);
    setMoveTagsInput(book.tags || "");
    setShowMoveModal(true);
  };

  const insertIntoCategoryAndDeleteTbr = async (position: number) => {
    // Preserve read history from the TBR row (usually 0, but non-zero if the
    // user marked & unmarked currently-reading before ranking). Backend defaults
    // to 1 for non-tbr categories, so we only need to override when the count
    // is already higher. Uses inferTimesRead so null-valued rows also carry.
    const carriedReadCount = Math.max(1, inferTimesRead(movingBook));
    const res = await authAxios.post(`${API}/books`, {
      title: movingBook.title, author: movingBook.author,
      category: selectedCategory, position, tags: moveTagsInput,
      times_read: carriedReadCount,
    });
    await authAxios.delete(`${API}/books/${movingBook.id}`);
    return res.data?.id;
  };

  const confirmMoveToRead = async () => {
    if (!movingBook) return;
    setIsMoving(true);
    const arr = (books[selectedCategory] || []).filter(
      (b: any) => !(b.title === movingBook.title && b.author === movingBook.author)
    );

    if (arr.length === 0) {
      try {
        const newId = await insertIntoCategoryAndDeleteTbr(0);
        const updatedBooks = { ...books };
        updatedBooks.tbr = (updatedBooks.tbr || []).filter((b: any) => b.id !== movingBook.id);
        updatedBooks[selectedCategory] = [{ ...movingBook, id: newId ?? movingBook.id, tags: moveTagsInput, category: selectedCategory }];
        setBooks(updatedBooks);
        show({ message: `Moved "${movingBook.title}" to ${selectedCategory}` });
      } catch (error) {
        console.error("Error moving book:", error);
        show({ message: apiErrorMessage(error, "Failed to move book") });
        setIsMoving(false);
        return;
      }
      setShowMoveModal(false);
      setMovingBook(null);
      setIsMoving(false);
      return;
    }

    setShowMoveModal(false);
    setLow(0);
    setHigh(arr.length);
    setMidIndex(Math.floor(arr.length / 2));
    setShowComparisonModal(true);
    setIsMoving(false);
  };

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
      try {
        const newId = await insertIntoCategoryAndDeleteTbr(position);
        const updated = [...arr];
        updated.splice(position, 0, { ...movingBook, id: newId ?? movingBook.id, tags: moveTagsInput, category: selectedCategory });
        const updatedBooks = { ...books };
        updatedBooks.tbr = (updatedBooks.tbr || []).filter((b: any) => b.id !== movingBook.id);
        updatedBooks[selectedCategory] = updated;
        setBooks(updatedBooks);
        show({ message: `Moved "${movingBook.title}" to ${selectedCategory} at #${position + 1}` });
      } catch (error) {
        console.error("Error moving book:", error);
        show({ message: apiErrorMessage(error, "Failed to move book") });
        return;
      }
      setMovingBook(null); setLow(0); setHigh(0); setMidIndex(0); setShowComparisonModal(false);
      return;
    }
    setLow(newLow); setHigh(newHigh); setMidIndex(Math.floor((newLow + newHigh) / 2));
  };

  const currentComparison = () => {
    const arr = (books[selectedCategory] || []).filter(
      (b: any) => !(b.title === movingBook.title && b.author === movingBook.author)
    );
    return arr[midIndex];
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


  // ── Drag and Drop ──────────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, book: any) => {
    setDraggedItem(book);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const scrollThreshold = 100;
    const scrollSpeed = 12;
    const mouseY = e.clientY;
    const windowHeight = window.innerHeight;
    const inTopZone = mouseY < scrollThreshold;
    const inBottomZone = mouseY > windowHeight - scrollThreshold;
    if (!inTopZone && !inBottomZone) {
      if (scrollInterval) { clearInterval(scrollInterval); setScrollInterval(null); }
      return;
    }
    if (scrollInterval) return;
    const interval = setInterval(() => {
      window.scrollBy({ top: inTopZone ? -scrollSpeed : scrollSpeed, behavior: "auto" });
    }, 30) as unknown as number;
    setScrollInterval(interval);
  };

  const handleDrop = async (e: React.DragEvent, droppedOnBook: any) => {
    e.preventDefault();
    if (scrollInterval) { clearInterval(scrollInterval); setScrollInterval(null); }
    if (!draggedItem || draggedItem.id === droppedOnBook.id) { setDraggedItem(null); return; }
    const tbrBooks = books.tbr.slice();
    const draggedIndex = tbrBooks.findIndex((b: any) => Number(b.id) === Number(draggedItem.id));
    const droppedOnIndex = tbrBooks.findIndex((b: any) => Number(b.id) === Number(droppedOnBook.id));
    tbrBooks.splice(draggedIndex, 1);
    tbrBooks.splice(droppedOnIndex, 0, draggedItem);
    setBooks({ ...books, tbr: tbrBooks });
    try {
      await authAxios.put(`${API}/reorder`, {
        reorderedData: tbrBooks.map((book: any, index: any) => ({ id: Number(book.id), position: Number(index) })),
      });
    } catch (error) { console.error("Error reordering:", error); }
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    if (scrollInterval) { clearInterval(scrollInterval); setScrollInterval(null); }
    setDraggedItem(null);
  };

  const all: any[] = books.tbr || [];
  const filtered = all
    .map((book: any, index: number) => ({ book, index }))
    .filter(({ book }: any) => matches(book));

  const items: BookListItem[] = filtered.map(({ book, index }: any) => {
    const isReading = (book.tags || "").split(",").map((t: string) => t.trim()).includes("currently-reading");
    return {
      key: book.id,
      book,
      rank: index + 1,
      isTop3: false,
      isDragging: draggedItem?.id === book.id,
      prefix: (
        <span
          className="mt-1.5 flex-none cursor-grab select-none text-text-muted hover:text-text-primary active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical size={14} />
        </span>
      ),
      wrapperProps: {
        draggable: true,
        onDragStart: (e: React.DragEvent<HTMLDivElement>) => handleDragStart(e, book),
        onDragOver: handleDragOver,
        onDrop: (e: React.DragEvent<HTMLDivElement>) => handleDrop(e, book),
        onDragEnd: handleDragEnd,
      },
      actions: (
        <>
          <IconAction
            icon={BookOpen}
            label={isReading ? "Currently reading" : "Mark currently reading"}
            onClick={() => handleMarkCurrentlyReading(book)}
            disabled={readingId === book.id}
            active={isReading}
            tone="accent"
          />
          <IconAction icon={ArrowUpRight} label="Move to read" onClick={() => handleMoveToRead(book)} tone="success" />
          <IconAction icon={Tag} label="Edit tags" onClick={() => handleEditTags(book)} />
          <IconAction icon={Trash2} label="Remove" onClick={() => setBookToDelete(book)} tone="danger" />
        </>
      ),
    };
  });

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <SearchBar value="" onChange={() => {}} />
        </div>
        <BookSkeleton count={6} />
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

      <CategorySection
        category="tbr"
        count={filtered.length}
        totalCount={all.length}
      >
        <BookList
          items={items}
          onTagClick={toggleTagFilter}
          activeTags={tagFilters}
          empty={
            <p className="rounded-lg border border-dashed border-border-subtle p-4 text-sm italic text-text-muted">
              {all.length === 0 ? "No books in your TBR yet" : "No books match your search"}
            </p>
          }
        />
      </CategorySection>

      {/* Move to Read Modal */}
      {showMoveModal && movingBook && (
        <Modal onClose={() => { setShowMoveModal(false); setMovingBook(null); }}>
          <h2 className="mb-6 font-serif text-xl font-semibold text-text-primary">Move to read</h2>
          <div className="mb-4 rounded-lg border border-accent/30 bg-accent-bg p-4">
            <p className="font-medium text-text-primary">{movingBook.title}</p>
            <p className="mt-1 text-sm text-text-secondary">by {movingBook.author}</p>
          </div>
          <div className="mb-6">
            <p className="mb-3 text-sm font-medium text-text-secondary">Category:</p>
            <div className="flex flex-wrap gap-2">
              {RANKING_CATEGORIES.map((c) => (
                <Button key={c} onClick={() => setSelectedCategory(c)} variant={selectedCategory === c ? "primary" : "secondary"} size="sm">{c}</Button>
              ))}
            </div>
          </div>
          <div className="mb-6">
            <p className="mb-2 text-sm font-medium text-text-secondary">Tags (optional):</p>
            <TagInput value={moveTagsInput} onChange={setMoveTagsInput} allTags={allTags} />
          </div>
          <Button onClick={confirmMoveToRead} disabled={isMoving} className="w-full">
            {isMoving ? "Moving…" : "Confirm & compare"}
          </Button>
        </Modal>
      )}

      {/* Comparison Modal */}
      {showComparisonModal && currentComparison() && movingBook && (
        <Modal onClose={() => { setShowComparisonModal(false); setMovingBook(null); setLow(0); setHigh(0); setMidIndex(0); }}>
          <h2 className="mb-6 font-serif text-xl font-semibold text-text-primary">Which did you like more?</h2>
          <div className="mb-6 space-y-3">
            <div className="rounded-xl border border-border-subtle bg-surface-sunken p-5">
              <p className="font-medium text-text-primary">{currentComparison().title}</p>
              <p className="mt-1 text-sm text-text-secondary">by {currentComparison().author}</p>
            </div>
            <div className="rounded-xl border border-accent/30 bg-accent-bg p-5">
              <p className="font-medium text-text-primary">{movingBook.title}</p>
              <p className="mt-1 text-sm text-text-secondary">by {movingBook.author}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => handleComparison(false)} variant="secondary" className="w-1/2">First book</Button>
            <Button onClick={() => handleComparison(true)} variant="primary" className="w-1/2">Second book</Button>
          </div>
        </Modal>
      )}

      {/* Edit Tags Modal */}
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

      {/* Delete Modal */}
      {bookToDelete && (
        <Modal onClose={() => setBookToDelete(null)}>
          <h2 className="mb-4 font-serif text-xl font-semibold text-text-primary">Remove book</h2>
          <p className="mb-6 text-sm text-text-secondary">
            Are you sure you want to remove "
            <span className="font-medium text-text-primary">{bookToDelete.title}</span>"? This action cannot be undone.
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

export default TbrTab;
