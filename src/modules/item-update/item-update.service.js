const { appEventEmitter, emitToRoom } = require('../../config')
const LogService = require('../log/log.service')
const MentionService = require('../notification/mention.service')
const ItemRepository = require('../item/item.repository')
const ItemUpdateRespository = require('./item-update.repository')
const ItemUpdatePresenter = require('./item-update.presenter')
const { AuthorizationError, NotFoundError } = require('../../shared/errors')
const { PermissionService } = require('../../shared/services')
const { RESOURCE_TYPES, PERMISSION_LEVELS, NOTIFICATION_TYPES } = require('../../shared/constants')
const ERROR_CATALOG = require('../../shared/errors/error-catalog')

const ItemUpdateService = {

    async create({ user, itemId, content }) {
        const { boardId, workspaceId } = await PermissionService.check(RESOURCE_TYPES.ITEM, itemId, user, PERMISSION_LEVELS.EDIT)

        const userId = user.id

        const { title: itemTitle } = await ItemRepository.findItemTitle(itemId)

        const newItemUpdate = await ItemUpdateRespository.create(userId, itemId, content)

        LogService.register({
            userId,
            workspaceId,
            boardId,
            action: 'CREATE',
            entityType: 'ITEM_UPDATE',
            entityId: newItemUpdate.id,
            newValue: MentionService.sanitize(content, 50)
        })

        MentionService.process({
            actor: user,
            boardId,
            itemId,
            itemTitle,
            text: content,
            context: 'item_update'
        })

        appEventEmitter.emit('item.action', {
            actor: user,
            boardId,
            itemId,
            entityType: 'ITEM_UPDATE',
            entityId: newItemUpdate.id,
            action: NOTIFICATION_TYPES.ITEM_UPDATE_CREATED,
            content: { text: MentionService.sanitize(content, 50) }
        })

        emitToRoom(`board:${boardId}`, 'item_update:created', newItemUpdate)

        return newItemUpdate
    },

    async getByItem({ user, itemId }) {
        await PermissionService.check(RESOURCE_TYPES.ITEM, itemId, user, PERMISSION_LEVELS.VIEW)

        return await ItemUpdateRespository.findByItem(itemId)
    },

    async update({ user, itemUpdateId, content }) {
        const userId = user.id

        const current = await ItemUpdateRespository.findById(itemUpdateId)
        if (!current)
            throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.ITEM_UPDATE)

        const isOwner = current.user_id === userId
        if (!isOwner)
            throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('editar', 'ITEM_UPDATE'))

        const { boardId, workspaceId } = await PermissionService._resolveResourceContext(RESOURCE_TYPES.ITEM, current.item_id)

        if (current.content === content) return ItemUpdatePresenter.update(current)

        const updatedItemUpdate = await ItemUpdateRespository.update(itemUpdateId, content)

        LogService.register({
            userId,
            workspaceId,
            boardId,
            action: 'UPDATE',
            entityType: 'ITEM_UPDATE',
            entityId: itemUpdateId,
            oldValue: MentionService.sanitize(current.content, 50),
            newValue: MentionService.sanitize(content, 50)
        })

        MentionService.process({
            actor: user,
            boardId,
            itemId: current.item_id,
            itemTitle: current.item.title,
            oldText: current.content,
            context: 'item_update',
            text: content,
        })

        appEventEmitter.emit('item.action', {
            actor: user,
            boardId,
            itemId: current.item_id,
            entityType: 'ITEM_UPDATE',
            entityId: itemUpdateId,
            action: NOTIFICATION_TYPES.ITEM_UPDATE_UPDATED,
            content: null
        })

        emitToRoom(`board:${boardId}`, 'item_update:updated', updatedItemUpdate)

        return updatedItemUpdate
    },

    async delete({ user, itemUpdateId }) {
        const itemUpdate = await ItemUpdateRespository.findById(itemUpdateId)
        if (!itemUpdate)
            throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.ITEM_UPDATE)

        const { boardId, workspaceId, creatorId } = await PermissionService._resolveResourceContext(RESOURCE_TYPES.ITEM, itemUpdate.item_id)
        const userId = user.id
        const isOwner = itemUpdate.user_id === userId
        const isBoardOwner = creatorId === userId
        const isSystemAdmin = user.role === 'ADMIN'

        if (!isOwner && !isBoardOwner && !isSystemAdmin)
            throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('excluir', 'ITEM_UPDATE'))

        const deletedItemUpdate = await ItemUpdateRespository.delete(itemUpdateId)

        LogService.register({
            userId,
            workspaceId,
            boardId,
            action: 'DELETE',
            entityType: 'ITEM_UPDATE',
            entityId: itemUpdateId,
            oldValue: itemUpdate.content
        })

        appEventEmitter.emit('item.action', {
            actor: user,
            boardId,
            itemId: itemUpdate.item_id,
            entityType: 'ITEM_UPDATE',
            entityId: itemUpdateId,
            action: NOTIFICATION_TYPES.ITEM_UPDATE_DELETED,
            content: null
        })

        emitToRoom(`board:${boardId}`, 'item_update:deleted', { itemUpdateId })

        return deletedItemUpdate
    }

}

module.exports = ItemUpdateService