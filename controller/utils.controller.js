const nodemailer = require('nodemailer')

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
}

module.exports = new UtilsController()