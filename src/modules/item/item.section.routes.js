const express = require('express')
const router = express.Router({ mergeParams: true })

const { authMiddleware, validationMiddleware } = require('../../shared/middlewares')
const ItemController = require('./item.controller')
const { createItemSchema } = require('./item.validator')

router.post('/', authMiddleware, validationMiddleware(createItemSchema), ItemController.create)

module.exports = router