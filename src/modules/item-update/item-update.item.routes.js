const express = require('express')
const router = express.Router({ mergeParams: true })

const { authMiddleware, validationMiddleware } = require('../../shared/middlewares')
const { createItemUpdateSchema, listItemUpdateSchema } = require('./item-update.validator')
const ItemUpdateController = require('./item-update.controller')

router.post('/', authMiddleware, validationMiddleware(createItemUpdateSchema), ItemUpdateController.create)
router.get('/', authMiddleware, validationMiddleware(listItemUpdateSchema), ItemUpdateController.list)

module.exports = router