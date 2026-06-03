const express = require('express')
const router = express.Router({ mergeParams: true })

const { authMiddleware, validationMiddleware } = require('../../shared/middlewares')
const { createColumnSchema, listColumnsSchema, moveColumnSchema, updateColumnRestrictionsSchema } = require('./column.validator')
const ColumnController = require('./column.controller')

router.post('/', authMiddleware, validationMiddleware(createColumnSchema), ColumnController.create)
router.get('/', authMiddleware, validationMiddleware(listColumnsSchema), ColumnController.list)
router.patch('/:column_id/move', authMiddleware, validationMiddleware(moveColumnSchema), ColumnController.move)
router.patch('/:column_id/restrictions', authMiddleware, validationMiddleware(updateColumnRestrictionsSchema), ColumnController.updateRestrictions)

module.exports = router