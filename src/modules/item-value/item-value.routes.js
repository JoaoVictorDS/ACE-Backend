const express = require('express')
const router = express.Router({ mergeParams: true })

const authMiddleware = require('../../shared/middlewares/auth.middleware')
const validationMiddleware = require('../../shared/middlewares/validation.middleware')
const ItemValueController = require('./item-value.controller')

router.patch('/', authMiddleware, ItemValueController.upsert)

module.exports = router