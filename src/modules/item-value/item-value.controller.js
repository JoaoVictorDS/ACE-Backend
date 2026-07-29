const { catchAsync } = require('../../shared/utils')
const ItemValueService = require('./item-value.service')

const ItemValueController = {

    upsert: catchAsync(async (req, res, next) => {
        const { item_id: itemId, column_id: columnId } = req.validated.params
        const { value } = req.validated.body

        const result = await ItemValueService.upsert({
            user: req.user,
            itemId,
            columnId,
            value
        })

        const statusMap = {
            'CREATE': 201,
            'UPDATE': 200,
            'DELETE': 200,
            'UNCHANGED': 200
        }
        const statusCode = statusMap[result.action] || 200

        return res.status(statusCode).json(result.data)
    }),

}

module.exports = ItemValueController