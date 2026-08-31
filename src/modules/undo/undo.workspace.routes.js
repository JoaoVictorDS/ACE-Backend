const express = require('express')
const router = express.Router({ mergeParams: true })

const { authMiddleware, validationMiddleware } = require('../../shared/middlewares')
const { listWorkspaceUndoActionsSchema } = require('./undo.validator')
const UndoController = require('./undo.controller')

router.get('/', authMiddleware, validationMiddleware(listWorkspaceUndoActionsSchema), UndoController.listRecentForWorkspace)

module.exports = router