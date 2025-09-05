import sqlite3
import argparse
import requests

CATEGORIES = ["liked it", "it was ok", "didn't like it"]

class BookDB:
    def __init__(self, db_path="books.db"):
        self.conn = sqlite3.connect(db_path)
        self.create_tables()

    def create_tables(self):
        self.conn.execute("""
        CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            author TEXT,
            isbn TEXT,
            category TEXT,
            position INTEGER
        )
        """)
        self.conn.commit()


    def add_book(self, title, author, isbn, category, position):
        self.conn.execute(
            "INSERT INTO books (title, author, isbn, category, position) VALUES (?, ?, ?, ?, ?)",
            (title, author, isbn, category, position)
        )
        self.conn.commit()

    def get_books_in_category(self, category):
        cur = self.conn.execute(
            "SELECT id, title, author, isbn, category, position FROM books WHERE category=? ORDER BY position",
            (category,)
        )
        return cur.fetchall()

    def shift_positions(self, category, from_pos):
        self.conn.execute(
            "UPDATE books SET position = position + 1 WHERE category=? AND position >= ?",
            (category, from_pos)
        )
        self.conn.commit()


def insert_with_comparison(db, title, author, isbn, category):
    books = db.get_books_in_category(category)
    left, right = 0, len(books)

    while left < right:
        mid = (left + right) // 2
        _, mid_title, _, _, _, _ = books[mid]

        ans = input(f"Is '{title}' better than '{mid_title}'? (y/n): ").strip().lower()
        if ans == "y":
            right = mid
        else:
            left = mid + 1

    db.shift_positions(category, left)
    db.add_book(title, author, isbn, category, left)


def search_books(query):
    url = f"https://openlibrary.org/search.json?q={query}"
    resp = requests.get(url)
    if resp.status_code != 200:
        print("Search failed.")
        return []
    data = resp.json()
    results = []
    for doc in data.get("docs", [])[:5]:  # show top 5
        title = doc.get("title")
        author = ", ".join(doc.get("author_name", [])) if "author_name" in doc else "Unknown"
        isbn = doc.get("isbn", [""])[0] if "isbn" in doc else None
        results.append((title, author, isbn))
    return results


def list_books(db):
    for cat in CATEGORIES:
        print(f"\n--- {cat.upper()} ---")
        books = db.get_books_in_category(cat)
        for pos, (_, title, author, isbn, _, _) in enumerate(books, start=1):
            print(f"{pos}. {title} by {author} [{isbn}]")



def main():
    parser = argparse.ArgumentParser(description="Local Book Ranking CLI")
    subparsers = parser.add_subparsers(dest="command")

    # search
    search_parser = subparsers.add_parser("search")
    search_parser.add_argument("query", help="Search by title, author, or ISBN")

    # add
    add_parser = subparsers.add_parser("add")
    add_parser.add_argument("query", help="Book title/author/ISBN to search and add")

    # list
    list_parser = subparsers.add_parser("list")

    args = parser.parse_args()
    db = BookDB()

    if args.command == "search":
        results = search_books(args.query)
        for i, (title, author, isbn) in enumerate(results, 1):
            print(f"{i}. {title} by {author} [{isbn}]")

    elif args.command == "add":
        results = search_books(args.query)
        if not results:
            print("No results.")
            return
        for i, (title, author, isbn) in enumerate(results, 1):
            print(f"{i}. {title} by {author} [{isbn}]")
        choice = int(input("Select book #: ")) - 1
        title, author, isbn = results[choice]

        print("Categories: 1) liked it  2) it was ok  3) didn't like it")
        cat_choice = int(input("Choose category: "))
        category = CATEGORIES[cat_choice - 1]

        insert_with_comparison(db, title, author, isbn, category)

    elif args.command == "list":
        list_books(db)

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
