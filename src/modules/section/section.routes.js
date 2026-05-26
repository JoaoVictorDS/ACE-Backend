const express = require('express')
const router = express.Router()

const authMiddleware = require('../../shared/middlewares/auth.middleware')
const validationMiddleware = require('../../shared/middlewares/validation.middleware')

const SectionController = require('./section.controller')
const ItemController = require('../item/item.controller')

const { createItemSchema } = require('../item/item.validator')

router.patch('/:section_id', authMiddleware, SectionController.update)
router.delete('/:section_id', authMiddleware, SectionController.delete)
router.patch('/:section_id/move', authMiddleware, SectionController.move)

router.post('/:section_id/items', authMiddleware, validationMiddleware(createItemSchema), ItemController.create)

module.exports = router