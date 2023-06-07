const axios = require('axios')
const {v4: uuid4} = require("uuid")
const nodemailer = require('nodemailer')
const db = require('../db')

const YOOKASSA_ID = '319895'
const YOOKASSA_KEY = 'test_7E_DSCwiim-wO2Ir0Vqsk3uuGuQHlnR3LO0-1ee10Is'

const transporter = nodemailer.createTransport({
    host: "mail.hostland.ru",
    port: 465,
    secure: true,
    auth: {
        user: 'booklib@game1vs100.ru',
        pass: '1013bd25-f5e0-48e4-bdca-555670548e3a'
    }
})

class UtilsController  {
    async sendMail(mailOptions) {
        return await transporter.sendMail(mailOptions)
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

    async pay(total, order_id) {
        const response = await axios.post(
            'https://api.yookassa.ru/v3/payments',
            {
                "amount": {
                    "value": total,
                    "currency": "RUB"
                },
                "capture": true,
                "confirmation": {
                    "type": "redirect",
                    "return_url": "http://localhost:8081/"
                },
                "description": `Заказ номер ${order_id}`
            },
            {
                headers: {
                    "Idempotence-Key": uuid4()
                },
                auth: {
                    username: YOOKASSA_ID,
                    password: YOOKASSA_KEY
                }
            }
        )
        return [response.data.id, response.data.confirmation.confirmation_url]
    }
}

module.exports = new UtilsController()