const express = require('express')
const router = express.Router()

const { authMiddleware, adminMiddleware } = require('../../middlewares')

const { WorkspaceController, BoardController, WorkspaceMemberController } = require('../../controllers')

router.post('/', authMiddleware, adminMiddleware, WorkspaceController.create)
router.get('/', authMiddleware, WorkspaceController.list)
router.patch('/:workspace_id', authMiddleware, WorkspaceController.update)
router.delete('/:workspace_id', authMiddleware, adminMiddleware, WorkspaceController.delete)
router.patch('/:workspace_id/move', authMiddleware, WorkspaceController.move)

router.post('/:workspace_id/boards', authMiddleware, BoardController.create)

router.post('/:workspace_id/members', authMiddleware, WorkspaceMemberController.upsert)
router.get('/:workspace_id/members', authMiddleware, WorkspaceMemberController.list)
router.delete('/:workspace_id/members/:member_id', authMiddleware, WorkspaceMemberController.remove)
router.delete('/:workspace_id/members', authMiddleware, WorkspaceMemberController.leave)

router.get('/:workspace_id/logs', authMiddleware, WorkspaceController.getHistory)

module.exports = router