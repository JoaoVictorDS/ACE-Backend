const express = require('express')
const router = express.Router()

const authMiddleware = require('../../shared/middlewares/auth.middleware')

const BoardController = require('./board.controller')
const ColumnController = require('../column/column.controller')
const SectionController = require('../section/section.controller')
const BoardMemberController = require('../board-member/board-member.controller')

router.get('/', authMiddleware, BoardController.list)
router.get('/:board_id', authMiddleware, BoardController.show)
router.patch('/:board_id', authMiddleware, BoardController.update)
router.delete('/:board_id', authMiddleware, BoardController.delete)
router.patch('/:board_id/move', authMiddleware, BoardController.move)

router.post('/:board_id/columns', authMiddleware, ColumnController.create)
router.get('/:board_id/columns', authMiddleware, ColumnController.list)

router.post('/:board_id/sections', authMiddleware, SectionController.create)
router.get('/:board_id/sections', authMiddleware, SectionController.list)

router.post('/:board_id/members', authMiddleware, BoardMemberController.upsert)
router.get('/:board_id/members', authMiddleware, BoardMemberController.list)
router.delete('/:board_id/members/:member_id', authMiddleware, BoardMemberController.remove)
router.delete('/:board_id/members', authMiddleware, BoardMemberController.leave)

router.get('/:board_id/logs', authMiddleware, BoardController.getHistory)

module.exports = router