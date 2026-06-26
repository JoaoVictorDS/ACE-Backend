const { catchAsync } = require("../../shared")
const ItemUpdateService = require("./item-update.service")

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
    })
}

module.exports = ItemUpdateController