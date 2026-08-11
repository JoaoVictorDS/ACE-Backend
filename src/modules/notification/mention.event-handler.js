const NotificationService = require('../notification/notification.service')
const MentionService = require('./mention.service')
const { ENTITY_TYPES } = require('../../shared/constants')

const MENTIONABLE_ENTITY_TYPES = [ENTITY_TYPES.COMMENT, ENTITY_TYPES.ITEM_UPDATE]
const MENTIONABLE_ACTIONS = ['CREATE', 'UPDATE']

const handleEvent = async (event) => {
    if (!_isMentionable(event)) return

    const recipientIds = await MentionService.resolveRecipients(event)
    if (recipientIds.length === 0) return

    await NotificationService.create({
        actor: event.actor,
        boardId: event.boardId,
        itemId: event.itemId,
        entityType: event.entityType,
        entityId: event.entityId,
        action: 'USER_MENTIONED',
        specificRecipients: recipientIds,
        payload: {
            resource: { ...event.resource, mentionSource: event.entityType },
        },
    })
}

const _isMentionable = (event) =>
    MENTIONABLE_ENTITY_TYPES.includes(event.entityType) && MENTIONABLE_ACTIONS.includes(event.action)

module.exports = handleEvent