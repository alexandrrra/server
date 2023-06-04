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

    async getFilterOptions(req, res) {
        try {
            const [priceRange] = await db.query(
                'SELECT MIN(price) AS min_price, MAX(price) AS max_price FROM books'
            )
            const [authors] = await db.query(
                'SELECT DISTINCT(author) FROM books ORDER BY author'
            )
            const [genres] = await db.query(
                'SELECT * FROM genres ORDER BY genre_name'
            )
            const [publishments] = await db.query(
                'SELECT * FROM publishments ORDER BY publishment_name'
            )
            res.json({
                price: {
                    min: priceRange[0].min_price,
                    max: priceRange[0].max_price
                },
                authors: authors.map(x => x),
                genres: genres.map(x => x),
                publishments: publishments.map(x => x)
            })
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Unexpected error' })
        }
    }
}

module.exports = new BooksController()