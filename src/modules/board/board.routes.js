const express = require('express')
const router = express.Router()

const { authMiddleware, validationMiddleware } = require('../../shared/middlewares')
const { showBoardSchema, updateBoardSchema, deleteBoardSchema, moveBoardSchema, getHistorySchema } = require('./board.validator')
const BoardController = require('./board.controller')

router.get('/:board_id', authMiddleware, validationMiddleware(showBoardSchema), BoardController.show)
router.patch('/:board_id', authMiddleware, validationMiddleware(updateBoardSchema), BoardController.update)
router.delete('/:board_id', authMiddleware, validationMiddleware(deleteBoardSchema), BoardController.delete)
router.patch('/:board_id/move', authMiddleware, validationMiddleware(moveBoardSchema), BoardController.move)

router.get('/:board_id/logs', authMiddleware, validationMiddleware(getHistorySchema), BoardController.getHistory)

router.use('/:board_id/columns', require('../column/column.board.routes'))
router.use('/:board_id/sections', require('../section/section.board.routes'))
router.use('/:board_id/members', require('../board-member/board-member.routes'))
router.use('/:board_id/user-notification-settings', require('../user-notification-setting/user-notification-setting.board.routes'))

module.exports = router