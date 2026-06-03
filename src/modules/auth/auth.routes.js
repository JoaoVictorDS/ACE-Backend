const express = require('express')
const router = express.Router()

const { authLimiter, authMiddleware, validationMiddleware } = require('../../shared/middlewares')
const { loginSchema, refreshTokenCookieSchema } = require('./auth.validator')
const AuthController = require('./auth.controller')

router.post('/login', authLimiter, validationMiddleware(loginSchema), AuthController.login)
router.post('/refresh', validationMiddleware(refreshTokenCookieSchema), AuthController.refresh)
router.post('/logout', authMiddleware, AuthController.logout)

module.exports = router
