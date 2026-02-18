const prisma = require('../config/prisma')
const PermissionService = require('./PermissionService')
const LogService = require('./LogService')
const BoardContextService = require('./BoardContextService')
const ColumnService = require('./ColumnService')

const ItemService = {

    async createItem({ sectionId, title, userId }) {
        const boardId = await BoardContextService.getBoardId(sectionId, 'SECTION')
        await PermissionService.checkEditPermission(boardId, userId)

        const result = await prisma.$transaction(async (tx) => {
            const lastItem = await tx.item.findFirst({
                where: { section_id: sectionId },
                orderBy: { order: 'desc' },
                select: { order: true }
            })

            const item = await tx.item.create({
                data: {
                    section_id: sectionId,
                    title,
                    order: lastItem ? lastItem.order + 1 : 0,
                },
                include: { item_values: true, comments: true }
            })

            return item
        })

        LogService.register({
            userId,
            boardId,
            action: 'CREATE',
            entityType: 'ITEM',
            entityId: result.id,
            newValue: title
        })

        return result
    },

    async getItemByBoard({ boardId, userId }) {
        await PermissionService.checkViewPermission(boardId, userId)

        const itemsWithValuesQuery = `
            SELECT
                i.id AS item_id,
                COALESCE(
                    jsonb_object_agg(c.name, iv.value) FILTER (WHERE c.id IS NOT NULL),
                    '{}'::jsonb
                ) AS custom_values
            FROM items i
            LEFT JOIN item_values iv ON i.id = iv.item_id
            LEFT JOIN columns c ON iv.column_id = c.id
            WHERE i.section_id IN (SELECT id FROM sections WHERE board_id = $1)
            GROUP BY i.id, i.title, i.section_id
            ORDER BY i.id ASC;
        `

        const rawItems = await prisma.$queryRawUnsafe(itemsWithValuesQuery, boardId)
        const rawItemsMap = new Map(rawItems.map(item => [item.item_id, item.custom_values]))

        const sections = await prisma.section.findMany({
            where: { board_id: boardId },
            orderBy: { order: 'asc' },
            include: {
                items: {
                    orderBy: { order: 'asc' },
                    include: {
                        comments: {
                            include: { user: { select: { id: true, name: true } } },
                            orderBy: { created_at: 'asc' }
                        }
                    }
                }
            }
        })

        return sections.map(section => ({
            ...section,
            items: section.items.map(item => ({
                ...item,
                custom_values: rawItemsMap.get(item.id) || {}
            }))
        }))
    },

    async updateItem({ itemId, title, values = {}, userId }) {
        const boardId = await BoardContextService.getBoardId(itemId, 'ITEM')
        await PermissionService.checkEditPermission(boardId, userId)

        if (Object.keys(values).length > 0) {
            await ColumnService.validateItemValues(values, boardId)
        }

        const result = await prisma.$transaction(async (tx) => {
            const [oldItem, columns] = await Promise.all([
                tx.item.findUnique({
                    where: { id: itemId },
                    include: { item_values: true }
                }),
                tx.column.findMany({
                    where: { board_id: boardId },
                    select: { id: true, name: true }
                })
            ])
            if (!oldItem) throw new Error('Item não encontrado!')

            const columnNameMap = Object.fromEntries(columns.map(c => [c.id, c.name]))

            const changes = []
            const addChange = (label, oldValue, newValue) => {
                changes.push({
                    old: `${label}: "${oldValue || ''}"`,
                    new: `${label}: "${newValue || ''}"`
                })
            }

            if (title && title !== oldItem.title) {
                await tx.item.update({
                    where: { id: itemId },
                    data: { title },
                })
                addChange('Título', oldItem.title, title)
            }

            for (const [columnIdStr, val] of Object.entries(values)) {
                const columnIdNum = parseInt(columnIdStr)
                const columnName = columnNameMap[columnIdNum] || `Col ${columnIdNum}`

                const newValue = (val === null || val === undefined || String(val).trim() === '' || String(val) === 'null') ? '' : String(val).trim()
                const existing = oldItem.item_values.find(v => v.column_id === columnIdNum)
                const oldValue = existing ? existing.value : ''

                if (oldValue !== newValue) {
                    if (newValue === '') {
                        await tx.itemValue.deleteMany({
                            where: {
                                item_id: itemId,
                                column_id: columnIdNum
                            }
                        })
                        addChange(columnName, oldValue, newValue)
                    } else {
                        await tx.itemValue.upsert({
                            where: {
                                item_id_column_id: {
                                    item_id: itemId,
                                    column_id: columnIdNum
                                }
                            }, update: {
                                value: newValue
                            },
                            create: {
                                item_id: itemId,
                                column_id: columnIdNum,
                                value: newValue
                            }
                        })
                        addChange(columnName, oldValue, newValue)
                    }
                }
            }

            const updatedItem = await tx.item.findUnique({
                where: { id: itemId },
                include: {
                    item_values: true,
                    comments: {
                        include: { user: { select: { id: true, name: true } } }
                    }
                }
            })

            return {
                updatedItem,
                oldValue: changes.map(c => c.old).join(' | '),
                newValue: changes.map(c => c.new).join(' | ')
            }
        })

        if (result.oldValue) {
            LogService.register({
                userId,
                boardId,
                action: 'UPDATE',
                entityType: 'ITEM',
                entityId: itemId,
                oldValue: result.oldValue,
                newValue: result.newValue
            })
        }

        return result.updatedItem
    },

    async deleteItem({ itemId, userId }) {
        const boardId = await BoardContextService.getBoardId(itemId, 'ITEM')
        await PermissionService.checkEditPermission(boardId, userId)

        const item = await prisma.item.findUnique({
            where: {
                id: itemId
            }
        })
        if (!item) throw new Error('Item não encontrado!')

        const result = await prisma.$transaction(async (tx) => {
            const deleted = await tx.item.delete({
                where: { id: itemId }
            })

            await tx.item.updateMany({
                where: {
                    section_id: item.section_id,
                    order: { gt: item.order }
                },
                data: { order: { decrement: 1 } }
            })

            return deleted
        })

        LogService.register({
            userId,
            boardId,
            action: 'DELETE',
            entityType: 'ITEM',
            entityId: itemId,
            oldValue: item.title
        })

        return result
    },

    async moveItem({ itemId, newSectionId, newOrder, userId }) {
        const boardId = await BoardContextService.getBoardId(itemId, 'ITEM')
        await PermissionService.checkEditPermission(boardId, userId)

        const result = await prisma.$transaction(async (tx) => {
            const currentItem = await tx.item.findUnique({
                where: { id: itemId },
                select: { section_id: true, order: true, title: true }
            })
            if (!currentItem) throw new Error('Tarefa não encontrada!')

            const oldSectionId = currentItem.section_id
            const oldOrder = currentItem.order
            const finalSectionId = newSectionId || oldSectionId

            if (newSectionId && newSectionId !== oldSectionId) {
                const targetBoardId = await BoardContextService.getBoardId(newSectionId, 'SECTION')
                if (targetBoardId !== boardId) throw new Error('Não é permitido mover itens entre quadros diferentes!')
            }

            const totalInTarget = await tx.item.count({
                where: { section_id: finalSectionId }
            })

            const maxAllowedOrder = (oldSectionId === finalSectionId) ? totalInTarget - 1 : totalInTarget

            let finalOrder = (newOrder === undefined || newOrder === null)
                ? maxAllowedOrder
                : Math.max(0, Math.min(newOrder, maxAllowedOrder))

            if (oldSectionId === finalSectionId && oldOrder === finalOrder) return currentItem

            if (oldSectionId === finalSectionId) {
                if (finalOrder < oldOrder) {
                    await tx.item.updateMany({
                        where: {
                            section_id: oldSectionId,
                            order: {
                                gte: finalOrder,
                                lt: oldOrder,
                            }
                        },
                        data: { order: { increment: 1 } }
                    })
                } else if (finalOrder > oldOrder) {
                    await tx.item.updateMany({
                        where: {
                            section_id: oldSectionId,
                            order: {
                                gt: oldOrder,
                                lte: finalOrder,
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
                        section_id: finalSectionId,
                        order: { gte: finalOrder }
                    },
                    data: { order: { increment: 1 } }
                })
            }

            const updated = await tx.item.update({
                where: { id: itemId },
                data: {
                    section_id: finalSectionId,
                    order: finalOrder,
                }
            })

            return {
                updated,
                oldState: { sectionId: oldSectionId, order: oldOrder },
                newState: { sectionId: finalSectionId, order: finalOrder }
            }
        })

        LogService.register({
            userId,
            boardId,
            action: 'MOVE',
            entityType: 'ITEM',
            entityId: itemId,
            oldValue: `Seção: ${result.oldState.sectionId}, Ordem: ${result.oldState.order}`,
            newValue: `Seção: ${result.newState.sectionId}, Ordem: ${result.newState.order}`
        })

        return result.updated
    },

}

module.exports = ItemService