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

module.exports = router