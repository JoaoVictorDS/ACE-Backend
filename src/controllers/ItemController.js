const ItemService = require('../services/ItemService')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/AppError')
const { createItemSchema, updateItemSchema, moveItemSchema } = require('../validators/itemValidator')

const ItemController = {

    create: catchAsync(async (req, res, next) => {
        const result = createItemSchema.safeParse({
            ...req.body,
            section_id: parseInt(req.params.sectionId)
        })
        if (!result.success) return next(new AppError(result.error.issues[0].message, 400))

        const { section_id, title } = result.data

        const item = await ItemService.createItem({
            sectionId: section_id,
            title,
            userId: req.user.id
        })

        return res.status(201).json({
            message: 'Tarefa criada com sucesso!',
            item
        })

    }),

    list: catchAsync(async (req, res, next) => {
        const boardId = parseInt(req.params.boardId)
        if (!boardId || isNaN(boardId)) return next(new AppError('O parâmetro "boardId" é obrigatório e deve ser number', 400))

        const sectionsWithItems = await ItemService.getItemByBoard({
            boardId,
            userId: req.user.id
        })

        return res.status(200).json(sectionsWithItems)
    }),

    update: catchAsync(async (req, res, next) => {
        const result = updateItemSchema.safeParse({
            ...req.body,
            item_id: parseInt(req.params.itemId)
        })
        if (!result.success) return next(new AppError(result.error.issues[0].message, 400))

        const { item_id, ...rest } = result.data

        const item = await ItemService.updateItem({
            itemId: item_id,
            ...rest,
            userId: req.user.id,
        })

        return res.json({
            message: 'Tarefa atualizada!',
            item
        })

    }),

    delete: catchAsync(async (req, res, next) => {
        const itemId = parseInt(req.params.itemId)
        if (!itemId || isNaN(itemId)) return next(new AppError('O parâmetro "itemId" é obrigatório e deve ser number', 400))

        await ItemService.deleteItem({
            itemId,
            userId: req.user.id
        })

        return res.status(200).json({ message: 'Tarefa excluída com sucesso!' })

    }),

    move: catchAsync(async (req, res, next) => {
        const result = moveItemSchema.safeParse({
            ...req.body,
            item_id: parseInt(req.params.itemId)
        })
        if (!result.success) return next(new AppError(result.error.issues[0].message, 400))

        const { new_section_id, new_order, item_id } = result.data

        const movedItem = await ItemService.moveItem({
            itemId: item_id,
            userId: req.user.id,
            newSectionId: new_section_id,
            newOrder: new_order
        })

        return res.json({
            message: 'Tarefa movida!',
            item: movedItem
        })
    }),

}

module.exports = ItemController