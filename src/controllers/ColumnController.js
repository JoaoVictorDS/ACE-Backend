const ColumnService = require('../services/ColumnService')
const catchAsync = require('../utils/catchAsync')
const { createColumnSchema, updateColumnSchema, moveColumnSchema, listColumnsSchema, deleteColumnSchema, updateColumnRestrictionsSchema } = require('../validators/columnValidator')

const ColumnController = {

    create: catchAsync(async (req, res, next) => {
        const { board_id: boardId, data_type: dataType, formula_expression: formulaExpression, ...otherFields } = createColumnSchema.parse({
            ...req.body,
            ...req.params
        })

        const column = await ColumnService.create({
            user: req.user,
            boardId,
            dataType,
            formulaExpression,
            ...otherFields
        })

        return res.status(201).json(column)
    }),

    list: catchAsync(async (req, res, next) => {
        const { board_id: boardId } = listColumnsSchema.parse(req.params)

        const columns = await ColumnService.getByBoard({
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

        const updatedColumn = await ColumnService.update({
            user: req.user,
            columnId,
            dataType,
            formulaExpression,
            ...otherFields
        })

        return res.status(200).json(updatedColumn)
    }),

    delete: catchAsync(async (req, res, next) => {
        const { column_id: columnId, force } = deleteColumnSchema.parse({
            ...req.params,
            ...req.query
        })

        await ColumnService.delete({
            user: req.user,
            columnId,
            force
        })

        return res.status(204).send()
    }),

    move: catchAsync(async (req, res, next) => {
        const { column_id: columnId, new_order: newOrder } = moveColumnSchema.parse({
            ...req.body,
            ...req.params
        })

        const movedColumn = await ColumnService.move({
            user: req.user,
            columnId,
            newOrder
        })

        return res.status(200).json(movedColumn)
    }),

    updateRestrictions: catchAsync(async (req, res, next) => {
        const { column_id: columnId, restrictions } = updateColumnRestrictionsSchema.parse({
            ...req.body,
            ...req.params
        })

        const updatedRestrictions = await ColumnService.updateRestrictions({
            user: req.user,
            columnId,
            restrictions
        })

        return res.status(200).json(updatedRestrictions)
    }),

}

module.exports = ColumnController