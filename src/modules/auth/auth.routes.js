const express = require('express')
const router = express.Router()

const rateLimitMiddleware = require('../../shared/middlewares/rateLimit.middleware')
const authMiddleware = require('../../shared/middlewares/auth.middleware')

const AuthController = require('./auth.controller')

router.post('/login', rateLimitMiddleware.authLimiter, AuthController.login)
router.post('/refresh', AuthController.refresh)
router.post('/logout', authMiddleware, AuthController.logout)

module.exports = router
