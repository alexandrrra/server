const db = require('../db')

class BooksController {
    async getBooks(req, res) {
        const books = await db.query('SELECT * FROM books')
        res.json(books[0])
    }
}

module.exports = new BooksController()