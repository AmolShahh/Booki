from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
from typing import List, Optional

API_CATEGORIES = ["liked it", "it was ok", "didn't like it"]

app = FastAPI()
origins = [
    "http://localhost:5173",  # your frontend
]
# Allow frontend localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],        # allow POST, PUT, DELETE, GET
    allow_headers=["*"],        # allow headers like Content-Type
)

# SQLite setup
conn = sqlite3.connect("books.db", check_same_thread=False)
cursor = conn.cursor()
cursor.execute("""
CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT,
    category TEXT NOT NULL,
    position INTEGER NOT NULL,
    tags TEXT
)
""")
conn.commit()

# Pydantic models
class Book(BaseModel):
    title: str
    author: str
    isbn: Optional[str] = None
    category: str
    position: int
    tags: Optional[str] = ""

class UpdateTags(BaseModel):
    tags: str

# Routes
@app.post("/api/books")
def add_book(book: Book):
    # Shift positions >= new position
    cursor.execute("""
    UPDATE books SET position = position + 1
    WHERE category = ? AND position >= ?
    """, (book.category, book.position))
    # Insert book
    cursor.execute("""
    INSERT INTO books (title, author, isbn, category, position, tags)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (book.title, book.author, book.isbn, book.category, book.position, book.tags))
    conn.commit()
    return {"status": "ok"}

@app.get("/api/books")
def get_books():
    result = {cat: [] for cat in API_CATEGORIES}
    cursor.execute("SELECT id, title, author, isbn, category, position, tags FROM books")
    for row in cursor.fetchall():
        book = {"id": row[0], "title": row[1], "author": row[2], "isbn": row[3],
                "category": row[4], "position": row[5], "tags": row[6]}
        result[book["category"]].append(book)
    # Sort by position
    for cat in API_CATEGORIES:
        result[cat].sort(key=lambda x: x["position"])
    return result

@app.put("/api/books/{book_id}")
def update_book_tags(book_id: int, update: UpdateTags):
    cursor.execute("UPDATE books SET tags = ? WHERE id = ?", (update.tags, book_id))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Book not found")
    conn.commit()
    return {"status": "ok"}

@app.delete("/api/books/{book_id}")
def delete_book(book_id: int):
    cursor.execute("SELECT category, position FROM books WHERE id = ?", (book_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Book not found")
    category, position = row
    cursor.execute("DELETE FROM books WHERE id = ?", (book_id,))
    # Shift positions down
    cursor.execute("UPDATE books SET position = position - 1 WHERE category = ? AND position > ?", (category, position))
    conn.commit()
    return {"status": "ok"}

# Optional: Simple search endpoint using OpenLibrary API
import requests

@app.get("/api/search")
def search_books(q: str):
    res = requests.get(f"https://openlibrary.org/search.json?q={q}")
    docs = res.json().get("docs", [])[:10]
    results = []
    for d in docs:
        title = d.get("title")
        author = ", ".join(d.get("author_name", [])) if d.get("author_name") else "Unknown"
        isbn = d.get("isbn", [None])[0] if d.get("isbn") else None
        results.append({"title": title, "author": author, "isbn": isbn})
    return {"results": results}
