const { emitToRoom } = require('../../config')
const ItemRepository = require('../item/item.repository')
const ItemUpdateRespository = require('./item-update.repository')
const ItemUpdatePresenter = require('./item-update.presenter')
const { AuthorizationError, NotFoundError } = require('../../shared/errors')
const { PermissionService } = require('../../shared/services')
const { RESOURCE_TYPES, PERMISSION_LEVELS, ENTITY_TYPES } = require('../../shared/constants')
const ERROR_CATALOG = require('../../shared/errors/error-catalog')
const { EventPublisher } = require('../../shared/events')

const ItemUpdateService = {

    async create({ user, itemId, /*parentId,*/ content }) {
        const { boardId, workspaceId } = await PermissionService.check(RESOURCE_TYPES.ITEM, itemId, user, PERMISSION_LEVELS.EDIT)

        const { title: itemTitle } = await ItemRepository.findItemTitle(itemId)

        const newItemUpdate = await ItemUpdateRespository.create(user.id, itemId, content)

        EventPublisher.publish({
            actor: user,
            workspaceId,
            boardId,
            itemId: newItemUpdate.item_id,
            entityType: ENTITY_TYPES.ITEM_UPDATE,
            entityId: newItemUpdate.id,
            action: 'CREATE',
            resource: { workspaceId, boardId, item: { id: itemId, title: itemTitle }, itemUpdateId: newItemUpdate.id },
            changes: { before: null, after: newItemUpdate.content },
            snapshot: {
                before: null,
                after: {
                    id: newItemUpdate.id,
                    user_id: newItemUpdate.user_id,
                    item_id: newItemUpdate.item_id,
                    parent_id: newItemUpdate.parent_id,
                    content: newItemUpdate.user_id,
                    deleted_at: null
                }
            }
        })

        emitToRoom(`board:${boardId}`, 'item_update:created', newItemUpdate)

        return newItemUpdate
    },

    async getByItem({ user, itemId }) {
        await PermissionService.check(RESOURCE_TYPES.ITEM, itemId, user, PERMISSION_LEVELS.VIEW)

        return await ItemUpdateRespository.findByItem(itemId)
    },

    async update({ user, itemUpdateId, content }) {
        const current = await ItemUpdateRespository.findById(itemUpdateId)
        if (!current) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.ITEM_UPDATE)

        const isOwner = current.user_id === user.id
        if (!isOwner) throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('editar', 'ITEM_UPDATE'))

        const { boardId, workspaceId } = await PermissionService._resolveResourceContext(RESOURCE_TYPES.ITEM, current.item_id)

        if (current.content === content) return ItemUpdatePresenter.format(current)

        const updatedItemUpdate = await ItemUpdateRespository.update(itemUpdateId, content)

        EventPublisher.publish({
            actor: user,
            workspaceId,
            boardId,
            itemId: updatedItemUpdate.item_id,
            entityType: ENTITY_TYPES.ITEM_UPDATE,
            entityId: updatedItemUpdate.id,
            action: 'UPDATE',
            resource: { workspaceId, boardId, item: { id: updatedItemUpdate.item_id, title: updatedItemUpdate.item.title } },
            changes: { before: current.content, after: updatedItemUpdate.content }
        })

        emitToRoom(`board:${boardId}`, 'item_update:updated', updatedItemUpdate)

        return updatedItemUpdate
    },

    async delete({ user, itemUpdateId }) {
        const itemUpdate = await ItemUpdateRespository.findById(itemUpdateId)
        if (!itemUpdate) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.ITEM_UPDATE)

        const { boardId, workspaceId, creatorId } = await PermissionService._resolveResourceContext(RESOURCE_TYPES.ITEM, itemUpdate.item_id)
        const userId = user.id
        const isOwner = itemUpdate.user_id === userId
        const isBoardOwner = creatorId === userId
        const isSystemAdmin = user.role === 'ADMIN'
        if (!isOwner && !isBoardOwner && !isSystemAdmin) throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('excluir', 'ITEM_UPDATE'))

        const deletedItemUpdate = await ItemUpdateRespository.softDelete(itemUpdateId)

        EventPublisher.publish({
            actor: user,
            workspaceId,
            boardId,
            itemId: itemUpdate.item_id,
            entityType: ENTITY_TYPES.ITEM_UPDATE,
            entityId: itemUpdate.id,
            action: 'DELETE',
            resource: { workspaceId, boardId, item: { id: itemUpdate.item_id, title: itemUpdate.item.title } },
            changes: { before: itemUpdate.content, after: null },
            snapshot: {
                before: {
                    id: itemUpdate.id,
                    user_id: itemUpdate.user_id,
                    item_id: itemUpdate.item_id,
                    parent_id: itemUpdate.parent_id,
                    content: itemUpdate.content,
                    deleted_at: null
                },
                after: null
            }
        })

        emitToRoom(`board:${boardId}`, 'item_update:deleted', { itemUpdateId })

        return deletedItemUpdate
    }

}

module.exports = ItemUpdateService