const express = require('express')
const router = express.Router()

const { authMiddleware, validationMiddleware } = require('../../middlewares')

const { SectionController, ItemController } = require('../../controllers')

const { createItemSchema } = require('../../validators/itemValidator')

router.patch('/:section_id', authMiddleware, SectionController.update)
router.delete('/:section_id', authMiddleware, SectionController.delete)
router.patch('/:section_id/move', authMiddleware, SectionController.move)

router.post('/:section_id/items', authMiddleware, validationMiddleware(createItemSchema), ItemController.create)

module.exports = router