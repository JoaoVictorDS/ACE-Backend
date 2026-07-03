const { appEventEmitter, emitToRoom } = require('../../config')
const LogService = require('../log/log.service')
const ItemRepository = require('./item.repository')
const { NotFoundError, ValidationError } = require('../../shared/errors')
const { NOTIFICATION_TYPES, RESOURCE_TYPES, PERMISSION_LEVELS } = require('../../shared/constants')
const { PermissionService } = require('../../shared/services')
const { TransactionManager } = require('../../shared/database')
const ERROR_CATALOG = require('../../shared/errors/error-catalog')

const ItemService = {

    async create({ user, sectionId, title }) {
        const { boardId, workspaceId } = await PermissionService.check(RESOURCE_TYPES.SECTION, sectionId, user, PERMISSION_LEVELS.EDIT)

        const result = await TransactionManager.run(async (tx) => {
            const order = await ItemRepository.findMaxOrder(sectionId, tx)

            return await ItemRepository.create(sectionId, title, order, tx)
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

        const item = await ItemRepository.findById(itemId)
        if (!item) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.ITEM)

        return item
    },

    async update({ user, itemId, title }) {
        const { boardId, workspaceId } = await PermissionService.check(RESOURCE_TYPES.ITEM, itemId, user, PERMISSION_LEVELS.EDIT)

        const currentItem = await ItemRepository.findItemTitle(itemId)
        if (!currentItem) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.ITEM)

        const hasTitleChanged = title && title !== currentItem.title
        if (!hasTitleChanged) return currentItem

        const updatedItem = await ItemRepository.update(itemId, title)

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

        const item = await ItemRepository.findByIdBasic(itemId)
        if (!item) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.ITEM)

        const result = await TransactionManager.run(async (tx) => {
            await ItemRepository.decrementOrderAfter(item.section_id, item.order, tx)

            return ItemRepository.delete(itemId, tx)
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

        const result = await TransactionManager.runWithRetry(async (tx) => {
            const currentItem = await ItemRepository.findByIdBasic(itemId, tx)
            if (!currentItem) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.ITEM)

            const oldSectionId = currentItem.section_id
            const oldOrder = currentItem.order
            const finalSectionId = newSectionId || oldSectionId
            const hasSectionChanged = newSectionId && newSectionId !== oldSectionId

            if (hasSectionChanged) {
                const { boardId: targetBoardId } = await PermissionService._resolveResourceContext(RESOURCE_TYPES.SECTION, newSectionId)
                const isDifferentBoard = targetBoardId !== boardId

                if (isDifferentBoard) throw new ValidationError(ERROR_CATALOG.VALIDATION.INVALID_ACTION('Não é permitido mover tarefas entre quadros diferentes.'))
            }

            const totalInTarget = await ItemRepository.countBySection(finalSectionId, tx)
            const maxAllowedOrder = (oldSectionId === finalSectionId) ? totalInTarget - 1 : totalInTarget
            const finalOrder = (newOrder === undefined || newOrder === null)
                ? maxAllowedOrder
                : Math.max(0, Math.min(newOrder, maxAllowedOrder))
            const isSameSection = oldSectionId === finalSectionId
            const isSamePostion = oldOrder === finalOrder

            if (isSameSection && isSamePostion) return currentItem
            if (isSameSection) {
                if (finalOrder < oldOrder) {
                    await ItemRepository.incrementOrderRange(oldSectionId, oldOrder, finalOrder, tx)
                } else if (finalOrder > oldOrder) {
                    await ItemRepository.decrementOrderRange(oldSectionId, oldOrder, finalOrder, tx)
                }
            } else {
                await ItemRepository.decrementOrderAfter(oldSectionId, oldOrder, tx)
                await ItemRepository.incrementOrderAfter(finalSectionId, finalOrder, tx)
            }

            const updated = await ItemRepository.updateSectionAndOrder(itemId, finalSectionId, finalOrder, tx)

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