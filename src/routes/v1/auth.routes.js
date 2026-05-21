const express = require('express')
const router = express.Router()

const { rateLimitMiddleware, authMiddleware, validationMiddleware } = require('../../middlewares')

const { AuthController } = require('../../controllers')

router.post('/login', rateLimitMiddleware.authLimiter, AuthController.login)
router.post('/refresh', AuthController.refresh)
router.post('/logout', authMiddleware, AuthController.logout)

module.exports = router