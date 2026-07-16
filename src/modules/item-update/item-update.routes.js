const express = require('express')
const router = express.Router()

const { authMiddleware, validationMiddleware } = require('../../shared/middlewares')
const { updateItemUpdateSchema, deleteItemUpdateSchema } = require('./item-update.validator')
const ItemUpdateController = require('./item-update.controller')

router.patch('/:item_update_id', authMiddleware, validationMiddleware(updateItemUpdateSchema), ItemUpdateController.update)
router.delete('/:item_update_id', authMiddleware, validationMiddleware(deleteItemUpdateSchema), ItemUpdateController.delete)

module.exports = router