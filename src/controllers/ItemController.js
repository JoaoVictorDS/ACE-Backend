const ItemService = require('../services/ItemService')
const catchAsync = require('../utils/catchAsync')
const { createItemSchema, updateItemSchema, moveItemSchema, deleteItemSchema, listItemsSchema } = require('../validators/itemValidator')

const ItemController = {

    create: catchAsync(async (req, res, next) => {
        const { section_id: sectionId, ...otherFields } = createItemSchema.parse({
            ...req.body,
            ...req.params
        })

        const item = await ItemService.createItem({
            sectionId,
            ...otherFields,
            userId: req.user.id
        })

        return res.status(201).json({
            message: 'Tarefa criada com sucesso!',
            item
        })
    }),

    list: catchAsync(async (req, res, next) => {
        const { board_id: boardId } = listItemsSchema.parse(req.params)

        const sectionsWithItems = await ItemService.getItemsByBoard({
            boardId,
            userId: req.user.id
        })

        return res.status(200).json(sectionsWithItems)
    }),

    update: catchAsync(async (req, res, next) => {
        const { item_id: itemId, ...otherFields } = updateItemSchema.parse({
            ...req.body,
            ...req.params
        })

        const updatedItem = await ItemService.updateItem({
            itemId,
            ...otherFields,
            userId: req.user.id,
        })

        return res.status(200).json({
            message: 'Tarefa atualizada com sucesso!',
            updatedItem
        })
    }),

    delete: catchAsync(async (req, res, next) => {
        const { item_id: itemId } = deleteItemSchema.parse(req.params)

        await ItemService.deleteItem({
            itemId,
            userId: req.user.id
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

        const movedItem = await ItemService.moveItem({
            itemId,
            userId: req.user.id,
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