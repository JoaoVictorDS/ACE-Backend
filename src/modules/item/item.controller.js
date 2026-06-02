const ItemService = require('./item.service')
const catchAsync = require('../../shared/utils/catchAsync')

const ItemController = {

    create: catchAsync(async (req, res, next) => {
        const { section_id: sectionId } = req.validated.params
        const { title } = req.validated.body

        const item = await ItemService.create({
            user: req.user,
            sectionId,
            title
        })

        return res.status(201).json(item)
    }),

    show: catchAsync(async (req, res, next) => {
        const { item_id: itemId } = req.validated.params

        const item = await ItemService.getById({
            user: req.user,
            itemId
        })

        return res.status(200).json(item)
    }),

    update: catchAsync(async (req, res, next) => {
        const { item_id: itemId } = req.validated.params
        const { title } = req.validated.body

        const updatedItem = await ItemService.update({
            user: req.user,
            itemId,
            title
        })

        return res.status(200).json(updatedItem)
    }),

    delete: catchAsync(async (req, res, next) => {
        const { item_id: itemId } = req.validated.params

        await ItemService.delete({
            user: req.user,
            itemId
        })

        return res.status(204).send()
    }),

    move: catchAsync(async (req, res, next) => {
        const { item_id: itemId } = req.validated.params
        const { new_section_id: newSectionId, new_order: newOrder } = req.validated.body

        const movedItem = await ItemService.move({
            user: req.user,
            itemId,
            newSectionId,
            newOrder
        })

        return res.status(200).json(movedItem)
    }),

}

module.exports = ItemController