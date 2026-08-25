import { Hono } from 'hono';
import { cors } from 'hono/cors';

// Types
type Env = {
  DB: D1Database;
  API_SECRET: string;
  GOOGLE_BOOKS_API_KEY: string;
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

const app = new Hono<{ Bindings: Env }>().basePath('/api');

// CORS — also allow the x-api-key header
app.use('/*', cors({
  origin: (origin) => {
    // Same-origin/tool requests have no Origin header — Hono passes '' (or undefined).
    // Returning '' lets the request through without an ACAO header, which is correct
    // for same-origin. Calling .endsWith on undefined here would throw and 500 the request.
    if (!origin) return '';
    if (
      origin === 'https://booki-2od.pages.dev' ||
      origin.endsWith('.booki-2od.pages.dev') ||
      origin.startsWith('http://localhost:')
    ) {
      return origin;
    }
    return '';
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'x-api-key'],
  credentials: true,
}));

const API_CATEGORIES = ["liked it", "it was ok", "didn't like it", "tbr"];

// Auth middleware — only protects mutating methods, GET stays open
app.use('*', async (c, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(c.req.method)) {
    const key = c.req.header('x-api-key');
    
    if (!c.env.API_SECRET) {
      console.error("CRITICAL: API_SECRET variable is completely missing or unbound in Cloudflare Settings.");
      return c.json({ error: 'Server configuration error' }, 500);
    }

    // Use .trim() to bypass hidden Cloudflare dashboard formatting issues
    const clientKey = key ? key.trim() : '';
    const serverSecret = c.env.API_SECRET.trim();

    if (!clientKey || clientKey !== serverSecret) {
      console.error(`AUTH FAILED: Received length ${clientKey.length}, expected length ${serverSecret.length}`);
      return c.json({ error: 'Unauthorized' }, 401);
    }
  }
  return await next();
});

// GET /api/books
app.get('/books', async (c) => {
  const db = c.env.DB;
  const { results } = await db.prepare(
    'SELECT id, title, author, isbn, category, position, tags FROM books'
  ).all();

  const groupedResult: Record<string, any[]> = {};
  API_CATEGORIES.forEach(cat => { groupedResult[cat] = []; });
  results.forEach((book: any) => {
    if (book.category in groupedResult) groupedResult[book.category].push(book);
  });
  API_CATEGORIES.forEach(cat => {
    groupedResult[cat].sort((a, b) => a.position - b.position);
  });

  return c.json(groupedResult);
});

// POST /api/books
app.post('/books', async (c) => {
  const db = c.env.DB;
  const book: Book = await c.req.json();
  console.log("adding new book with data: ", book);
  await db.prepare(
    'UPDATE books SET position = position + 1 WHERE category = ? AND position >= ?'
  ).bind(book.category, book.position).run();
  const result = await db.prepare(
    'INSERT INTO books (title, author, isbn, category, position, tags) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(book.title, book.author, book.isbn || null, book.category, book.position, book.tags || '').run();
  return c.json({ status: 'ok', id: result.meta.last_row_id });
});

// PUT /api/books/:id
app.put('/books/:id', async (c) => {
  const db = c.env.DB;
  const bookId = parseInt(c.req.param('id'));
  const { tags } = await c.req.json();
  const result = await db.prepare(
    'UPDATE books SET tags = ? WHERE id = ?'
  ).bind(tags, bookId).run();
  if (result.meta.changes === 0) return c.json({ error: 'Book not found' }, 404);
  return c.json({ status: 'ok' });
});

// DELETE /api/books/:id
app.delete('/books/:id', async (c) => {
  const db = c.env.DB;
  const bookId = parseInt(c.req.param('id'));
  const book = await db.prepare(
    'SELECT category, position FROM books WHERE id = ?'
  ).bind(bookId).first();
  if (!book) return c.json({ error: 'Book not found' }, 404);
  await db.prepare('DELETE FROM books WHERE id = ?').bind(bookId).run();
  await db.prepare(
    'UPDATE books SET position = position - 1 WHERE category = ? AND position > ?'
  ).bind(book.category, book.position).run();
  return c.json({ status: 'ok' });
});

// PUT /api/reorder
app.put('/reorder', async (c) => {
  const db = c.env.DB;
  const { reorderedData }: { reorderedData: ReorderItem[] } = await c.req.json();
  const statements = reorderedData.map(item =>
    db.prepare('UPDATE books SET position = ? WHERE id = ?').bind(item.position, item.id)
  );
  await db.batch(statements);
  return c.json({ status: 'ok', message: 'Books reordered successfully' });
});

// GET /api/search
app.get('/search', async (c) => {
  try {
    const query = c.req.query('q');
    if (!query) return c.json({ error: 'Query parameter required' }, 400);

    // Google Books v1 works without an API key (subject to per-IP rate limits).
    // If a key is configured we send it for higher quotas, but its absence is not fatal.
    const apiKey = c.env.GOOGLE_BOOKS_API_KEY?.trim();
    const params = new URLSearchParams({ q: query, maxResults: '20', printType: 'books' });
    if (apiKey) params.set('key', apiKey);
    const url = `https://www.googleapis.com/books/v1/volumes?${params.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Books API ${response.status}: ${errorText}`);
      return c.json({ error: 'Search failed', status: response.status }, 502);
    }

    const data = await response.json() as { items?: any[] };
    const seen = new Set<string>();
    const results: { title: string; author: string; isbn: string | null }[] = [];
    for (const item of data.items || []) {
      const v = item.volumeInfo || {};
      const title = v.title;
      const author = v.authors?.join(', ');
      // Skip items with no title or author — Google occasionally returns bare records.
      if (!title || !author) continue;
      const key = `${title.toLowerCase()}|${author.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const isbn = v.industryIdentifiers?.find(
        (id: any) => id.type === 'ISBN_13' || id.type === 'ISBN_10'
      )?.identifier || null;
      results.push({ title, author, isbn });
      if (results.length >= 10) break;
    }

    return c.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return c.json({ error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

export const onRequest: PagesFunction<Env> = async (context) => {
  return app.fetch(context.request, context.env);
};