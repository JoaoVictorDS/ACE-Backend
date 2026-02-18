const ColumnService = require('../services/ColumnService')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/AppError')
const { createColumnSchema, updateColumnSchema, moveColumnSchema } = require('../validators/columnValidator')

const ColumnController = {

    create: catchAsync(async (req, res, next) => {
        const result = createColumnSchema.safeParse({
            ...req.body,
            board_id: parseInt(req.params.boardId)
        })
        if (!result.success) return next(new AppError(result.error.issues[0].message, 400))

        const { board_id, data_type, name, formula_expression, options } = result.data

        const column = await ColumnService.createColumn({
            boardId: board_id,
            name,
            dataType: data_type.toUpperCase(),
            options,
            formulaExpression: formula_expression,
            userId: req.user.id
        })

        return res.status(201).json({
            message: 'Coluna customizada criada com sucesso!',
            column
        })
    }),

    list: catchAsync(async (req, res, next) => {
        const boardId = parseInt(req.params.boardId)
        if (!boardId || isNaN(boardId)) return next(new AppError('O parâmetro "boardId" é obrigatório e deve ser number', 400))

        const columns = await ColumnService.getColumnsByBoard({
            boardId,
            userId: req.user.id
        })
        return res.status(200).json(columns)
    }),

    update: catchAsync(async (req, res, next) => {
        const result = updateColumnSchema.safeParse({
            ...req.body,
            column_id: parseInt(req.params.columnId)
        })
        if (!result.success) return next(new AppError(result.error.issues[0].message, 400))

        const { data_type, formula_expression, name, options } = result.data

        const updatedColumn = await ColumnService.updateColumn({
            columnId,
            userId: req.user.id,
            name,
            dataType: data_type?.toUpperCase(),
            options,
            formulaExpression: formula_expression,
        })

        return res.status(200).json({
            message: 'Coluna atualizada com sucesso!',
            column: updatedColumn
        })
    }),

    delete: catchAsync(async (req, res, next) => {
        const columnId = parseInt(req.params.columnId)
        if (!columnId || isNaN(columnId)) return next(new AppError('O parâmetro "columnId" é obrigatório e deve ser number', 400))

        await ColumnService.deleteColumn({
            columnId,
            userId: req.user.id
        })

        return res.status(200).json({
            message: 'Coluna excluída com sucesso.'
        })

    }),

    move: catchAsync(async (req, res, next) => {
        const result = moveColumnSchema.safeParse({
            ...req.body,
            column_id: parseInt(req.params.columnId)
        })
        if (!result.success) return next(new AppError(result.error.issues[0].message, 400))

        const updatedColumn = await ColumnService.moveColumn({
            columnId,
            userId: req.user.id,
            newOrder: result.data.new_order
        })

        return res.status(200).json(updatedColumn)

    }),

}

module.exports = ColumnController