const ColumnService = require('../services/ColumnService')
const catchAsync = require('../utils/catchAsync')
const { createColumnSchema, updateColumnSchema, moveColumnSchema, listColumnsSchema, deleteColumnSchema } = require('../validators/columnValidator')

const ColumnController = {

    create: catchAsync(async (req, res, next) => {
        const { board_id: boardId, data_type: dataType, formula_expression: formulaExpression, ...otherFields } = createColumnSchema.parse({
            ...req.body,
            ...req.params
        })

        const column = await ColumnService.createColumn({
            user: req.user,
            boardId,
            dataType,
            formulaExpression,
            ...otherFields
        })

        return res.status(201).json({
            message: 'Coluna criada com sucesso!',
            column
        })
    }),

    list: catchAsync(async (req, res, next) => {
        const { board_id: boardId } = listColumnsSchema.parse(req.params)

        const columns = await ColumnService.getColumnsByBoard({
            user: req.user,
            boardId
        })

        return res.status(200).json(columns)
    }),

    update: catchAsync(async (req, res, next) => {
        const { data_type: dataType, formula_expression: formulaExpression, column_id: columnId, ...otherFields } = updateColumnSchema.parse({
            ...req.body,
            ...req.params
        })

        const updatedColumn = await ColumnService.updateColumn({
            user: req.user,
            columnId,
            dataType,
            formulaExpression,
            ...otherFields
        })

        return res.status(200).json({
            message: 'Coluna atualizada com sucesso!',
            updatedColumn
        })
    }),

    delete: catchAsync(async (req, res, next) => {
        const { column_id: columnId, force } = deleteColumnSchema.parse({
            ...req.params,
            ...req.query
        })

        await ColumnService.deleteColumn({
            user: req.user,
            columnId,
            force
        })

        return res.status(200).json({
            message: 'Coluna excluída com sucesso!'
        })
    }),

    move: catchAsync(async (req, res, next) => {
        const { column_id: columnId, new_order: newOrder } = moveColumnSchema.parse({
            ...req.body,
            ...req.params
        })

        const movedColumn = await ColumnService.moveColumn({
            user: req.user,
            columnId,
            newOrder
        })

        return res.status(200).json({
            message: 'Ordem da coluna atualizada com sucesso!',
            movedColumn
        })
    }),

}

module.exports = ColumnController