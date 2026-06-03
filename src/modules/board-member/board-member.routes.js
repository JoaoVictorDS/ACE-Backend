const express = require('express')
const router = express.Router({ mergeParams: true })

const { authMiddleware, validationMiddleware } = require('../../shared/middlewares')
const { upsertMemberSchema, listMembersSchema, removeMemberSchema, leaveBoardSchema } = require('./board-member.validator')
const BoardMemberController = require('../board-member/board-member.controller')

router.post('/', authMiddleware, validationMiddleware(upsertMemberSchema), BoardMemberController.upsert)
router.get('/', authMiddleware, validationMiddleware(listMembersSchema), BoardMemberController.list)
router.delete('/:member_id', authMiddleware, validationMiddleware(removeMemberSchema), BoardMemberController.remove)
router.delete('/', authMiddleware, validationMiddleware(leaveBoardSchema), BoardMemberController.leave)

module.exports = router