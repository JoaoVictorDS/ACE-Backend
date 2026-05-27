const express = require('express')
const router = express.Router({ mergeParams: true })

const authMiddleware = require('../../shared/middlewares/auth.middleware')
const validationMiddleware = require('../../shared/middlewares/validation.middleware')
const SectionController = require('./section.controller')

router.post('/', authMiddleware, SectionController.create)
router.get('/', authMiddleware, SectionController.list)
router.patch('/:section_id/move', authMiddleware, SectionController.move)

module.exports = router