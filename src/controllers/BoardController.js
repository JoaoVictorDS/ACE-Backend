const BoardService = require('../services/BoardService')
const BoardMemberService = require('../services/BoardMemberService')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/AppError')
const { createBoardSchema, updateBoardSchema, moveBoardSchema } = require('../validators/boardValidator')
const PermissionService = require('../services/PermissionService')
const LogService = require('../services/LogService')

const BoardController = {

    create: catchAsync(async (req, res, next) => {
        const result = createBoardSchema.safeParse(req.body)
        if (!result.success) return next(new AppError(result.error.issues[0].message, 400))

        const board = await BoardService.createBoard({
            ...result.data,
            userId: req.user.id
        })

        return res.status(201).json({
            message: 'Quadro criado com sucesso!',
            board
        })

    }),

    list: catchAsync(async (req, res, next) => {
        const boards = await BoardService.getBoardsByUser(req.user.id)
        return res.status(200).json(boards)
    }),

    update: catchAsync(async (req, res, next) => {
        const result = updateBoardSchema.safeParse({
            ...req.body,
            board_id: parseInt(req.params.boardId)
        })
        if (!result.success) return next(new AppError(result.error.issues[0].message, 400))

        const { board_id, name } = result.data

        const updatedBoard = await BoardService.updateBoard({
            boardId: board_id,
            name: name,
            userId: req.user.id
        })

        return res.status(200).json({
            message: 'Quadro atualizado com sucesso!',
            board: updatedBoard
        })

    }),

    delete: catchAsync(async (req, res, next) => {
        const boardId = parseInt(req.params.boardId)
        if (!boardId || isNaN(boardId)) return next(new AppError('O parâmetro "boardId" é obrigatório e deve ser number', 400))

        await BoardService.deleteBoard({
            boardId,
            userId: req.user.id
        })

        return res.status(200).json({
            message: 'Quadro excluído com sucesso!'
        })
    }),

    move: catchAsync(async (req, res, next) => {
        const result = moveBoardSchema.safeParse({
            ...req.body,
            board_id: parseInt(req.params.boardId)
        })
        if (!result.success) return next(new AppError(result.error.issues[0].message, 400))

        const { board_id, new_order } = result.data

        const updatedMembership = await BoardMemberService.moveBoard({
            userId: req.user.id,
            boardId: board_id,
            newOrder: new_order
        })

        return res.status(200).json({
            message: 'Ordem do quadro atualizada!',
            updatedMembership
        })
    }),

    getHistory: catchAsync(async (req, res, next) => {
        const boardId = parseInt(req.params.boardId)
        if (!boardId || isNaN(boardId)) return next(new AppError('O parâmetro "boardId" é obrigatório e deve ser number', 400))

        const logs = await LogService.getLogsByBoard(
            boardId,
            req.user.id
        )
        
        return res.status(200).json(logs)
    }),

}

module.exports = BoardController