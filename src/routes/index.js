const express = require('express')
const rootRouter = express.Router()
const v1Router = require('./v1')

const { rateLimitMiddleware } = require('../middlewares')

const statusRoutes = require('./status.routes')

rootRouter.use(rateLimitMiddleware.apiLimiter)
rootRouter.use('/status', statusRoutes)
rootRouter.use('/v1', v1Router)

module.exports = rootRouter