const Router = require('express')
const router = new Router()
const booksController = require ('../controller/books.controller')


router.get('/books', booksController.getBooks)



module.exports = router