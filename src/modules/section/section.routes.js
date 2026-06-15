const express = require('express')
const router = express.Router()

const { authMiddleware, validationMiddleware } = require('../../shared/middlewares')
const { updateSectionSchema, deleteSectionSchema, moveSectionSchema } = require('./section.validator')
const SectionController = require('./section.controller')

router.patch('/:section_id', authMiddleware, validationMiddleware(updateSectionSchema), SectionController.update)
router.patch('/:section_id/move', authMiddleware, validationMiddleware(moveSectionSchema), SectionController.move)
router.delete('/:section_id', authMiddleware, validationMiddleware(deleteSectionSchema), SectionController.delete)

router.use('/:section_id/items', require('../item/item.section.routes'))

module.exports = router