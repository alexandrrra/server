const Router = require('express')
const router = new Router()
const userController = require ('../controller/user.controller')

router.post('/user', userController.createUser)

router.post('/token', userController.setToken)
router.put('/token', userController.refreshToken)
router.delete('/token', userController.deleteToken)

router.get('/profile', userController.getProfile)
router.put('/profile', userController.updateProfile)

router.post('/sendOneTimePassword', userController.sendOneTimePassword)

router.get('/favorites', userController.getFavorites)
router.post('/favorites', userController.addFavorite)
router.delete('/favorites/:id', userController.deleteFavorite)

router.get('/products', userController.getProducts)
router.post('/products', userController.addProduct)
router.put('/products/:id', userController.updateProduct)
router.delete('/products/:id', userController.deleteProduct)

router.post('/orders', userController.createOrder)
router.get('/orders', userController.getOrders)
router.get('/orders/:id', userController.getOneOrder)

module.exports = router