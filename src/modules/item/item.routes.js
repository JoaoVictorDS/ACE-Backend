const express = require('express')
const router = express.Router()

const authMiddleware = require('../../shared/middlewares/auth.middleware')
const validationMiddleware = require('../../shared/middlewares/validation.middleware')

const ItemController = require('./item.controller')
const CommentController = require('../../modules/comment/comment.controller')
const ItemValueController = require('../../modules/item-value/item-value.controller')

const { showItemSchema, updateItemSchema, deleteItemSchema, moveItemSchema } = require('./item.validator')

router.get('/:item_id', authMiddleware, validationMiddleware(showItemSchema), ItemController.show)
router.patch('/:item_id', authMiddleware, validationMiddleware(updateItemSchema), ItemController.update)
router.delete('/:item_id', authMiddleware, validationMiddleware(deleteItemSchema), ItemController.delete)
router.patch('/:item_id/move', authMiddleware, validationMiddleware(moveItemSchema), ItemController.move)

router.patch('/:item_id/columns/:column_id/value', authMiddleware, ItemValueController.upsert)

router.post('/:item_id/comments', authMiddleware, CommentController.create)
router.get('/:item_id/comments', authMiddleware, CommentController.list)

module.exports = router