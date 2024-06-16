import express from "express";
import pg from "pg";

const app = express();
const port = 3000;
const db = new pg.Client({
    host: "localhost",
    database: "exnotes",
    user: "postgres",
    password: "ashrafhacker",
    port: 5432
});
db.connect();

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Functions
let books = []; // Array to store the books in the DB
async function getBooks() {
    const result = await db.query("SELECT * FROM books");
    books = result.rows;
}


// Routes
app.get("/", async (req, res) => {
    await getBooks(); // Fetch all the books and put it into books variable
    res.render("index.ejs" , {books: books});
});

app.get("/book/:id", async (req, res) => {
    await getBooks();
    const id = parseInt(req.params.id);
    const targetBook = books.filter((book) => book.id === id);
    if (targetBook) {
        try {
            // Get notes for the book
            let notes = [];
            const bookID = targetBook[0].id;
            const notesResult = await db.query("SELECT * FROM notes WHERE book_id = $1", [bookID]);
            notes = notesResult.rows;
            res.render("book.ejs", {book: targetBook, notes: notes});
        } catch (error) {
            console.log(error);
            res.render("book.ejs", {error: 404});
        }
        
    } else {
        res.render("book.ejs", {error: 404});
    }
});

app.post("/add", async (req, res) => {
    const coverID = req.body.cover_id;
    const authorName = req.body.author;
    const title = req.body.title;
    
    // Use the cover ID to get the book cover image from openlibrary
    const bookCover = `https://covers.openlibrary.org/b/id/${coverID}-M.jpg`;

    // Add book to DB
    try {
        const result = await db.query("INSERT INTO books(id, author_name, picture, title) VALUES($1, $2, $3, $4) RETURNING *",
        [coverID, authorName, bookCover, title]);
        
        books.push(result.rows[0]);
        res.redirect("/");
    } catch (error) {
        console.log("Error while inserting the new book");
        res.render("index.ejs", {error: "Error while inserting the new book"});
    }
    
});

app.post("/addnote", async (req, res) => {
    const bookID = parseInt(req.body.book_id);
    const title = req.body.title;
    const note = req.body.note;

    try {
        const query = "INSERT INTO notes(book_id, note_title, note_text) VALUES($1, $2, $3)";
        const values = [bookID, title, note];
        await db.query(query, values);
        res.redirect(`/book/${bookID}`);
    } catch (error) {
        console.log("Error while inserting the note");
        res.redirect(`/book/${bookID}`);
    }
});

app.post("/books/rate", async (req, res) => {
    const bookID = parseInt(req.body.bookID);
    const rating = parseInt(req.body.rating);
    try {
        const query = "UPDATE books SET rating = $1 WHERE id = $2";
        const values = [rating, bookID];
        await db.query(query, values);
        res.send("success");
    } catch (error) {
        console.log(error);
        res.send("error");
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});