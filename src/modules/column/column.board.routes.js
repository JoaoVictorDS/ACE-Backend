const express = require('express')
const router = express.Router({ mergeParams: true })

const authMiddleware = require('../../shared/middlewares/auth.middleware')

const ColumnController = require('./column.controller')

router.post('/', authMiddleware, ColumnController.create)
router.get('/', authMiddleware, ColumnController.list)
router.patch('/:column_id/move', authMiddleware, ColumnController.move)
router.patch('/:column_id/restrictions', authMiddleware, ColumnController.updateRestrictions)

module.exports = router