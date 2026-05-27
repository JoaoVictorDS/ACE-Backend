const express = require('express')
const router = express.Router({ mergeParams: true })

const authMiddleware = require('../../shared/middlewares/auth.middleware')

const WorkspaceMemberController = require('../../modules/workspace-member/workspace-member.controller')

router.post('/', authMiddleware, WorkspaceMemberController.upsert)
router.get('/', authMiddleware, WorkspaceMemberController.list)
router.delete('/:member_id', authMiddleware, WorkspaceMemberController.remove)
router.delete('/', authMiddleware, WorkspaceMemberController.leave)

module.exports = router