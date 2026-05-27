const express = require('express')
const router = express.Router()

const authMiddleware = require('../../shared/middlewares/auth.middleware')
const validationMiddleware = require('../../shared/middlewares/validation.middleware')

const BoardController = require('./board.controller')

router.get('/', authMiddleware, BoardController.list)
router.get('/:board_id', authMiddleware, BoardController.show)
router.patch('/:board_id', authMiddleware, BoardController.update)
router.delete('/:board_id', authMiddleware, BoardController.delete)
router.patch('/:board_id/move', authMiddleware, BoardController.move)

router.get('/:board_id/logs', authMiddleware, BoardController.getHistory)

router.use('/:board_id/columns', require('../column/column.board.routes'))
router.use('/:board_id/sections', require('../section/section.board.routes'))
router.use('/:board_id/members', require('../board-member/board-member.routes'))

module.exports = router