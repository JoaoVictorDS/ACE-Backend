const express = require('express')
const router = express.Router({ mergeParams: true })

const { authMiddleware, validationMiddleware } = require('../../shared/middlewares')
const { listUndoActionsSchema } = require('./undo.validator')
const UndoController = require('./undo.controller')

router.get('/', authMiddleware, validationMiddleware(listUndoActionsSchema), UndoController.listRecent)

module.exports = router