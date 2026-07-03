const { appEventEmitter, emitToRoom } = require('../../config')
const LogService = require('../log/log.service')
const MentionService = require('../notification/mention.service')
const ItemRepository = require('../item/item.repository')
const ItemUpdateRespository = require('./item-update.repository')
const { PermissionService } = require('../../shared/services')
const { RESOURCE_TYPES, PERMISSION_LEVELS, NOTIFICATION_TYPES } = require('../../shared/constants')

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
            action: NOTIFICATION_TYPES.ITEM_UPDATE_CREATED,
            content: { itemTitle }
        })

        emitToRoom(`board:${boardId}`, 'item_update:created', newItemUpdate)

        return newItemUpdate
    },

}

module.exports = ItemUpdateService