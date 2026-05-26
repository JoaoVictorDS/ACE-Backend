const BoardService = require('./board.service')
const BoardMemberService = require('../board-member/board-member.service')
const LogService = require('../log/log.service')
const catchAsync = require('../../shared/utils/catchAsync')
const { createBoardSchema, showBoardSchema, updateBoardSchema, moveBoardSchema, deleteBoardSchema, getHistorySchema } = require('./board.validator')

const BoardController = {

    create: catchAsync(async (req, res, next) => {
        const { workspace_id: workspaceId, ...otherFields } = createBoardSchema.parse({
            ...req.body,
            ...req.params
        })

        const board = await BoardService.create({
            user: req.user,
            workspaceId,
            ...otherFields
        })

        return res.status(201).json(board)
    }),

    list: catchAsync(async (req, res, next) => {
        const boards = await BoardService.getByUser({
            user: req.user
        })

        return res.status(200).json(boards)
    }),

    show: catchAsync(async (req, res, next) => {
        const { board_id: boardId } = showBoardSchema.parse(req.params)

        const board = await BoardService.getFull({
            user: req.user,
            boardId
        })

        return res.status(200).json(board)
    }),

    update: catchAsync(async (req, res, next) => {
        const { board_id: boardId, ...otherFields } = updateBoardSchema.parse({
            ...req.body,
            ...req.params
        })

        const updatedBoard = await BoardService.update({
            user: req.user,
            boardId,
            ...otherFields,
        })

        return res.status(200).json(updatedBoard)
    }),

    delete: catchAsync(async (req, res, next) => {
        const { board_id: boardId, force } = deleteBoardSchema.parse({
            ...req.params,
            ...req.query
        })

        await BoardService.delete({
            user: req.user,
            boardId,
            force
        })

        return res.status(204).send()
    }),

    move: catchAsync(async (req, res, next) => {
        const { board_id: boardId, new_order: newOrder } = moveBoardSchema.parse({
            ...req.body,
            ...req.params
        })

        const movedMembership = await BoardMemberService.move({
            user: req.user,
            boardId,
            newOrder
        })

        return res.status(200).json(movedMembership)
    }),

    getHistory: catchAsync(async (req, res, next) => {
        const { board_id: boardId } = getHistorySchema.parse(req.params)

        const logs = await LogService.getByBoard({
            user: req.user,
            boardId
        })

        return res.status(200).json(logs)
    }),

}

module.exports = BoardController