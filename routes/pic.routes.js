const Router = require('express')
const router = new Router()
const picController = require('../controller/pic.controller')
const upload = require('../controller/multerConfig');

router.post('/books/:id/image', upload.single('image'), picController.uploadPicture)

module.exports = router
