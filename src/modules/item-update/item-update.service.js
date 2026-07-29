const { appEventEmitter, emitToRoom } = require('../../config')
const LogService = require('../log/log.service')
const MentionService = require('../notification/mention.service')
const ItemRepository = require('../item/item.repository')
const ItemUpdateRespository = require('./item-update.repository')
const ItemUpdatePresenter = require('./item-update.presenter')
const { AuthorizationError, NotFoundError } = require('../../shared/errors')
const { PermissionService } = require('../../shared/services')
const { RESOURCE_TYPES, PERMISSION_LEVELS, NOTIFICATION_TYPES, ENTITY_TYPES } = require('../../shared/constants')
const ERROR_CATALOG = require('../../shared/errors/error-catalog')
const { ActionBuilder, Changes } = require('../../shared/builders')

const ItemUpdateService = {

    async create({ user, itemId, content }) {
        const { boardId, workspaceId } = await PermissionService.check(RESOURCE_TYPES.ITEM, itemId, user, PERMISSION_LEVELS.EDIT)
        const userId = user.id
        const { title: itemTitle } = await ItemRepository.findItemTitle(itemId)
        const newItemUpdate = await ItemUpdateRespository.create(userId, itemId, content)
        const record = new ActionBuilder({ actor: user, workspaceId, boardId })
            .entity(newItemUpdate.id, ENTITY_TYPES.ITEM_UPDATE)
            .forItem(itemId, itemTitle)
            .withAction('CREATE')
            .withChanges(Changes.created(content))
            .build()

        LogService.register(record)
        MentionService.process(record)
        appEventEmitter.emit('item.action', record)
        emitToRoom(`board:${boardId}`, 'item_update:created', newItemUpdate)

        return newItemUpdate
    },

    async getByItem({ user, itemId }) {
        await PermissionService.check(RESOURCE_TYPES.ITEM, itemId, user, PERMISSION_LEVELS.VIEW)

        return await ItemUpdateRespository.findByItem(itemId)
    },

    async update({ user, itemUpdateId, content }) {
        const current = await ItemUpdateRespository.findById(itemUpdateId)
        if (!current)
            throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.ITEM_UPDATE)

        const userId = user.id
        const isOwner = current.user_id === userId
        if (!isOwner)
            throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('editar', 'ITEM_UPDATE'))

        const { boardId, workspaceId } = await PermissionService._resolveResourceContext(RESOURCE_TYPES.ITEM, current.item_id)

        if (current.content === content) return ItemUpdatePresenter.update(current)

        const updatedItemUpdate = await ItemUpdateRespository.update(itemUpdateId, content)

        const record = new ActionBuilder({ actor: user, workspaceId, boardId })
            .entity(itemUpdateId, ENTITY_TYPES.ITEM_UPDATE)
            .forItem(current.item_id, current.item.title)
            .withAction('UPDATE')
            .withChanges(Changes.updated(current.content, content))
            .build()

        LogService.register(record)
        MentionService.process(record)
        appEventEmitter.emit('item.action', record)
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

        const record = new ActionBuilder({ actor: user, workspaceId, boardId })
            .entity(itemUpdateId, ENTITY_TYPES.ITEM_UPDATE)
            .forItem(itemUpdate.item_id, itemUpdate.item.title)
            .withAction('DELETE')
            .withChanges(Changes.deleted(itemUpdate.content))
            .build()

        LogService.register(record)
        appEventEmitter.emit('item.action', record)
        emitToRoom(`board:${boardId}`, 'item_update:deleted', { itemUpdateId })

        return deletedItemUpdate
    }

}

module.exports = ItemUpdateService