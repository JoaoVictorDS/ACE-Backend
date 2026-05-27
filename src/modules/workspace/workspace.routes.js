const express = require('express')
const router = express.Router()

const authMiddleware = require('../../shared/middlewares/auth.middleware')
const adminMiddleware = require('../../shared/middlewares/admin.middleware')

const WorkspaceController = require('../../modules/workspace/workspace.controller')

const BoardController = require('../../modules/board/board.controller')

router.post('/', authMiddleware, adminMiddleware, WorkspaceController.create)
router.get('/', authMiddleware, WorkspaceController.list)
router.patch('/:workspace_id', authMiddleware, WorkspaceController.update)
router.delete('/:workspace_id', authMiddleware, adminMiddleware, WorkspaceController.delete)
router.patch('/:workspace_id/move', authMiddleware, WorkspaceController.move)

router.get('/:workspace_id/logs', authMiddleware, WorkspaceController.getHistory)

router.use('/:workspace_id/boards', require('../board/board.workspace.routes'))
router.use('/:workspace_id/members', require('../workspace-member/workspace-member.routes'))

module.exports = router