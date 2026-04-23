const prisma = require('../config/prisma')
const PermissionService = require('./PermissionService')
const LogService = require('./LogService')
const ColumnService = require('./ColumnService')
const ItemAssigneeService = require('./ItemAssigneeService')
const appEventEmitter = require('../config/events')
const AppError = require('../utils/AppError')

const ItemService = {

    async createItem({ user, sectionId, title }) {
        const { boardId, workspaceId } = await PermissionService.checkPermission(PermissionService.TYPES.SECTION, sectionId, user, PermissionService.LEVELS.EDIT)

        const result = await prisma.$transaction(async (tx) => {
            const lastItem = await tx.item.findFirst({
                where: { section_id: sectionId },
                orderBy: { order: 'desc' },
                select: { order: true }
            })

            return await tx.item.create({
                data: {
                    section_id: sectionId,
                    title,
                    order: lastItem ? lastItem.order + 1 : 0,
                },
                include: { item_values: true, comments: true }
            })
        })

        LogService.register({
            userId: user.id,
            workspaceId,
            boardId,
            action: 'CREATE',
            entityType: 'ITEM',
            entityId: result.id,
            newValue: `Item criado: ${title}`
        })

        appEventEmitter.emit('item.action', {
            actor: user,
            itemId: result.id,
            boardId,
            action: 'ITEM_CREATE',
            content: { itemTitle: title }
        })

        return result
    },

    async getItemsByBoard({ user, boardId }) {
        await PermissionService.checkPermission(PermissionService.TYPES.BOARD, boardId, user, PermissionService.LEVELS.VIEW)

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

    async updateItem({ user, itemId, title, values = {} }) {
        const { boardId, workspaceId } = await PermissionService.checkPermission(PermissionService.TYPES.ITEM, itemId, user, PermissionService.LEVELS.EDIT)

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
                    select: { id: true, name: true, data_type: true }
                })
            ])
            if (!oldItem) throw new AppError('Tarefa não encontrada!', 404)

            const changes = []
            const notificationChanges = []
            const addChange = (label, oldValue, newValue) => {
                changes.push({
                    old: `${label}: "${oldValue || ''}"`,
                    new: `${label}: "${newValue || ''}"`
                })
            }
            const hasTitleChanged = title && title !== oldItem.title

            if (hasTitleChanged) {
                await tx.item.update({
                    where: { id: itemId },
                    data: { title },
                })
                addChange('Título', oldItem.title, title)
                notificationChanges.push({
                    field: 'system_title',
                    label: 'Título',
                    oldValue: oldItem.title,
                    newValue: title
                })
            }

            const userIdsToFetch = new Set()
            const parseValues = Object.entries(values).map(([columnIdStr, val]) => {
                const columnIdNum = parseInt(columnIdStr)
                const column = columns.find(c => c.id === columnIdNum)
                const isUserColumn = column?.data_type === 'USER'
                const newValue = (val === null || val === undefined || String(val).trim() === '' || String(val) === 'null') ? '' : String(val).trim()
                const existing = oldItem.item_values.find(v => v.column_id === columnIdNum)
                const oldValue = existing?.value ?? ''

                if (isUserColumn && newValue !== oldValue) {
                    if (newValue) newValue.split(',').forEach(id => userIdsToFetch.add(Number(id.trim())))
                    if (oldValue) oldValue.split(',').forEach(id => userIdsToFetch.add(Number(id.trim())))
                }

                return { columnIdNum, column, isUserColumn, newValue, oldValue, hasChanged: newValue !== oldValue }
            })

            let userMap = new Map()

            if (userIdsToFetch.size > 0) {
                const fetchedUsers = await tx.user.findMany({
                    where: { id: { in: Array.from(userIdsToFetch) } },
                    select: { id: true, name: true }
                })
                userMap = new Map(fetchedUsers.map(u => [u.id, u.name]))
            }

            const formatValue = (val, isUserColumn) => {
                if (!isUserColumn || !val) return val
                return val.split(',').map(id => userMap.get(Number(id.trim())) || 'Usuário removido').join(', ')
            }

            for (const { columnIdNum, column, isUserColumn, newValue, oldValue, hasChanged } of parseValues) {
                if (!hasChanged) continue

                const columnName = column?.name || `Col ${columnIdNum}`

                if (isUserColumn) {
                    await ItemAssigneeService.syncAssignees(tx, {
                        itemId,
                        boardId,
                        columnId: columnIdNum,
                        oldValue,
                        newValue
                    })

                    const getIds = (val) => val ? val.split(',').map(id => id.trim()).filter(id => id !== "") : []
                    const oldIds = getIds(oldValue)
                    const newIds = getIds(newValue)
                    const addedIds = newIds.filter(id => !oldIds.includes(id)).map(Number)
                    const removedIds = oldIds.filter(id => !newIds.includes(id)).map(Number)
                    const addedNames = addedIds.map(id => userMap.get(id)).filter(Boolean)
                    const removedNames = removedIds.map(id => userMap.get(id)).filter(Boolean)

                    notificationChanges.push({
                        field: 'custom_column',
                        label: columnName,
                        isAssignee: true,
                        addedUserIds: addedIds,
                        addedUserNames: addedNames,
                        removedUserIds: removedIds,
                        removedUserNames: removedNames,
                        oldValue: formatValue(oldValue, isUserColumn),
                        newValue: formatValue(newValue, isUserColumn)
                    })
                }

                if (newValue === '') {
                    await tx.itemValue.deleteMany({
                        where: { item_id: itemId, column_id: columnIdNum }
                    })
                } else {
                    await tx.itemValue.upsert({
                        where: { item_id_column_id: { item_id: itemId, column_id: columnIdNum } },
                        update: { value: newValue },
                        create: { item_id: itemId, column_id: columnIdNum, value: newValue }
                    })
                }

                const formattedOld = formatValue(oldValue, isUserColumn)
                const formattedNew = formatValue(newValue, isUserColumn)

                addChange(columnName, formattedOld, formattedNew)
                if (!isUserColumn) {
                    notificationChanges.push({
                        field: 'custom_column',
                        label: columnName,
                        oldValue: formattedOld,
                        newValue: formattedNew
                    })
                }
            }

            const updatedItem = await tx.item.findUnique({
                where: { id: itemId },
                include: {
                    item_values: true,
                    comments: {
                        include: {
                            user: { select: { id: true, name: true } }
                        }
                    }
                }
            })

            return {
                updatedItem,
                oldValueLog: changes.length > 0 ? changes.map(c => c.old).join(' | ') : null,
                newValueLog: changes.length > 0 ? changes.map(c => c.new).join(' | ') : null,
                itemTitle: oldItem.title,
                notificationChanges
            }
        })

        if (result.oldValueLog) {
            LogService.register({
                userId: user.id,
                workspaceId,
                boardId,
                action: 'UPDATE',
                entityType: 'ITEM',
                entityId: itemId,
                oldValue: result.oldValueLog,
                newValue: result.newValueLog
            })
        }

        if (result.notificationChanges.length > 0 || (title && title !== result.updatedItem.title)) {
            appEventEmitter.emit('item.action', {
                actor: user,
                itemId,
                boardId,
                action: 'ITEM_UPDATE',
                content: {
                    itemTitle: result.itemTitle,
                    changes: result.notificationChanges
                }
            })
        }

        return result.updatedItem
    },

    async deleteItem({ user, itemId }) {
        const { boardId, workspaceId } = await PermissionService.checkPermission(PermissionService.TYPES.ITEM, itemId, user, PermissionService.LEVELS.EDIT)

        const item = await prisma.item.findUnique({
            where: {
                id: itemId
            }
        })
        if (!item) throw new AppError('Tarefa não encontrada!', 404)

        const result = await prisma.$transaction(async (tx) => {
            await tx.item.updateMany({
                where: {
                    section_id: item.section_id,
                    order: { gt: item.order }
                },
                data: { order: { decrement: 1 } }
            })

            return await tx.item.delete({
                where: { id: itemId }
            })
        })

        LogService.register({
            userId: user.id,
            workspaceId,
            boardId,
            action: 'DELETE',
            entityType: 'ITEM',
            entityId: itemId,
            oldValue: `Item removido: ${item.title}`
        })

        appEventEmitter.emit('item.action', {
            actor: user,
            itemId,
            boardId,
            action: 'ITEM_DELETE',
            content: { itemTitle: item.title }
        })

        return result
    },

    async moveItem({ user, itemId, newSectionId, newOrder }) {
        const { boardId, workspaceId } = await PermissionService.checkPermission(PermissionService.TYPES.ITEM, itemId, user, PermissionService.LEVELS.EDIT)

        const result = await prisma.$transaction(async (tx) => {
            const currentItem = await tx.item.findUnique({
                where: { id: itemId },
                select: { section_id: true, order: true, title: true }
            })
            if (!currentItem) throw new AppError('Tarefa não encontrada!', 404)

            const oldSectionId = currentItem.section_id
            const oldOrder = currentItem.order
            const finalSectionId = newSectionId || oldSectionId
            const hasSectionChanged = newSectionId && newSectionId !== oldSectionId

            if (hasSectionChanged) {
                const { boardId: targetBoardId } = await PermissionService._resolveBoardContext(PermissionService.TYPES.SECTION, newSectionId)
                const isDifferentBoard = targetBoardId !== boardId

                if (isDifferentBoard) throw new AppError('Não é permitido mover tarefas entre quadros diferentes!', 400)
            }

            const totalInTarget = await tx.item.count({
                where: { section_id: finalSectionId }
            })
            const maxAllowedOrder = (oldSectionId === finalSectionId) ? totalInTarget - 1 : totalInTarget
            const finalOrder = (newOrder === undefined || newOrder === null)
                ? maxAllowedOrder
                : Math.max(0, Math.min(newOrder, maxAllowedOrder))
            const isSameSection = oldSectionId === finalSectionId
            const isSamePostion = oldOrder === finalOrder

            if (isSameSection && isSamePostion) return currentItem
            if (isSameSection) {
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
                isSameSection,
                oldState: { sectionId: oldSectionId, order: oldOrder },
                newState: { sectionId: finalSectionId, order: finalOrder }
            }
        })

        LogService.register({
            userId: user.id,
            workspaceId,
            boardId,
            action: 'MOVE',
            entityType: 'ITEM',
            entityId: itemId,
            oldValue: `Seção: ${result.oldState.sectionId}, Ordem: ${result.oldState.order}`,
            newValue: `Seção: ${result.newState.sectionId}, Ordem: ${result.newState.order}`
        })

        if (!result.isSameSection) {
            appEventEmitter.emit('item.action', {
                actor: user,
                itemId,
                boardId,
                action: 'ITEM_MOVE',
                content: { itemTitle: result.updated.title }
            })
        }

        return result.updated
    },

}

module.exports = ItemService