# functions/_worker.py
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

# Note: We still import sqlite3, but only for the data types, 
# as D1 uses the same query syntax. The actual connection object 
# will be provided by Cloudflare.
import sqlite3 

# --- Pydantic Models ---
# Your Pydantic models remain the same
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

# --- FastAPI App Initialization ---
# The FastAPI app itself remains largely the same
app = FastAPI()
API_CATEGORIES = ["liked it", "it was ok", "didn't like it", "tbr"]
origins = ["http://localhost:5173"]

# Allow frontend localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

# --- D1 Connection / Table Setup Function ---

# D1 uses the SQLITE_EXEC binding to run DDL (CREATE TABLE) statements.
# This function is executed once when the app starts up on the Worker.
# Note: D1/Workers does not directly support the 'sqlite3.connect' pattern.
# We will use the 'DB' binding passed via the environment.
def initialize_db(db):
    # D1 does not have a separate 'cursor' and 'connection' object like sqlite3.
    # We use .exec_batch() to run multiple statements, which is ideal for DDL.
    db.exec_batch("""
    CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        isbn TEXT,
        category TEXT NOT NULL,
        position INTEGER NOT NULL,
        tags TEXT
    );
    """)

# --- Routes ---

# Dependency to get the D1 database binding
# The 'request' object from Starlette/FastAPI will hold the D1 binding 
# provided by the Cloudflare environment in its 'state'.
def get_db(request: Request):
    db = request.app.state.db
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection not available")
    return db

@app.on_event("startup")
async def startup_event():
    # Placeholder: Actual D1 initialization happens in the wrapper function below.
    # We will defer table creation until the D1 object is available.
    app.state.db = None 

# -----------------------------------------------------------
# The D1 database binding is accessed through the 'db' parameter 
# which is passed to the get_db dependency.
# Note: D1 uses .prepare().bind().run() or .all() for queries.
# -----------------------------------------------------------

@app.post("/api/books")
async def add_book(book: Book, db: Any = Depends(get_db)):
    # Shift positions >= new position
    await db.prepare("""
    UPDATE books SET position = position + 1
    WHERE category = ? AND position >= ?
    """).bind(book.category, book.position).run()
    
    # Insert book
    result = await db.prepare("""
    INSERT INTO books (title, author, isbn, category, position, tags)
    VALUES (?, ?, ?, ?, ?, ?)
    """).bind(book.title, book.author, book.isbn, book.category, book.position, book.tags).run()
    
    # D1 doesn't need explicit conn.commit() in this context, as .run() is transaction-like.
    # Check if the insert was successful
    if result.success and result.changes > 0:
        return {"status": "ok", "id": result.lastRowId}
    else:
        raise HTTPException(status_code=500, detail="Failed to insert book")


@app.get("/api/books")
async def get_books(db: Any = Depends(get_db)):
    # D1 uses .all() to get all results, which includes the column names.
    result = await db.prepare("SELECT id, title, author, isbn, category, position, tags FROM books").all()
    
    data = result.get('results', [])
    grouped_result = {cat: [] for cat in API_CATEGORIES}
    
    for book in data:
        # Note: D1 returns dictionaries, not tuples, making this cleaner
        if book["category"] in grouped_result:
            grouped_result[book["category"]].append(book)
    
    # Sort by position (which is always necessary for display)
    for cat in API_CATEGORIES:
        grouped_result[cat].sort(key=lambda x: x["position"])
        
    return grouped_result

@app.put("/api/books/{book_id}")
async def update_book_tags(book_id: int, update: UpdateTags, db: Any = Depends(get_db)):
    result = await db.prepare("UPDATE books SET tags = ? WHERE id = ?").bind(update.tags, book_id).run()
    
    if result.changes == 0:
        raise HTTPException(status_code=404, detail="Book not found or tags were not changed")
        
    return {"status": "ok"}

@app.delete("/api/books/{book_id}")
async def delete_book(book_id: int, db: Any = Depends(get_db)):
    # Fetch category and position (using .first() for a single row)
    row = await db.prepare("SELECT category, position FROM books WHERE id = ?").bind(book_id).first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Book not found")
        
    # Start a transaction for the delete and re-order
    await db.exec_batch([
        # 1. Delete the book
        f"DELETE FROM books WHERE id = {book_id};",
        # 2. Shift positions down (category is TEXT, so needs quotes)
        f"UPDATE books SET position = position - 1 WHERE category = '{row['category']}' AND position > {row['position']};"
    ])
    
    return {"status": "ok"}

@app.put("/api/reorder")
async def reorder_books(data: ReorderRequest, db: Any = Depends(get_db)):
    try:
        # D1 exec_batch is perfect for this, as it runs everything as a single transaction
        sql_statements = [
            f"UPDATE books SET position = {item.position} WHERE id = {item.id};"
            for item in data.reorderedData
        ]
        
        await db.exec_batch("\n".join(sql_statements))
        
        return {"status": "ok", "message": "Books reordered successfully."}
    except Exception as e:
        # D1 handles rollback internally on failure of exec_batch
        raise HTTPException(status_code=500, detail=f"Reorder failed: {str(e)}")


# Optional: Simple search endpoint using OpenLibrary API (no D1 changes needed here)
import requests
from fastapi import Depends

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


# --- Cloudflare Pages/Workers Integration ---
# This is the standard boilerplate for running a Python web app on Workers.
from cloudflare.worker import Request as CFRequest # Rename to avoid conflict
from cloudflare.worker import WorkerGlobalScope # The CF Worker environment
from starlette.requests import Request as StarletteRequest
from starlette.responses import Response as StarletteResponse
from starlette.types import Scope, Receive, Send

async def application(scope: Scope, receive: Receive, send: Send):
    # Set the D1 binding into the app state
    if app.state.db is None:
        app.state.db = WorkerGlobalScope.env.DB  # Assumes your D1 binding is named 'DB'
        initialize_db(app.state.db) # Initialize table after getting the binding
        
    await app(scope, receive, send)

def export_default(request: CFRequest) -> StarletteResponse:
    return application # Cloudflare calls the 'application' function