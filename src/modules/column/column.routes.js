const express = require('express')
const router = express.Router()

const { authMiddleware, validationMiddleware } = require('../../shared/middlewares')
const { updateColumnSchema, deleteColumnSchema, moveColumnSchema, updateColumnRestrictionsSchema } = require('./column.validator')
const ColumnController = require('./column.controller')

router.patch('/:column_id', authMiddleware, validationMiddleware(updateColumnSchema), ColumnController.update)
router.patch('/:column_id/move', authMiddleware, validationMiddleware(moveColumnSchema), ColumnController.move)
router.patch('/:column_id/restrictions', authMiddleware, validationMiddleware(updateColumnRestrictionsSchema), ColumnController.updateRestrictions)
router.delete('/:column_id', authMiddleware, validationMiddleware(deleteColumnSchema), ColumnController.delete)

module.exports = router