const express = require('express')
const router = express.Router({ mergeParams: true })

const { authMiddleware, validationMiddleware } = require('../../shared/middlewares')
const { createColumnSchema, listColumnsSchema } = require('./column.validator')
const ColumnController = require('./column.controller')

router.post('/', authMiddleware, validationMiddleware(createColumnSchema), ColumnController.create)
router.get('/', authMiddleware, validationMiddleware(listColumnsSchema), ColumnController.list)

module.exports = router