const express = require('express')
const router = express.Router()

const { authMiddleware, validationMiddleware } = require('../../middlewares')

const { ItemController, CommentController, ItemValueController } = require('../../controllers')

const { showItemSchema, updateItemSchema, deleteItemSchema, moveItemSchema } = require('../../validators/itemValidator')

router.get('/:item_id', authMiddleware, validationMiddleware(showItemSchema), ItemController.show)
router.patch('/:item_id', authMiddleware, validationMiddleware(updateItemSchema), ItemController.update)
router.delete('/:item_id', authMiddleware, validationMiddleware(deleteItemSchema), ItemController.delete)
router.patch('/:item_id/move', authMiddleware, validationMiddleware(moveItemSchema), ItemController.move)

router.patch('/:item_id/columns/:column_id/value', authMiddleware, ItemValueController.upsert)

router.post('/:item_id/comments', authMiddleware, CommentController.create)
router.get('/:item_id/comments', authMiddleware, CommentController.list)

module.exports = router