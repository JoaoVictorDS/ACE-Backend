const BoardService = require('../services/BoardService')
const BoardMemberService = require('../services/BoardMemberService')
const LogService = require('../services/LogService')
const catchAsync = require('../utils/catchAsync')
const { createBoardSchema, updateBoardSchema, moveBoardSchema, deleteBoardSchema, getHistorySchema } = require('../validators/boardValidator')


const BoardController = {

    create: catchAsync(async (req, res, next) => {
        const { workspace_id: workspaceId, ...otherFields } = createBoardSchema.parse({
            ...req.body,
            ...req.params
        })

        const board = await BoardService.createBoard({
            ...otherFields,
            workspaceId,
            userId: req.user.id
        })

        return res.status(201).json({
            message: 'Quadro criado com sucesso!',
            board
        })
    }),

    list: catchAsync(async (req, res, next) => {
        const boards = await BoardService.getBoardsByUser({
            userId: req.user.id
        })

        return res.status(200).json(boards)
    }),

    update: catchAsync(async (req, res, next) => {
        const { board_id: boardId, ...otherFields } = updateBoardSchema.parse({
            ...req.body,
            ...req.params
        })

        const updatedBoard = await BoardService.updateBoard({
            boardId,
            ...otherFields,
            userId: req.user.id
        })

        return res.status(200).json({
            message: 'Quadro atualizado com sucesso!',
            updatedBoard
        })
    }),

    delete: catchAsync(async (req, res, next) => {
        const { board_id: boardId, force } = deleteBoardSchema.parse({
            ...req.params,
            ...req.query
        })

        await BoardService.deleteBoard({
            boardId,
            userId: req.user.id,
            force
        })

        return res.status(200).json({
            message: 'Quadro excluído com sucesso!'
        })
    }),

    move: catchAsync(async (req, res, next) => {
        const { board_id: boardId, new_order: newOrder } = moveBoardSchema.parse({
            ...req.body,
            ...req.params
        })

        const movedMembership = await BoardMemberService.moveBoard({
            userId: req.user.id,
            boardId,
            newOrder
        })

        return res.status(200).json({
            message: 'Ordem do quadro atualizada com sucesso!',
            movedMembership
        })
    }),

    getHistory: catchAsync(async (req, res, next) => {
        const { board_id: boardId } = getHistorySchema.parse(req.params)

        const logs = await LogService.getLogsByBoard({
            boardId,
            userId: req.user.id
        })

        return res.status(200).json(logs)
    }),

}

module.exports = BoardController