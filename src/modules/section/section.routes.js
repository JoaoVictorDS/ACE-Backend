const express = require('express')
const router = express.Router()

const { authMiddleware, validationMiddleware } = require('../../shared/middlewares')
const { updateSectionSchema, deleteSectionSchema } = require('./section.validator')
const SectionController = require('./section.controller')

router.patch('/:section_id', authMiddleware, validationMiddleware(updateSectionSchema), SectionController.update)
router.delete('/:section_id', authMiddleware, validationMiddleware(deleteSectionSchema), SectionController.delete)

router.use('/:section_id/items', require('../item/item.section.routes'))

module.exports = router