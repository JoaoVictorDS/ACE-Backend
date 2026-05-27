const express = require('express')
const router = express.Router()

const authMiddleware = require('../../shared/middlewares/auth.middleware')

const ColumnController = require('./column.controller')

router.patch('/:column_id', authMiddleware, ColumnController.update)
router.delete('/:column_id', authMiddleware, ColumnController.delete)

module.exports = router