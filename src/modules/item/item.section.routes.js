const express = require('express')
const router = express.Router({ mergeParams: true })

const authMiddleware = require('../../shared/middlewares/auth.middleware')
const validationMiddleware = require('../../shared/middlewares/validation.middleware')
const ItemController = require('./item.controller')
const { createItemSchema } = require('./item.validator')

router.post('/', authMiddleware, validationMiddleware(createItemSchema), ItemController.create)

module.exports = router