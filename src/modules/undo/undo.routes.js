const express = require('express')
const router = express.Router()

const { authMiddleware, validationMiddleware } = require('../../shared/middlewares')
const { restoreUndoActionSchema } = require('./undo.validator')
const UndoController = require('./undo.controller')

router.post('/:undo_action_id/restore', authMiddleware, validationMiddleware(restoreUndoActionSchema), UndoController.restore)

module.exports = router