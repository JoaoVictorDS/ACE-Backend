const express = require('express')
const router = express.Router()

const authMiddleware = require('../../shared/middlewares/auth.middleware')
const validationMiddleware = require('../../shared/middlewares/validation.middleware')
const { updateColumnSchema, deleteColumnSchema } = require('./column.validator')
const ColumnController = require('./column.controller')

router.patch('/:column_id', authMiddleware, validationMiddleware(updateColumnSchema), ColumnController.update)
router.delete('/:column_id', authMiddleware, validationMiddleware(deleteColumnSchema), ColumnController.delete)

module.exports = router