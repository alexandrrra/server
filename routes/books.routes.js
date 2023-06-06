const Router = require('express')
const router = new Router()
const booksController = require ('../controller/books.controller')

router.get('/books', booksController.getBooks)
router.get('/books/:id', booksController.getOneBook)
router.post('/books/:id/feedback', booksController.createFeedback)
router.put('/books/:id/feedback', booksController.updateFeedback)
router.delete('/books/:id/feedback', booksController.deleteFeedback)

router.get('/priceRange', booksController.getPriceRange)
router.get('/authors', booksController.getAuthors)
router.get('/genres', booksController.getGenres)
router.get('/publishments', booksController.getPublishments)

module.exports = router