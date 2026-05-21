const express = require('express')
const router = express.Router()

const { authMiddleware } = require('../../middlewares')

const { ColumnController } = require('../../controllers')

router.patch('/:column_id', authMiddleware, ColumnController.update)
router.delete('/:column_id', authMiddleware, ColumnController.delete)
router.patch('/:column_id/move', authMiddleware, ColumnController.move)
router.patch('/:column_id/restrictions', authMiddleware, ColumnController.updateRestrictions)

module.exports = router