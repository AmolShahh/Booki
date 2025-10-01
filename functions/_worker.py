from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any
import requests

# --- Pydantic Models ---
class Book(BaseModel):
    title: str
    author: str
    isbn: Optional[str] = None
    category: str
    position: int
    tags: Optional[str] = ""

class UpdateTags(BaseModel):
    tags: str

class ReorderItem(BaseModel):
    id: int
    position: int

class ReorderRequest(BaseModel):
    reorderedData: List[ReorderItem]

# --- FastAPI App ---
app = FastAPI()
API_CATEGORIES = ["liked it", "it was ok", "didn't like it", "tbr"]

# CORS - Add your production domain here
origins = [
    "http://localhost:5173",
    "https://booki.pages.dev",  # Add your actual Cloudflare Pages URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

# --- D1 Setup ---
def initialize_db(db):
    db.batch([
        """
        CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            isbn TEXT,
            category TEXT NOT NULL,
            position INTEGER NOT NULL,
            tags TEXT
        )
        """
    ])

def get_db(request: Request):
    db = request.state.db
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    return db

# --- Routes ---
@app.post("/api/books")
async def add_book(book: Book, request: Request):
    db = get_db(request)
    
    # Shift positions
    db.prepare(
        "UPDATE books SET position = position + 1 WHERE category = ? AND position >= ?"
    ).bind(book.category, book.position).run()
    
    # Insert book
    result = db.prepare(
        "INSERT INTO books (title, author, isbn, category, position, tags) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(book.title, book.author, book.isbn, book.category, book.position, book.tags).run()
    
    return {"status": "ok", "id": result.meta.last_row_id}

@app.get("/api/books")
async def get_books(request: Request):
    db = get_db(request)
    result = db.prepare("SELECT * FROM books").all()
    
    grouped_result = {cat: [] for cat in API_CATEGORIES}
    
    for book in result.results:
        if book["category"] in grouped_result:
            grouped_result[book["category"]].append(book)
    
    for cat in API_CATEGORIES:
        grouped_result[cat].sort(key=lambda x: x["position"])
        
    return grouped_result

@app.put("/api/books/{book_id}")
async def update_book_tags(book_id: int, update: UpdateTags, request: Request):
    db = get_db(request)
    result = db.prepare("UPDATE books SET tags = ? WHERE id = ?").bind(update.tags, book_id).run()
    
    if result.meta.changes == 0:
        raise HTTPException(status_code=404, detail="Book not found")
        
    return {"status": "ok"}

@app.delete("/api/books/{book_id}")
async def delete_book(book_id: int, request: Request):
    db = get_db(request)
    
    row = db.prepare("SELECT category, position FROM books WHERE id = ?").bind(book_id).first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Delete and reorder
    db.batch([
        f"DELETE FROM books WHERE id = {book_id}",
        f"UPDATE books SET position = position - 1 WHERE category = '{row['category']}' AND position > {row['position']}"
    ])
    
    return {"status": "ok"}

@app.put("/api/reorder")
async def reorder_books(data: ReorderRequest, request: Request):
    db = get_db(request)
    
    statements = [
        f"UPDATE books SET position = {item.position} WHERE id = {item.id}"
        for item in data.reorderedData
    ]
    
    db.batch(statements)
    return {"status": "ok"}

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

# --- Cloudflare Worker Handler ---
async def on_fetch(request, env):
    import asgi
    
    # Initialize DB on first request
    if not hasattr(env, '_db_initialized'):
        initialize_db(env.DB)
        env._db_initialized = True
    
    # Create ASGI scope with DB in state
    return await asgi.fetch(app, request, env)