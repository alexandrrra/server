const db = require('../db')
const {v4: uuid4} = require("uuid")
const crypto = require("crypto")
const utilsController = require ('./utils.controller')
const {pickBy} = require("lodash")

const md5 = data => crypto.createHash("md5").update(data).digest("hex")

const SALT = "a31bda48-bf07-417a-af1c-18056351cb95"

const profileFields = new Set(["role", "first_name", "last_name", "middle_name", "login", "phone", "email"])
const extractProfile = user => pickBy(user, (value, key) => profileFields.has(key))

class UserController  {
    async createUser(req, res) {
        try {
            const {first_name, last_name, middle_name, login, phone, email, password} = req.body
            if (!login || !password) {
                return res.status(400).json({ error: 'Bad params' })
            }
            const token = uuid4()
            let [users] = await db.query(
                `INSERT INTO users
                    (role, first_name, last_name, middle_name, login, phone, email, password_hash, one_time_password_hash, token)
                    VALUES ('user', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [first_name || '', last_name || '', middle_name || '', login, phone, email, md5(password + SALT), '', token]
            )
            if (users.affectedRows !== 1) {
                return res.status(404).json({ error: 'Can not insert new user' })
            }
            [users] = await db.query(
                `SELECT * FROM users WHERE user_id = ?`,
                [users.insertId]
            )
            if (users.length !== 1) {
                return res.status(404).json({ error: 'Can not get new user info' })
            }
            res.json({user_id: users[0].user_id, token, profile: extractProfile(users[0])})
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Unexpected error' })
        }
    }

    async setToken(req, res) {
        try {
            const {login, password} = req.body
            const passwordHash = md5(password + SALT)
            const [users] = await db.query(
                `SELECT * FROM users WHERE login = ?`,
                [login]
            )
            if (users.length !== 1 || (users[0].password_hash !== passwordHash && users[0].one_time_password_hash !== passwordHash)) {
                return res.status(403).json({ error: 'Bad login or password' })
            }
            const token = uuid4()
            await db.query(
                `UPDATE users SET token = ?, one_time_password_hash = ''
                    WHERE user_id = ?`,
                [token, users[0].user_id]
            )
            const [products] = await db.query(
                `SELECT SUM(quantity) AS products_count FROM products WHERE user_id = ?`,
                [req.cookies.user_id]
            )
            res.json({user_id: users[0].user_id, token, profile: extractProfile(users[0]), products_count: products[0].products_count || 0})
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Unexpected error' })
        }
    }

    async refreshToken(req, res) {
        try {
            if (req.cookies.user_id === undefined || req.cookies.token === undefined) {
                return res.json({ success: false, error: 'bad user_id or token' })
            }
            const token = uuid4()
            let [users] = await db.query(
                `UPDATE users SET token = ?
                    WHERE user_id = ? AND token = ?`,
                [token, req.cookies.user_id, req.cookies.token]
            )
            if (users.changedRows !== 1) {
                return res.json({ success: false, error: 'bad user_id or token' })
            }
            [users] = await db.query(
                `SELECT * FROM users WHERE user_id = ?`,
                [req.cookies.user_id]
            )
            if (users.length !== 1) {
                return res.status(404).json({ error: 'Can not get profile' })
            }
            const [products] = await db.query(
                `SELECT SUM(quantity) AS products_count FROM products WHERE user_id = ?`,
                [req.cookies.user_id]
            )
            res.json({success: true, token, profile: extractProfile(users[0]), products_count: products[0].products_count || 0})
        } catch (error) {
            console.error(error)
            res.json({ success: false, error: 'failed to refresh token' })
        }
    }

    async deleteToken(req, res) {
        try {
            const [users] = await db.query(
                `UPDATE users SET token = ?
                    WHERE user_id = ? AND token = ?`,
                ["", req.cookies.user_id, req.cookies.token]
            )
            if (users.affectedRows !== 1) {
                return res.status(403).json({ error: 'Bad user_id or token' })
            }
            res.status(200).json({message: 'Token deleted successfully'})
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Unexpected error' })
        }
    }

    async getProfile(req, res) {
        try {
            const [users] = await db.query(
                `SELECT * FROM users
                    WHERE user_id = ? AND token = ?`,
                [req.cookies.user_id, req.cookies.token]
            )
            if (users.length !== 1) {
                return res.status(403).json({ error: 'Bad user_id or token' })
            }
            res.json(extractProfile(users[0]))
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Unexpected error' })
        }
    }

    async updateProfile(req, res) {
        const updates = []
        const values = []

        for (const field of profileFields) {
            const value = req.body[field]
            if (value !== undefined) {
                updates.push(`${field} = ?`)
                values.push(value)
            }
        }

        if (req.body.password) {
            updates.push(`password_hash = ?`)
            values.push(md5(req.body.password + SALT))
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' })
        }

        values.push(req.cookies.user_id)
        values.push(req.cookies.token)
        const query = `UPDATE users SET ${updates.join(', ')}
            WHERE user_id = ? AND token = ?`

        try {
            let [users] = await db.query(query, values)
            if (users.affectedRows !== 1) {
                return res.status(500).json({ error: 'Failed to update profile' })
            }
            [users] = await db.query(
                `SELECT * FROM users WHERE user_id = ?`,
                [req.cookies.user_id]
            )
            if (users.length !== 1) {
                return res.status(500).json({ error: 'Can not get updated profile' })
            }
            res.json(extractProfile(users[0]))
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Unexpected error' })
        }
    }

    async sendOneTimePassword(req, res) {
        try {
            const { email } = req.body
            const oneTimePassword = uuid4()
            const [users] = await db.query(
                `UPDATE users SET one_time_password_hash = ?
                    WHERE email = ?`,
                [md5(oneTimePassword + SALT), email]
            )
            if (users.changedRows !== 1) {
                return res.status(500).json({ error: 'Unexpected error' })
            }

            await utilsController.sendMail({
                from: 'booklib@game1vs100.ru',
                to: email,
                subject: 'Booklib one-time password',
                text: `Your one-time password is ${oneTimePassword}`
            })

            res.status(200).json({message: 'One-time password send successfully'})
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Unexpected error' })
        }
    }

    async getFavorites(req, res) {
        try {
            const [favorites] = await db.query(
                `SELECT * FROM favorites AS f
                    JOIN books AS b ON b.book_id = f.book_id
                    WHERE user_id = ? ORDER BY b.title`,
                [req.cookies.user_id, req.cookies.token]
            )
            res.json(favorites.map(x => x))
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Unexpected error' })
        }
    }

    async addFavorite(req, res) {
        try {
            const [users] = await db.query(
                `SELECT * FROM users
                    WHERE user_id = ? AND token = ?`,
                [req.cookies.user_id, req.cookies.token]
            )
            if (users.length !== 1) {
                return res.status(403).json({ error: 'Bad user_id or token' })
            }
            const [favorites] = await db.query(
                `SELECT * FROM favorites WHERE book_id = ? AND user_id = ?`,
                [req.body.id, req.cookies.user_id]
            )
            if (favorites.length === 0) {
                await db.query(
                    `INSERT INTO favorites
                        (book_id, user_id)
                        VALUES (?, ?)`,
                    [req.body.id, req.cookies.user_id]
                )
            }
            res.status(200).json({ message: 'added' })
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Unexpected error' })
        }
    }

    async deleteFavorite(req, res) {
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
                `DELETE FROM favorites WHERE book_id = ? AND user_id = ?`,
                [req.params.id, req.cookies.user_id]
            )
            res.status(200).json({ message: 'deleted' });
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Unexpected error' })
        }
    }

    async getProducts(req, res) {
        try {
            const [products] = await db.query(
                `SELECT * FROM products AS f
                    JOIN books AS b ON b.book_id = f.book_id
                    WHERE user_id = ? ORDER BY b.title`,
                [req.cookies.user_id, req.cookies.token]
            )
            res.json(products.map(x => x))
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Unexpected error' })
        }
    }

    async addProduct(req, res) {
        try {
            const [users] = await db.query(
                `SELECT * FROM users
                    WHERE user_id = ? AND token = ?`,
                [req.cookies.user_id, req.cookies.token]
            )
            if (users.length !== 1) {
                return res.status(403).json({ error: 'Bad user_id or token' })
            }
            let [products] = await db.query(
                `SELECT * FROM products WHERE book_id = ? AND user_id = ?`,
                [req.body.id, req.cookies.user_id]
            )
            if (products.length === 0) {
                await db.query(
                    `INSERT INTO products
                        (book_id, user_id, quantity)
                        VALUES (?, ?, 1)`,
                    [req.body.id, req.cookies.user_id]
                )
            } else {
                await db.query(
                    `UPDATE products SET quantity = quantity + 1 WHERE book_id = ? AND user_id = ?`,
                    [req.body.id, req.cookies.user_id]
                )
            }
            [products] = await db.query(
                `SELECT SUM(quantity) AS products_count FROM products WHERE user_id = ?`,
                [req.cookies.user_id]
            )
            res.status(200).json({ products_count: products[0].products_count || 0 })
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Unexpected error' })
        }
    }

    async updateProduct(req, res) {
        try {
            const [users] = await db.query(
                `SELECT * FROM users
                    WHERE user_id = ? AND token = ?`,
                [req.cookies.user_id, req.cookies.token]
            )
            if (users.length !== 1) {
                return res.status(403).json({ error: 'Bad user_id or token' })
            }
            const [products] = await db.query(
                `UPDATE products SET quantity = ? WHERE book_id = ? AND user_id = ?`,
                [req.body.quantity, req.params.id, req.cookies.user_id]
            )
            if (products.affectedRows !== 1) {
                return res.status(500).json({ error: 'Unexpected error' })
            }
            [products] = await db.query(
                `SELECT SUM(quantity) AS products_count FROM products WHERE user_id = ?`,
                [req.cookies.user_id]
            )
            res.status(200).json({ products_count: products[0].products_count || 0 })
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Unexpected error' })
        }
    }

    async deleteProduct(req, res) {
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
                `DELETE FROM products WHERE book_id = ? AND user_id = ?`,
                [req.params.id, req.cookies.user_id]
            )
            const [products] = await db.query(
                `SELECT SUM(quantity) AS products_count FROM products WHERE user_id = ?`,
                [req.cookies.user_id]
            )
            res.status(200).json({ products_count: products[0].products_count || 0 })
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Unexpected error' })
        }
    }
}

module.exports = new UserController()