const { catchAsync } = require('../../shared/utils')
const ColumnService = require('./column.service')

const ColumnController = {

    create: catchAsync(async (req, res, next) => {
        const { board_id: boardId } = req.validated.params
        const { data_type: dataType, formula_expression: formulaExpression, ...otherFields } = req.validated.body

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
        const { board_id: boardId } = req.validated.params

        const columns = await ColumnService.getByBoard({
            user: req.user,
            boardId
        })

        return res.status(200).json(columns)
    }),

    update: catchAsync(async (req, res, next) => {
        const { column_id: columnId } = req.validated.params
        const { data_type: dataType, formula_expression: formulaExpression, ...otherFields } = req.validated.body

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
        const { column_id: columnId } = req.validated.params
        const { force } = req.validated.query

        await ColumnService.delete({
            user: req.user,
            columnId,
            force
        })

        return res.status(204).send()
    }),

    move: catchAsync(async (req, res, next) => {
        const { column_id: columnId } = req.validated.params
        const { new_order: newOrder } = req.validated.body

        const movedColumn = await ColumnService.move({
            user: req.user,
            columnId,
            newOrder
        })

        return res.status(200).json(movedColumn)
    }),

    updateRestrictions: catchAsync(async (req, res, next) => {
        const { column_id: columnId } = req.validated.params
        const { restrictions } = req.validated.body

        const updatedRestrictions = await ColumnService.updateRestrictions({
            user: req.user,
            columnId,
            restrictions
        })

        return res.status(200).json(updatedRestrictions)
    }),

}

module.exports = ColumnController