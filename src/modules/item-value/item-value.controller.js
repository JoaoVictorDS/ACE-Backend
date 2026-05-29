const ItemValueService = require('./item-value.service')
const catchAsync = require('../../shared/utils/catchAsync')

const ItemValueController = {

    upsert: catchAsync(async (req, res, next) => {
        const { item_id: itemId, column_id: columnId } = req.params
        const { value } = req.body

        const result = await ItemValueService.upsert({
            user: req.user,
            itemId,
            columnId,
            value
        })

        const statusMap = {
            'CREATED': 201,
            'UPDATED': 200,
            'DELETED': 200,
            'UNCHANGED': 200
        }
        const statusCode = statusMap[result.action] || 200

        return res.status(statusCode).json(result.data)
    }),

}

module.exports = ItemValueController