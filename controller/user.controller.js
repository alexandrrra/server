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
            if (!login || !phone || !email || !password) {
                return res.status(400).json({ error: 'Bad params' })
            }
            const token = uuid4()
            const users = await db.query(
                `INSERT INTO users
                    (role, first_name, last_name, middle_name, login, phone, email, password_hash, token)
                    VALUES ('user', ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
                [first_name, last_name, middle_name, login, phone, email, md5(password + SALT), token]
            )
            if (users.rowCount === 0) {
                return res.status(404).json({ error: 'Unexpected error' })
            }
            res.json({user_id: users.rows[0].user_id, token, profile: extractProfile(users.rows[0])})
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Failed to create user' })
        }
    }

    async setToken(req, res) {
        try {
            const {login, password} = req.body
            const passwordHash = md5(password + SALT)
            const users = await db.query(
                `SELECT * FROM users WHERE login = ?`,
                [login]
            )
            if (users.rowCount !== 1) {
                return res.status(403).json({ error: 'Bad login or password' })
            }
            if (users.rows[0].password_hash !== passwordHash && users.rows[0].one_time_password_hash !== passwordHash) {
                return res.status(403).json({ error: 'Bad login or password' })
            }
            const token = uuid4()
            await db.query(
                `UPDATE users SET token = ?, one_time_password_hash = ''
                    WHERE user_id = ?`,
                [token, users.rows[0].user_id]
            )
            res.json({user_id: users.rows[0].user_id, token, profile: extractProfile(users.rows[0])})
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Failed to set token' })
        }
    }

    async refreshToken(req, res) {
        try {
            if (req.cookies.user_id === undefined || req.cookies.token === undefined) {
                return res.json({ success: false, error: 'bad user_id or token' })
            }
            const token = uuid4()
            const users = await db.query(
                `UPDATE users SET token = ?
                    WHERE user_id = ? AND token = ? RETURNING *`,
                [token, req.cookies.user_id, req.cookies.token]
            )
            if (users.rowCount !== 1) {
                return res.json({ success: false, error: 'bad user_id or token' })
            }
            res.json({success: true, token, profile: extractProfile(users.rows[0])})
        } catch (error) {
            console.error(error)
            res.json({ success: false, error: 'failed to refresh token' })
        }
    }

    async deleteToken(req, res) {
        try {
            const updatedUsers = await db.query(
                `UPDATE users SET token = ?
                    WHERE user_id = ? AND token = ?`,
                ["", req.cookies.user_id, req.cookies.token]
            )
            if (updatedUsers.rowCount !== 1) {
                return res.status(403).json({ error: 'Bad user_id or token' })
            }
            res.status(200).json({message: 'Token deleted successfully'})
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Failed to delete token' })
        }
    }

    async getProfile(req, res) {
        try {
            const users = await db.query(
                `SELECT * FROM users
                    WHERE user_id = ? AND token = ?`,
                [req.cookies.user_id, req.cookies.token]
            )
            if (users.rowCount !== 1) {
                return res.status(403).json({ error: 'Bad user_id or token' })
            }
            res.json(extractProfile(users.rows[0]))
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Failed to get profile' })
        }
    }

    async updateProfile(req, res) {
        const updates = []
        const values = []

        for (const field of profileFields) {
            const value = req.body[field]
            if (value !== undefined) {
                updates.push(`?`)
                values.push(value)
            }
        }

        if (password) {
            updates.push(`password_hash = ?`)
            values.push(md5(password + SALT))
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' })
        }

        values.push(req.cookies.user_id)
        values.push(req.cookies.token)
        const query = `UPDATE users SET ${updates.join(', ')}
            WHERE user_id = ? AND token = ?
            RETURNING *`

        try {
            const users = await db.query(query, values)
            if (users.rowCount !== 1) {
                return res.status(500).json({ error: 'Failed to update profile' })
            }
            res.json(extractProfile(users.rows[0]))
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Failed to update profile' })
        }
    }

    async sendOneTimePassword(req, res) {
        try {
            const { email } = req.body
            const oneTimePassword = uuid4()
            const users = await db.query(
                `UPDATE users SET one_time_password_hash = ?
                    WHERE email = ? RETURNING *`,
                [md5(oneTimePassword + SALT), email]
            )
            if (users.rowCount !== 1) {
                return res.status(500).json({ error: 'Failed to send one-time password' })
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
            res.status(500).json({ error: 'Failed to send one-time password' })
        }
    }
}

module.exports = new UserController()