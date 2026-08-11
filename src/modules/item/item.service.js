const { appEventEmitter, emitToRoom } = require('../../config')
const LogService = require('../log/log.service')
const ItemRepository = require('./item.repository')
const { NotFoundError, ValidationError } = require('../../shared/errors')
const { NOTIFICATION_TYPES, RESOURCE_TYPES, PERMISSION_LEVELS, ENTITY_TYPES } = require('../../shared/constants')
const { PermissionService } = require('../../shared/services')
const { TransactionManager } = require('../../shared/database')
const ERROR_CATALOG = require('../../shared/errors/error-catalog')
const { EventPublisher } = require('../../shared/events')

const ItemService = {

    async create({ user, sectionId, title }) {
        const { boardId, workspaceId } = await PermissionService.check(RESOURCE_TYPES.SECTION, sectionId, user, PERMISSION_LEVELS.EDIT)

        const result = await TransactionManager.run(async (tx) => {
            const order = await ItemRepository.findMaxOrder(sectionId, tx)

            return await ItemRepository.create(sectionId, title, order, tx)
        })

        EventPublisher.publish({
            actor: user,
            workspaceId,
            boardId,
            itemId: result.id,
            entityType: ENTITY_TYPES.ITEM,
            entityId: result.id,
            action: 'CREATE',
            resource: { workspaceId, boardId, sectionId: result.section_id, item: { id: result.id, title: result.title } },
            changes: { before: null, after: result.title },
            snapshot: {
                before: null,
                after: {
                    id: result.id,
                    section_id: result.section_id,
                    title: result.title,
                    order: result.order,
                    deleted_at: null
                }
            }
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

        EventPublisher.publish({
            actor: user,
            workspaceId,
            boardId,
            itemId: updatedItem.id,
            entityType: ENTITY_TYPES.ITEM,
            entityId: updatedItem.id,
            action: 'UPDATE',
            resource: { workspaceId, boardId, sectionId: updatedItem.section_id, item: { id: updatedItem.id, title: updatedItem.title } },
            changes: {
                before: currentItem.title,
                after: updatedItem.title
            },
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

        EventPublisher.publish({
            actor: user,
            workspaceId,
            boardId,
            itemId: item.id,
            entityType: ENTITY_TYPES.ITEM,
            entityId: item.id,
            action: 'DELETE',
            resource: { workspaceId, boardId, sectionId: item.section_id, item: { id: item.id, title: item.title } },
            changes: { before: item.title, after: null },
            snapshot: {
                before: {
                    id: item.id,
                    section_id: item.section_id,
                    title: item.title,
                    order: item.order,
                    deleted_at: null
                },
                after: null
            }
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
                changes: {
                    before: { section_id: oldSectionId, order: oldOrder },
                    after: { section_id: finalSectionId, order: finalOrder }
                }
            }
        })

        if (!result.isSameSection) {
            EventPublisher.publish({
                actor: user,
                workspaceId,
                boardId,
                itemId: result.updated.id,
                entityType: ENTITY_TYPES.ITEM,
                entityId: result.updated.id,
                action: 'MOVE',
                resource: { workspaceId, boardId, sectionId: result.updated.section_id, item: { id: result.updated.id, title: result.updated.title } },
                changes: result.changes
            })
        }

        emitToRoom(`board:${boardId}`, 'item:moved', result.updated)

        return result.updated
    },

}

module.exports = ItemService