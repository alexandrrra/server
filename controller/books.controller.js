const db = require('../db')
const fs = require('fs')
const path = require('path')

function deleteFile(filePath) {
    fs.unlink(path.join(__dirname, filePath), (err) => {
        if (err) {
            console.error('Error deleting file:', err)
        } else {
            console.log('File deleted:', filePath)
        }
    })
}


class BooksController {
    async getBooks(req, res) {
        const books = await db.query('SELECT * FROM books')
        res.json(books[0])
    }
    async getOneBook(req, res) {
        const id = req.params.id;
        const book = await db.query('SELECT * FROM books WHERE book_id = ?', [id])
        res.json(book[0])
    }
}

module.exports = new BooksController()