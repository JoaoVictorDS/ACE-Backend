const { catchAsync } = require('../../shared/utils')
const UndoService = require('./undo.service')

const UndoController = {

    listRecent: catchAsync(async (req, res, next) => {
        const { board_id: boardId } = req.validated.params
        const { page, limit } = req.validated.query

        const undoActions = await UndoService.listRecentForBoard({
            user: req.user,
            boardId,
            page,
            limit
        })

        return res.status(200).json(undoActions)
    }),

    restore: catchAsync(async (req, res, next) => {
        const { undo_action_id: undoActionId } = req.validated.params

        const result = await UndoService.restore({
            user: req.user,
            undoActionId
        })

        return res.status(200).json(result)
    }),

}

module.exports = UndoController