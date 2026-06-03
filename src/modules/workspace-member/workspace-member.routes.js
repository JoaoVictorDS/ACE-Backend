const express = require('express')
const router = express.Router({ mergeParams: true })

const { authMiddleware, validationMiddleware } = require('../../shared/middlewares')
const { upsertMemberSchema, listMemberSchema, removeMemberSchema, leaveWorkspaceSchema } = require('./workspace-member.validator')
const WorkspaceMemberController = require('../../modules/workspace-member/workspace-member.controller')

router.post('/', authMiddleware, validationMiddleware(upsertMemberSchema), WorkspaceMemberController.upsert)
router.get('/', authMiddleware, validationMiddleware(listMemberSchema), WorkspaceMemberController.list)
router.delete('/:member_id', authMiddleware, validationMiddleware(removeMemberSchema), WorkspaceMemberController.remove)
router.delete('/', authMiddleware, validationMiddleware(leaveWorkspaceSchema), WorkspaceMemberController.leave)

module.exports = router