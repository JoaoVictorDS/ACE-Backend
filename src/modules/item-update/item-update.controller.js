const { catchAsync } = require('../../shared/utils')
const ItemUpdateService = require('./item-update.service')

const ItemUpdateController = {

    create: catchAsync(async (req, res, next) => {
        const { item_id: itemId } = req.validated.params
        const { content } = req.validated.body

        const itemUpdate = await ItemUpdateService.create({
            user: req.user,
            itemId,
            content
        })

        return res.status(201).json(itemUpdate)
    }),

    list: catchAsync(async (req, res, next) => {
        const { item_id: itemId } = req.validated.params

        const ItemUpdates = await ItemUpdateService.getByItem({
            user: req.user,
            itemId
        })

        return res.status(200).json(ItemUpdates)
    }),

    update: catchAsync(async (req, res, next) => {
        const { item_update_id: itemUpdateId } = req.validated.params
        const { content } = req.validated.body

        const updatedItemUpdate = await ItemUpdateService.update({
            user: req.user,
            itemUpdateId,
            content
        })

        return res.status(200).json(updatedItemUpdate)
    }),

    delete: catchAsync(async (req, res, next) => {
        const { item_update_id: itemUpdateId } = req.validated.params

        await ItemUpdateService.delete({
            user: req.user,
            itemUpdateId
        })

        return res.status(204).send()
    })
}

module.exports = ItemUpdateController