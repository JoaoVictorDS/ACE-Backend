const express = require('express')
const router = express.Router()

const rateLimitMiddleware = require('../../shared/middlewares/rateLimit.middleware')
const authMiddleware = require('../../shared/middlewares/auth.middleware')
const validationMiddleware = require('../../shared/middlewares/validation.middleware')
const { loginSchema, refreshTokenCookieSchema } = require('./auth.validator')
const AuthController = require('./auth.controller')

router.post('/login', rateLimitMiddleware.authLimiter, validationMiddleware(loginSchema), AuthController.login)
router.post('/refresh', validationMiddleware(refreshTokenCookieSchema), AuthController.refresh)
router.post('/logout', authMiddleware, AuthController.logout)

module.exports = router
