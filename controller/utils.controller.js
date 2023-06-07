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
                    "return_url": "http://localhost:8081/profile/orders"
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

    async updateOrderStatuses() {
        const [orders] = await db.query(
            `SELECT o.*, u.email FROM orders AS o JOIN users AS u ON u.user_id = o.user_id WHERE pending`
        )
        for (const order of orders) {
            try {
                const response = await axios.get(
                    `https://api.yookassa.ru/v3/payments/${order.payment_id}`,
                    {
                        auth: {
                            username: YOOKASSA_ID,
                            password: YOOKASSA_KEY
                        }
                    }
                )
                if (response.data.status === "succeeded") {
                    await db.query(
                        `UPDATE orders SET pending = FALSE WHERE order_id = ?`,
                        [order.order_id]
                    )
                    await db.query(
                        `UPDATE
                            books AS dst,
                            (
                                SELECT b.book_id, COALESCE(b.sales, 0) + d.quantity * b.price AS sales
                                    FROM books AS b
                                    JOIN order_details AS d ON d.book_id = b.book_id
                                    JOIN orders AS o ON o.order_id = d.order_id
                                    WHERE o.order_id = ?
                            ) AS src
                            SET dst.sales = src.sales
                            WHERE src.book_id = dst.book_id`,
                        [order.order_id]
                    )
                    if (order.email) {
                        await utilsController.sendMail({
                            from: 'booklib@game1vs100.ru',
                            to: order.email,
                            subject: 'Booklib новый заказ',
                            text: `Ваш заказ ${order.order_id} на сумму ${order.total} ₽ на имя ${order.name} уже упаковывается чтобы отправится по адресу ${order.address}. Подробности в вашем ЛК.`
                        })
                    }
                } else if (response.data.status === "canceled") {
                    await db.query(
                        `UPDATE orders SET pending = FALSE, canceled = TRUE WHERE order_id = ?`,
                        [order.order_id]
                    )
                }
            } catch (error) {
                console.error(error);
            }
        }
    }
}

const utilsController = new UtilsController()

module.exports = utilsController