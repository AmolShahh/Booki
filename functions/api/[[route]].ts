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

// Create Hono app with base path
const app = new Hono<{ Bindings: Env }>().basePath('/api');

// CORS middleware
app.use('/*', cors({
  origin: ['https://booki-2od.pages.dev', 'https://*.booki-2od.pages.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  credentials: true,
}));

const API_CATEGORIES = ["liked it", "it was ok", "didn't like it", "tbr"];


app.use('*', async (c, next) => {
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

// Export for Cloudflare Pages Functions
export const onRequest: PagesFunction<Env> = async (context) => {
  return app.fetch(context.request, context.env);
};