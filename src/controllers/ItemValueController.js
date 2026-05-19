const ItemValueService = require('../services/ItemValueService')
const catchAsync = require('../utils/catchAsync')
const { upsertItemValueSchema } = require('../validators/itemValueValidator')

const ItemValueController = {

    upsert: catchAsync(async (req, res, next) => {
        const { item_id: itemId, column_id: columnId, value } = upsertItemValueSchema.parse({
            ...req.body,
            ...req.params,
        })

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