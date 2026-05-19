const ItemService = require('../services/ItemService')
const catchAsync = require('../utils/catchAsync')
const { createItemSchema, showItemSchema, updateItemSchema, moveItemSchema, deleteItemSchema } = require('../validators/itemValidator')

const ItemController = {

    create: catchAsync(async (req, res, next) => {
        const { section_id: sectionId, ...otherFields } = createItemSchema.parse({
            ...req.body,
            ...req.params
        })

        const item = await ItemService.create({
            user: req.user,
            sectionId,
            ...otherFields
        })

        return res.status(201).json({
            message: 'Tarefa criada com sucesso!',
            item
        })
    }),

    show: catchAsync(async (req, res, next) => {
        const { item_id: itemId } = showItemSchema.parse(req.params)

        const item = await ItemService.getById({
            user: req.user,
            itemId
        })

        return res.status(200).json(item)
    }),

    update: catchAsync(async (req, res, next) => {
        const { item_id: itemId, ...otherFields } = updateItemSchema.parse({
            ...req.body,
            ...req.params
        })

        const updatedItem = await ItemService.update({
            user: req.user,
            itemId,
            ...otherFields
        })

        return res.status(200).json({
            message: 'Tarefa atualizada com sucesso!',
            updatedItem
        })
    }),

    delete: catchAsync(async (req, res, next) => {
        const { item_id: itemId } = deleteItemSchema.parse(req.params)

        await ItemService.delete({
            user: req.user,
            itemId
        })

        return res.status(200).json({
            message: 'Tarefa excluída com sucesso!'
        })
    }),

    move: catchAsync(async (req, res, next) => {
        const { new_section_id: newSectionId, new_order: newOrder, item_id: itemId } = moveItemSchema.parse({
            ...req.body,
            ...req.params
        })

        const movedItem = await ItemService.move({
            user: req.user,
            itemId,
            newSectionId,
            newOrder
        })

        return res.status(200).json({
            message: 'Ordem da tarefa atualizada com sucesso!',
            movedItem
        })
    }),

}

module.exports = ItemController