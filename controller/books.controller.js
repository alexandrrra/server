const db = require('../db')
const fs = require('fs')
const path = require('path')
const {pickBy} = require("lodash")

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
    agg(books) {
        const res = []
        for (const book of books) {
            const currentBook = pickBy(book, (value, key) => ["genre_id", "genre_name"].indexOf(key) === -1)
            currentBook.genres = []
            if (book.genre_id) {
                const genre_id = book.genre_id.split(",")
                const genre_name = book.genre_name.split(",")
                for (let i = 0; i < genre_id.length; i++) {
                    currentBook.genres.push({genre_id: genre_id[i], genre_name: genre_name[i]})
                }
            }
            res.push(currentBook)
        }
        return res
    }

    async getBooks(req, res) {
        try {
            const newOnly = req.query.newOnly === "true"
            const filter = req.query.filter || {};

            const conditions = [];
            const values = [];

            if (filter.query !== undefined && filter.query !== "") {
                if (filter.author !== undefined && filter.author !== '') {
                    conditions.push('b.title LIKE ?');
                    values.push(`%${filter.query}%`);
                } else {
                    conditions.push('(b.title LIKE ? OR b.author LIKE ?)');
                    values.push(`%${filter.query}%`);
                    values.push(`%${filter.query}%`);
                }
            }

            if (filter.minPrice !== undefined) {
                conditions.push('b.price >= ?');
                values.push(parseInt(filter.minPrice));
            }

            if (filter.maxPrice !== undefined) {
                conditions.push('b.price <= ?');
                values.push(parseInt(filter.maxPrice));
            }

            if (filter.author !== undefined && filter.author !== '') {
                conditions.push('b.author = ?');
                values.push(filter.author);
            }

            if (filter.genre !== undefined && filter.genre !== '') {
                conditions.push('g.genre_id = ?');
                values.push(filter.genre);
            }

            if (filter.publishment !== undefined && filter.publishment !== '') {
                conditions.push('p.publishment_id = ?');
                values.push(filter.publishment);
            }

            if (!conditions.length) {
                conditions.push("TRUE IS ?")
                values.push(true)
            }

            const sql = `SELECT b.*, GROUP_CONCAT(g.genre_id) AS genre_id, GROUP_CONCAT(g.genre_name) AS genre_name, p.* FROM books AS b
                LEFT JOIN books_genres AS bg ON bg.book_id = b.book_id
                LEFT JOIN genres AS g ON g.genre_id = bg.genre_id
                LEFT JOIN books_publishments AS bp ON bp.book_id = b.book_id
                LEFT JOIN publishments AS p ON p.publishment_id = bp.publishment_id
                WHERE ${conditions.join(" AND ")} GROUP BY b.book_id ORDER BY ` + (newOnly ? "book_id DESC LIMIT 30" : "title")
            let [books] = await db.query(sql, values)
            books = booksController.agg(books)
            res.json(books)
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Unexpected error' })
        }
    }

    async getRatingAndFeedbacks(book_id, user_id) {
        let userFeedbacks = []
        if (user_id) {
            [userFeedbacks] = await db.query(
                `SELECT f.*, u.login FROM feedbacks AS f
                    LEFT JOIN users AS u ON f.user_id = u.user_id
                    WHERE f.book_id = ? AND f.user_id = ?`,
                [book_id, user_id]
            )
        }
        const [feedbacks] = await db.query(
            `SELECT f.*, u.login FROM feedbacks AS f
                LEFT JOIN users AS u ON f.user_id = u.user_id
                WHERE f.book_id = ?${user_id ? ' AND f.user_id <> ?' : ''} ORDER BY feedback_id DESC`,
            user_id ? [book_id, user_id] : [book_id]
        )
        let rating = 0
        let count = 0;
        if (userFeedbacks.length > 0 && userFeedbacks[0].rating) {
            rating = userFeedbacks[0].rating
            count++;
        }
        if (feedbacks.length > 0) {
            for (const f of feedbacks) {
                if (f.rating) {
                    rating += f.rating
                    count++;
                }
            }
        }
        if (count) {
            rating /= count
        }
        return [
            rating,
            userFeedbacks.length === 1 ? userFeedbacks[0] : {},
            feedbacks.map(x => x)
        ]
    }

    async getOneBook(req, res) {
        try {
            let [books] = await db.query(
                `SELECT b.*, GROUP_CONCAT(g.genre_id) AS genre_id, GROUP_CONCAT(g.genre_name) AS genre_name, p.* FROM books AS b
                    LEFT JOIN books_genres AS bg ON bg.book_id = b.book_id
                    LEFT JOIN genres AS g ON g.genre_id = bg.genre_id
                    LEFT JOIN books_publishments AS bp ON bp.book_id = b.book_id
                    LEFT JOIN publishments AS p ON p.publishment_id = bp.publishment_id
                    WHERE b.book_id = ? GROUP BY b.book_id`,
                [req.params.id]
            )
            if (books.length === 0) {
                return res.status(404).json({ error: 'Failed to get one book' })
            }
            books = booksController.agg(books)
            const [rating, user_feedback, feedbacks] = await booksController.getRatingAndFeedbacks(req.params.id, req.cookies.user_id)
            res.json({...books[0], rating, user_feedback, feedbacks})
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Unexpected error' })
        }
    }

    async createFeedback(req, res) {
        try {
            const [users] = await db.query(
                `SELECT * FROM users
                    WHERE user_id = ? AND token = ?`,
                [req.cookies.user_id, req.cookies.token]
            )
            if (users.length !== 1) {
                return res.status(403).json({ error: 'Bad user_id or token' })
            }
            const [userFeedbacks] = await db.query(
                `INSERT INTO feedbacks
                    (rating, body, book_id, user_id)
                    VALUES (?, ?, ?, ?)`,
                [req.body.rating, req.body.body, req.params.id, req.cookies.user_id]
            )
            if (userFeedbacks.affectedRows !== 1) {
                return res.status(404).json({ error: 'Can not insert new feedback' })
            }
            const [rating, user_feedback, feedbacks] = await booksController.getRatingAndFeedbacks(req.params.id, req.cookies.user_id)
            res.json({rating, user_feedback, feedbacks})
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Unexpected error' })
        }
    }

    async updateFeedback(req, res) {
        try {
            const [users] = await db.query(
                `SELECT * FROM users
                    WHERE user_id = ? AND token = ?`,
                [req.cookies.user_id, req.cookies.token]
            )
            if (users.length !== 1) {
                return res.status(403).json({ error: 'Bad user_id or token' })
            }
            const [userFeedbacks] = await db.query(
                `UPDATE feedbacks SET rating = ?, body = ? WHERE book_id = ? AND user_id = ?`,
                [req.body.rating, req.body.body, req.params.id, req.cookies.user_id]
            )
            if (userFeedbacks.affectedRows !== 1) {
                return res.status(404).json({ error: 'Can not update feedback' })
            }
            const [rating, user_feedback, feedbacks] = await booksController.getRatingAndFeedbacks(req.params.id, req.cookies.user_id)
            res.json({rating, user_feedback, feedbacks})
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Unexpected error' })
        }
    }

    async deleteFeedback(req, res) {
        try {
            const [users] = await db.query(
                `SELECT * FROM users
                    WHERE user_id = ? AND token = ?`,
                [req.cookies.user_id, req.cookies.token]
            )
            if (users.length !== 1) {
                return res.status(403).json({ error: 'Bad user_id or token' })
            }
            await db.query(
                `DELETE FROM feedbacks WHERE book_id = ? AND user_id = ?`,
                [req.params.id, req.cookies.user_id]
            )
            const [rating, user_feedback, feedbacks] = await booksController.getRatingAndFeedbacks(req.params.id, req.cookies.user_id)
            res.json({rating, user_feedback, feedbacks})
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Unexpected error' })
        }
    }

    async getPriceRange(req, res) {
        try {
            const [priceRange] = await db.query(
                'SELECT MIN(price) AS min_price, MAX(price) AS max_price FROM books'
            )
            res.json([priceRange[0].min_price, priceRange[0].max_price])
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Unexpected error' })
        }
    }

    async getAuthors(req, res) {
        try {
            const [items] = await db.query(
                'SELECT DISTINCT(author) FROM books WHERE author LIKE ? ORDER BY author LIMIT 10',
                `%${req.query.name}%`
            )
            res.json(items.map(x => x.author))
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Unexpected error' })
        }
    }

    async getGenres(req, res) {
        try {
            const [items] = await db.query(
                'SELECT * FROM genres WHERE genre_name LIKE ? ORDER BY genre_name LIMIT 10',
                `%${req.query.name}%`
            )
            res.json(items.map(x => x))
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Unexpected error' })
        }
    }

    async getPublishments(req, res) {
        try {
            const [items] = await db.query(
                'SELECT * FROM publishments WHERE publishment_name LIKE ? ORDER BY publishment_name LIMIT 10',
                `%${req.query.name}%`
            )
            res.json(items.map(x => x))
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Unexpected error' })
        }
    }

    async getBestsellers(req, res) {
        try {
            const sql = `SELECT b.*, GROUP_CONCAT(g.genre_id) AS genre_id, GROUP_CONCAT(g.genre_name) AS genre_name, p.* FROM books AS b
                LEFT JOIN books_genres AS bg ON bg.book_id = b.book_id
                LEFT JOIN genres AS g ON g.genre_id = bg.genre_id
                LEFT JOIN books_publishments AS bp ON bp.book_id = b.book_id
                LEFT JOIN publishments AS p ON p.publishment_id = bp.publishment_id
                GROUP BY b.book_id
                ORDER BY sales DESC LIMIT 30`
            let [books] = await db.query(sql)
            books = booksController.agg(books)
            res.json(books)
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Unexpected error' })
        }
    }

    async updateOpt(opt, book_id, value) {
        const name = (value && value[`${opt}_name`]) || value
        if (!value) {
            return
        }
        let id
        const [items] = await db.query(
            `SELECT * FROM ${opt}s WHERE ${opt}_name = ?`,
            [name]
        )
        if (items.length === 0) {
            const [newItems] = await db.query(
                `INSERT INTO ${opt}s (${opt}_name) VALUES (?)`,
                [name]
            )
            id = newItems.insertId
        } else {
            id = items[0][`${opt}_id`]
        }

        await db.query(
            `INSERT INTO books_${opt}s (${opt}_id, book_id) VALUES (?, ?)`,
            [id, book_id]
        )
    }

    async createBook(req, res) {
        try {
            const [users] = await db.query(
                `SELECT * FROM users
                    WHERE user_id = ? AND token = ?`,
                [req.cookies.user_id, req.cookies.token]
            )
            if (users.length !== 1 || users[0].role !== "admin") {
                return res.status(403).json({ error: 'Bad user_id or token' })
            }

            const [books] = await db.query(
                `INSERT INTO books (title, author, price) VALUES (?, ?, ?)`,
                [req.body.title, req.body.author, req.body.price]
            )

            await db.query(
                `DELETE FROM books_genres WHERE book_id = ?`,
                [books.insertId]
            )
            for (const genre of req.body.genres) {
                await booksController.updateOpt('genre', books.insertId, genre)
            }
            await db.query(
                `DELETE FROM books_publishments WHERE book_id = ?`,
                [books.insertId]
            )
            await booksController.updateOpt('publishment', books.insertId, req.body.publishment)

            res.status(200).json({ book_id: books.insertId })
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Failed to create book' })
        }
    }

    async updateBook(req, res) {
        try {
            const [users] = await db.query(
                `SELECT * FROM users
                    WHERE user_id = ? AND token = ?`,
                [req.cookies.user_id, req.cookies.token]
            )
            if (users.length !== 1 || users[0].role !== "admin") {
                return res.status(403).json({ error: 'Bad user_id or token' })
            }

            const bookId = parseInt(req.params.id)

            const [books] = await db.query(
                `UPDATE books SET title = ?, author = ?, price = ? WHERE book_id = ?`,
                [req.body.title, req.body.author, req.body.price, bookId]
            )
            if (books.affectedRows !== 1) {
                return res.status(404).json({ error: 'Can not update book' })
            }

            await db.query(
                `DELETE FROM books_genres WHERE book_id = ?`,
                [bookId]
            )
            for (const genre of req.body.genres) {
                await booksController.updateOpt('genre', bookId, genre)
            }
            await db.query(
                `DELETE FROM books_publishments WHERE book_id = ?`,
                [bookId]
            )
            await booksController.updateOpt('publishment', bookId, req.body.publishment)

            res.status(200).json({ message: 'Book updated successfully' })
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Failed to update book' })
        }
    }
}

const booksController = new BooksController()

module.exports = booksController