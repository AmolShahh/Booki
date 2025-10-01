import { Hono } from 'hono';
import { cors } from 'hono/cors';

// Types
type Env = {
  DB: D1Database;
};

type Book = {
  id?: number;
  title: string;
  author: string;
  isbn?: string;
  category: string;
  position: number;
  tags?: string;
};

type ReorderItem = {
  id: number;
  position: number;
};

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('/*', cors({
  origin: ['http://localhost:5173', 'https://booki.pages.dev'], // Update with your actual domain
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  credentials: true,
}));

const API_CATEGORIES = ["liked it", "it was ok", "didn't like it", "tbr"];

// Initialize database
async function initializeDB(db: D1Database) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      isbn TEXT,
      category TEXT NOT NULL,
      position INTEGER NOT NULL,
      tags TEXT
    )
  `);
}

// Middleware to initialize DB
app.use('*', async (c, next) => {
  await initializeDB(c.env.DB);
  await next();
});

// GET /api/books - Get all books grouped by category
app.get('/books', async (c) => {
  const db = c.env.DB;
  
  const { results } = await db.prepare(
    'SELECT id, title, author, isbn, category, position, tags FROM books'
  ).all();
  
  const groupedResult: Record<string, any[]> = {};
  API_CATEGORIES.forEach(cat => {
    groupedResult[cat] = [];
  });
  
  results.forEach((book: any) => {
    if (book.category in groupedResult) {
      groupedResult[book.category].push(book);
    }
  });
  
  // Sort by position
  API_CATEGORIES.forEach(cat => {
    groupedResult[cat].sort((a, b) => a.position - b.position);
  });
  
  return c.json(groupedResult);
});

// POST /api/books - Add a new book
app.post('/books', async (c) => {
  const db = c.env.DB;
  const book: Book = await c.req.json();
  
  // Shift positions
  await db.prepare(
    'UPDATE books SET position = position + 1 WHERE category = ? AND position >= ?'
  ).bind(book.category, book.position).run();
  
  // Insert book
  const result = await db.prepare(
    'INSERT INTO books (title, author, isbn, category, position, tags) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(
    book.title,
    book.author,
    book.isbn || null,
    book.category,
    book.position,
    book.tags || ''
  ).run();
  
  return c.json({ status: 'ok', id: result.meta.last_row_id });
});

// PUT /api/books/:id - Update book tags
app.put('/books/:id', async (c) => {
  const db = c.env.DB;
  const bookId = parseInt(c.req.param('id'));
  const { tags } = await c.req.json();
  
  const result = await db.prepare(
    'UPDATE books SET tags = ? WHERE id = ?'
  ).bind(tags, bookId).run();
  
  if (result.meta.changes === 0) {
    return c.json({ error: 'Book not found' }, 404);
  }
  
  return c.json({ status: 'ok' });
});

// DELETE /api/books/:id - Delete a book
app.delete('/books/:id', async (c) => {
  const db = c.env.DB;
  const bookId = parseInt(c.req.param('id'));
  
  // Get book info
  const book = await db.prepare(
    'SELECT category, position FROM books WHERE id = ?'
  ).bind(bookId).first();
  
  if (!book) {
    return c.json({ error: 'Book not found' }, 404);
  }
  
  // Delete book
  await db.prepare('DELETE FROM books WHERE id = ?').bind(bookId).run();
  
  // Shift positions down
  await db.prepare(
    'UPDATE books SET position = position - 1 WHERE category = ? AND position > ?'
  ).bind(book.category, book.position).run();
  
  return c.json({ status: 'ok' });
});

// PUT /api/reorder - Reorder books
app.put('/reorder', async (c) => {
  const db = c.env.DB;
  const { reorderedData }: { reorderedData: ReorderItem[] } = await c.req.json();
  
  // Use batch for all updates
  const statements = reorderedData.map(item => 
    db.prepare('UPDATE books SET position = ? WHERE id = ?').bind(item.position, item.id)
  );
  
  await db.batch(statements);
  
  return c.json({ status: 'ok', message: 'Books reordered successfully' });
});

// GET /api/search - Search books using OpenLibrary API
app.get('/search', async (c) => {
  const query = c.req.query('q');
  
  if (!query) {
    return c.json({ error: 'Query parameter required' }, 400);
  }
  
  const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}`);
  const data = await response.json();
  const docs = data.docs?.slice(0, 10) || [];
  
  const results = docs.map((d: any) => ({
    title: d.title,
    author: d.author_name?.join(', ') || 'Unknown',
    isbn: d.isbn?.[0] || null
  }));
  
  return c.json({ results });
});

// Export for Cloudflare Pages Functions
export const onRequest = app.fetch;