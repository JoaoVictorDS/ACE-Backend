const express = require('express')
const router = express.Router({ mergeParams: true })

const { authMiddleware, validationMiddleware } = require('../../shared/middlewares')
const { upsertItemValueSchema } = require('./item-value.validator')
const ItemValueController = require('./item-value.controller')

router.post('/', authMiddleware, validationMiddleware(upsertItemValueSchema), ItemValueController.upsert)

module.exports = router