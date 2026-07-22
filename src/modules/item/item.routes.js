const express = require('express')
const router = express.Router()

const { authMiddleware, validationMiddleware } = require('../../shared/middlewares')
const ItemController = require('./item.controller')
const { showItemSchema, updateItemSchema, deleteItemSchema, moveItemSchema } = require('./item.validator')

router.get('/:item_id', authMiddleware, validationMiddleware(showItemSchema), ItemController.show)
router.patch('/:item_id', authMiddleware, validationMiddleware(updateItemSchema), ItemController.update)
router.delete('/:item_id', authMiddleware, validationMiddleware(deleteItemSchema), ItemController.delete)
router.patch('/:item_id/move', authMiddleware, validationMiddleware(moveItemSchema), ItemController.move)

router.use('/:item_id/columns/:column_id/values', require('../item-value/item-value.routes'))
router.use('/:item_id/updates', require('../item-update/item-update.item.routes'))
router.use('/:item_id/comments', require('../comment/comment.item.routes'))

module.exports = router