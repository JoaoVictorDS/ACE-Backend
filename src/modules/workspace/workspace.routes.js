const express = require('express')
const router = express.Router()

const { authMiddleware, adminMiddleware, validationMiddleware } = require('../../shared/middlewares')
const { createWorkspaceSchema, updateWorkspaceSchema, deleteWorkspaceSchema, movedWorkspaceSchema, getHistorySchema } = require('./workspace.validator')
const WorkspaceController = require('../../modules/workspace/workspace.controller')

router.post('/', authMiddleware, adminMiddleware, validationMiddleware(createWorkspaceSchema), WorkspaceController.create)
router.get('/', authMiddleware, WorkspaceController.list)
router.patch('/:workspace_id', authMiddleware, validationMiddleware(updateWorkspaceSchema), WorkspaceController.update)
router.delete('/:workspace_id', authMiddleware, adminMiddleware, validationMiddleware(deleteWorkspaceSchema), WorkspaceController.delete)
router.patch('/:workspace_id/move', authMiddleware, validationMiddleware(movedWorkspaceSchema), WorkspaceController.move)

router.get('/:workspace_id/logs', authMiddleware, validationMiddleware(getHistorySchema), WorkspaceController.getHistory)

router.use('/:workspace_id/boards', require('../board/board.workspace.routes'))
router.use('/:workspace_id/members', require('../workspace-member/workspace-member.routes'))

module.exports = router