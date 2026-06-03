const express = require('express')
const router = express.Router({ mergeParams: true })

const { authMiddleware, validationMiddleware } = require('../../shared/middlewares')
const { createSectionSchema, listSectionsSchema, moveSectionSchema } = require('./section.validator')
const SectionController = require('./section.controller')

router.post('/', authMiddleware, validationMiddleware(createSectionSchema), SectionController.create)
router.get('/', authMiddleware, validationMiddleware(listSectionsSchema), SectionController.list)
router.patch('/:section_id/move', authMiddleware, validationMiddleware(moveSectionSchema), SectionController.move)

module.exports = router