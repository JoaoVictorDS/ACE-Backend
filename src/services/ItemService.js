const prisma = require('../config/prisma')
const PermissionService = require('./PermissionService')
const { NOTIFICATION_TYPES, RESOURCE_TYPES, PERMISSION_LEVELS } = require('../constants')
const LogService = require('./LogService')
const appEventEmitter = require('../config/events')
const { emitToRoom } = require('../config/socket')
const AppError = require('../errors/AppError')

const ItemService = {

    async create({ user, sectionId, title }) {
        const { boardId, workspaceId } = await PermissionService.check(RESOURCE_TYPES.SECTION, sectionId, user, PERMISSION_LEVELS.EDIT)

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
            action: NOTIFICATION_TYPES.ITEM_CREATED,
            content: { itemTitle: title }
        })

        emitToRoom(`board:${boardId}`, 'item:created', result)

        return result
    },

    async getById({ user, itemId }) {
        await PermissionService.check(RESOURCE_TYPES.ITEM, itemId, user, PERMISSION_LEVELS.VIEW)

        const item = await prisma.item.findUnique({
            where: { id: itemId },
            include: {
                item_updates: true,
                comments: true
            }
        })
        if (!item) throw new AppError('Item não encontrado.', 404)

        return item
    },

    async update({ user, itemId, title }) {
        const { boardId, workspaceId } = await PermissionService.check(RESOURCE_TYPES.ITEM, itemId, user, PERMISSION_LEVELS.EDIT)

        const currentItem = await prisma.item.findUnique({
            where: { id: itemId }
        })
        if (!currentItem) throw new AppError('Tarefa não encontrada.', 404)

        const hasTitleChanged = title && title !== currentItem.title
        if (!hasTitleChanged) return currentItem

        const updatedItem = await prisma.item.update({
            where: { id: itemId },
            data: { title }
        })

        LogService.register({
            userId: user.id,
            workspaceId,
            boardId,
            action: 'UPDATE',
            entityType: 'ITEM',
            entityId: itemId,
            oldValue: `Título: "${currentItem.title}"`,
            newValue: `Título: "${title}"`
        })

        appEventEmitter.emit('item.action', {
            actor: user,
            itemId,
            boardId,
            action: NOTIFICATION_TYPES.ITEM_UPDATED,
            content: {
                itemTitle: currentItem.title,
                changes: {
                    field: 'system_title',
                    label: 'Título',
                    oldValue: currentItem.title,
                    newValue: title
                }
            }
        })

        emitToRoom(`board:${boardId}`, 'item:updated', updatedItem)

        return updatedItem
    },

    async delete({ user, itemId }) {
        const { boardId, workspaceId } = await PermissionService.check(RESOURCE_TYPES.ITEM, itemId, user, PERMISSION_LEVELS.EDIT)

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
            action: NOTIFICATION_TYPES.ITEM_DELETED,
            content: { itemTitle: item.title }
        })

        emitToRoom(`board:${boardId}`, 'item:deleted', { itemId })

        return result
    },

    async move({ user, itemId, newSectionId, newOrder }) {
        const { boardId, workspaceId } = await PermissionService.check(RESOURCE_TYPES.ITEM, itemId, user, PERMISSION_LEVELS.EDIT)

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
                const { boardId: targetBoardId } = await PermissionService._resolveBoardContext(RESOURCE_TYPES.SECTION, newSectionId)
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
                action: NOTIFICATION_TYPES.ITEM_MOVED,
                content: { itemTitle: result.updated.title }
            })
        }

        emitToRoom(`board:${boardId}`, 'item:moved', result.updated)

        return result.updated
    },

}

module.exports = ItemService