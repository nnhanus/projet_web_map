const userController = require ('../controllers/user')

const express = require('express')
var router = express.Router()

router.post('/login', userController.loginUser)
router.get('/logout', userController.logoutUser)

module.exports = router
