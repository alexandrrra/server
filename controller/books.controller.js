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
        try {
            const [books] = await db.query('SELECT * FROM books')
            res.json(books)
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Failed to get books' })
        }
    }
    async getOneBook(req, res) {
        const id = req.params.id;
        try {
            const [book] = await db.query('SELECT * FROM books WHERE book_id = ?', [id])
            res.json(book)
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Failed to get one book' })
        }
    }
}

module.exports = new BooksController()