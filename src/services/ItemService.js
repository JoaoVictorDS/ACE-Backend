const prisma = require('../config/prisma')
const PermissionService = require('./PermissionService')
const LogService = require('./LogService')
const BoardContextService = require('./BoardContextService')
const ColumnService = require('./ColumnService')

const ItemService = {

    async createItem({ sectionId, title, values = {}, userId }) {
        const boardId = await BoardContextService.getBoardId(sectionId, 'SECTION')
        await PermissionService.checkEditPermission(boardId, userId)

        await ColumnService.validateItemValues(values, boardId)

        const newItem = await prisma.$transaction(async (tx) => {
            const lastItem = await tx.item.findFirst({
                where: { section_id: sectionId },
                orderBy: { order: 'desc' },
                select: { order: true }
            })

            const newOrder = lastItem ? lastItem?.order + 1 : 0

            const item = await tx.item.create({
                data: {
                    section_id: sectionId,
                    title,
                    order: newOrder,
                },
            })

            const itemValuesToCreate = Object.entries(values)
                .filter(([_, val]) => val !== null && val !== undefined && String(val).trim() !== '')
                .map(([columnId, val]) => ({
                    item_id: item.id,
                    column_id: parseInt(columnId),
                    value: String(val),
                }))

            if (itemValuesToCreate.length > 0) {
                await tx.itemValue.createMany({
                    data: itemValuesToCreate
                })
            }

            return item
        })

        await LogService.register({
            userId,
            boardId,
            action: 'CREATE',
            entityType: 'ITEM',
            entityId: newItem.id,
            newValue: title
        })

        return newItem
    },

    async getItemByBoard({ boardId, userId }) {
        await PermissionService.checkViewPermission(boardId, userId)

        const itemsWithValuesQuery = `
            SELECT
                i.id AS item_id,
                i.title,
                i.section_id,

                jsonb_object_agg(
                    c.name,
                    iv.value
                ) AS custom_values
            FROM
                items i
            JOIN
                item_values iv ON i.id = iv.item_id
            JOIN
                columns c ON iv.column_id = c.id
            WHERE
                i.section_id IN (SELECT id FROM sections WHERE board_id = $1)
            GROUP BY
                i.id, i.title, i.section_id
            ORDER BY
                i.id ASC;
        
        `

        const rawItems = await prisma.$queryRawUnsafe(itemsWithValuesQuery, boardId)

        const rawItemsMap = new Map()
        rawItems.forEach(item => {
            rawItemsMap.set(item.item_id, item.custom_values)
        })

        const sections = await prisma.section.findMany({
            where: { board_id: boardId },
            orderBy: { order: 'asc' },
            include: {
                items: {
                    orderBy: { order: 'asc' },
                    include: {
                        comments: {
                            select: {
                                id: true,
                                content: true,
                                created_at: true,
                                user: {
                                    select: {
                                        name: true,
                                        id: true
                                    }
                                }
                            },
                            orderBy: { created_at: 'asc' }
                        }
                    }
                }
            }
        })

        const finalSections = sections.map(section => ({
            ...section,
            items: section.items.map(item => {
                const pivotedValues = rawItemsMap.get(item.id) || {}

                return {
                    ...item,
                    custom_values: pivotedValues,
                    comments: item.comments,
                }
            })
        }))

        return finalSections
    },

    async updateItem({ itemId, title, sectionId, values = {}, userId }) {
        const boardId = await BoardContextService.getBoardId(itemId, 'ITEM')
        await PermissionService.checkEditPermission(boardId, userId)

        await ColumnService.validateItemValues(values, boardId)

        return prisma.$transaction(async (tx) => {
            const oldItem = await tx.item.findUnique({
                where: { id: itemId }
            })

            const updatedItem = await tx.item.update({
                where: { id: itemId },
                data: {
                    ...(title && { title }),
                    ...(sectionId && { section_id: sectionId }),
                },
            })

            if (title && title !== oldItem.title) {
                await LogService.register({
                    userId,
                    boardId,
                    action: 'UPDATE',
                    entityType: 'ITEM',
                    entityId: itemId,
                    oldValue: oldItem.title,
                    newValue: title
                })
            }

            for (const columnIdStr in values) {
                const columnIdNum = parseInt(columnIdStr)
                const newValue = String(values[columnIdStr])
                const compoundKey = {
                    item_id: itemId,
                    column_id: columnIdNum,
                }

                const existingItemValue = await tx.itemValue.findUnique({
                    where: {
                        item_id_column_id: compoundKey,
                    },
                })

                if (existingItemValue) {
                    if (newValue.trim() === 'null' || newValue.trim() === '') {
                        await tx.itemValue.delete({
                            where: {
                                item_id_column_id: compoundKey,
                            }
                        })
                    } else if (existingItemValue.value !== newValue) {
                        await tx.itemValue.update({
                            where: {
                                item_id_column_id: compoundKey,
                            },
                            data: { value: newValue },
                        })

                        await LogService.register({
                            userId,
                            boardId,
                            action: 'UPDATE',
                            entityType: 'ITEM_VALUE',
                            entityId: itemId,
                            oldValue: existingItemValue.value,
                            newValue
                        })
                    }
                } else if (newValue.trim() !== 'null' && newValue.trim() !== '') {
                    await tx.itemValue.create({
                        data: {
                            item_id: itemId,
                            column_id: columnIdNum,
                            value: newValue,
                        }
                    })

                    await LogService.register({
                        userId,
                        boardId,
                        action: 'CREATE',
                        entityType: 'ITEM_VALUE',
                        entityId: itemId,
                        newValue
                    })
                }
            }

            return updatedItem
        })
    },

    async deleteItem({ itemId, userId }) {
        const boardId = await BoardContextService.getBoardId(itemId, 'ITEM')
        await PermissionService.checkEditPermission(boardId, userId)

        const item = await prisma.item.findUnique({ where: { id: itemId } })
        const deletedItem = await prisma.item.delete({
            where: { id: itemId }
        })

        await LogService.register({
            userId,
            boardId,
            action: 'DELETE',
            entityType: 'ITEM',
            entityId: itemId,
            oldValue: item.title
        })

        return deletedItem
    },

    async moveItem({ itemId, newSectionId, newOrder, userId }) {
        const boardId = await BoardContextService.getBoardId(itemId, 'ITEM')
        await PermissionService.checkEditPermission(boardId, userId)

        const targetBoardId = await BoardContextService.getBoardId(newSectionId, 'SECTION')
        if (targetBoardId !== boardId) throw new Error('Não é permitido mover itens entre quadros diferentes!')

        let oldState = {
            sectionId: 0,
            order: 0
        }

        const movedItem = await prisma.$transaction(async (tx) => {
            const currentItem = await tx.item.findUnique({
                where: { id: itemId },
                select: { section_id: true, order: true, title: true }
            })

            if (!currentItem) throw new Error('Tarefa não encontrada!')

            const oldSectionId = currentItem.section_id
            const oldOrder = currentItem.order

            oldState = {
                sectionId: oldSectionId,
                order: oldOrder
            }

            if (oldSectionId === newSectionId) {
                if (newOrder < oldOrder) {
                    await tx.item.updateMany({
                        where: {
                            section_id: oldSectionId,
                            order: {
                                gte: newOrder,
                                lt: oldOrder,
                            }
                        },
                        data: { order: { increment: 1 } }
                    })
                } else if (newOrder > oldOrder) {
                    await tx.item.updateMany({
                        where: {
                            section_id: oldSectionId,
                            order: {
                                gt: oldOrder,
                                lte: newOrder,
                            }
                        },
                        data: { order: { decrement: 1 } }
                    })
                }
            } else {
                await tx.item.updateMany({
                    where: {
                        section_id: oldSectionId,
                        order: { gt: oldOrder }
                    },
                    data: { order: { decrement: 1 } }
                })

                await tx.item.updateMany({
                    where: {
                        section_id: newSectionId,
                        order: { gte: newOrder }
                    },
                    data: { order: { increment: 1 } }
                })
            }

            const updated = await tx.item.update({
                where: { id: itemId },
                data: {
                    section_id: newSectionId,
                    order: newOrder,
                }
            })

            return updated
        })

        await LogService.register({
            userId,
            boardId,
            action: 'MOVE',
            entityType: 'ITEM',
            entityId: itemId,
            oldValue: `Seção: ${oldState.sectionId}, Ordem: ${oldState.order}`,
            newValue: `Seção: ${newSectionId}, Ordem: ${newOrder}`
        })

        return movedItem
    },

}

module.exports = ItemService