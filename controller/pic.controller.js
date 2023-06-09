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

class PicController {
    async uploadPicture(req, res) {
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
                `SELECT * FROM books WHERE book_id = ?`,
                [req.params.id]
            )
            if (books.length !== 1) {
                return res.status(404).json({ error: 'Can not find book' })
            }
            if (books[0].image_url) {
                deleteFile(`../${books[0].image_url}`)
            }

            const picturePath = req.file.path
            await db.query(
                `UPDATE books SET image_url = ? WHERE book_id = ?`,
                [picturePath, req.params.id]
            )

            res.status(200).json({ message: 'Picture uploaded successfully' })
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Failed to upload picture' })
        }
    }
}

module.exports = new PicController();
