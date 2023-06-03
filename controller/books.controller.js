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
            const [books] = await db.query('SELECT * FROM books ORDER BY title')
            res.json(books.map(x => x))
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Failed to get books' })
        }
    }

    async getNewBooks(req, res) {
        try {
            const [books] = await db.query('SELECT * FROM books ORDER BY book_id DESC LIMIT 4')
            res.json(books.map(x => x))
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Failed to get books' })
        }
    }

    async getOneBook(req, res) {
        const id = req.params.id;
        try {
            const [books] = await db.query('SELECT * FROM books WHERE book_id = ?', [id])
            if (books.length !== 1) {
                return res.status(500).json({ error: 'Failed to get one book' })
            }
            res.json(books[0])
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Failed to get one book' })
        }
    }
}

module.exports = new BooksController()