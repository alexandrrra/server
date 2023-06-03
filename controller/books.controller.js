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
            const newOnly = req.query.newOnly === "true"
            const [books] = await db.query(
                newOnly
                    ? 'SELECT * FROM books ORDER BY book_id DESC LIMIT 4'
                    : 'SELECT * FROM books ORDER BY title'
            )
            res.json(books.map(x => x))
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Unexpected error' })
        }
    }

    async getOneBook(req, res) {
        try {
            const [books] = await db.query('SELECT * FROM books WHERE book_id = ?', [req.params.id])
            if (books.length !== 1) {
                return res.status(404).json({ error: 'Failed to get one book' })
            }
            res.json(books[0])
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Unexpected error' })
        }
    }
}

module.exports = new BooksController()