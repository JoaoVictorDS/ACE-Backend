const BoardService = require('./board.service')
const BoardMemberService = require('../board-member/board-member.service')
const LogService = require('../log/log.service')
const { catchAsync } = require('../../shared')

const BoardController = {

    create: catchAsync(async (req, res, next) => {
        const { workspace_id: workspaceId } = req.validated.params
        const { name } = req.validated.body

        const board = await BoardService.create({
            user: req.user,
            workspaceId,
            name
        })

        return res.status(201).json(board)
    }),

    list: catchAsync(async (req, res, next) => {
        const { workspace_id: workspaceId } = req.validated.params

        const boards = await BoardService.getByUserAndWorkspace({
            user: req.user,
            workspaceId
        })

        return res.status(200).json(boards)
    }),

    show: catchAsync(async (req, res, next) => {
        const { board_id: boardId } = req.validated.params

        const board = await BoardService.getFull({
            user: req.user,
            boardId
        })

        return res.status(200).json(board)
    }),

    update: catchAsync(async (req, res, next) => {
        const { board_id: boardId } = req.validated.params
        const data = req.validated.body

        const updatedBoard = await BoardService.update({
            user: req.user,
            boardId,
            data
        })

        return res.status(200).json(updatedBoard)
    }),

    delete: catchAsync(async (req, res, next) => {
        const { board_id: boardId } = req.validated.params
        const { force } = req.validated.query

        await BoardService.delete({
            user: req.user,
            boardId,
            force
        })

        return res.status(204).send()
    }),

    move: catchAsync(async (req, res, next) => {
        const { board_id: boardId } = req.validated.params
        const { new_order: newOrder } = req.validated.body

        const movedMembership = await BoardMemberService.move({
            user: req.user,
            boardId,
            newOrder
        })

        return res.status(200).json(movedMembership)
    }),

    getHistory: catchAsync(async (req, res, next) => {
        const { board_id: boardId } = req.validated.params
        const { limit, page } = req.validated.query

        const logs = await LogService.getByBoard({
            user: req.user,
            boardId,
            limit,
            page
        })

        return res.status(200).json(logs)
    }),

}

module.exports = BoardController