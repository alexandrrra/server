const db = require('../db')
const fs = require('fs')
const path = require('path')
const utilsController = require ('./utils.controller')

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

            if (filter.genre !== undefined) {
                conditions.push('g.genre_id = ?');
                values.push(filter.genre);
            }

            if (filter.publishment !== undefined) {
                conditions.push('p.publishment_id = ?');
                values.push(filter.publishment);
            }

            if (!conditions.length) {
                conditions.push("TRUE IS ?")
                values.push(true)
            }

            const sql = `SELECT b.*, g.*, p.* FROM books AS b
                LEFT JOIN books_genres AS bg ON bg.book_id = b.book_id
                LEFT JOIN genres AS g ON g.genre_id = bg.genre_id
                LEFT JOIN books_publishments AS bp ON bp.book_id = b.book_id
                LEFT JOIN publishments AS p ON p.publishment_id = bp.publishment_id
                WHERE ${conditions.join(" AND ")} ORDER BY ` + (newOnly ? "book_id DESC LIMIT 4" : "title")

            const [books] = await db.query(sql, values)
            res.json(books.map(x => x))
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Unexpected error' })
        }
    }

    async getOneBook(req, res) {
        try {
            const [books] = await db.query(
                `SELECT b.*, g.*, p.* FROM books AS b
                    LEFT JOIN books_genres AS bg ON bg.book_id = b.book_id
                    LEFT JOIN genres AS g ON g.genre_id = bg.genre_id
                    LEFT JOIN books_publishments AS bp ON bp.book_id = b.book_id
                    LEFT JOIN publishments AS p ON p.publishment_id = bp.publishment_id
                    WHERE b.book_id = ?`,
                [req.params.id]
            )
            if (books.length !== 1) {
                return res.status(404).json({ error: 'Failed to get one book' })
            }
            const [rating, user_feedback, feedbacks] = await utilsController.getRatingAndFeedbacks(req.params.id, req.cookies.user_id)
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
            const [rating, user_feedback, feedbacks] = await utilsController.getRatingAndFeedbacks(req.params.id, req.cookies.user_id)
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
            const [rating, user_feedback, feedbacks] = await utilsController.getRatingAndFeedbacks(req.params.id, req.cookies.user_id)
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
            const [rating, user_feedback, feedbacks] = await utilsController.getRatingAndFeedbacks(req.params.id, req.cookies.user_id)
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
}

module.exports = new BooksController()