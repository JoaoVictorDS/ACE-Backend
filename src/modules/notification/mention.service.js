const { appEventEmitter, logger } = require('../../config')
const UserRepository = require('../user/user.repository')
const { ENTITY_TYPES } = require('../../shared/constants')
const { DOMAIN_EVENT } = require('../../shared/events/domain-event')

const MENTIONABLE_ENTITY_TYPES = [ENTITY_TYPES.COMMENT, ENTITY_TYPES.ITEM_UPDATE]
const MENTIONABLE_ACTIONS = ['CREATE', 'UPDATE']
const MENTION_SOURCE_BY_ENTITY = {
    [ENTITY_TYPES.COMMENT]: 'comment',
    [ENTITY_TYPES.ITEM_UPDATE]: 'item_update',
}
const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g

const MentionService = {

    init() {
        appEventEmitter.on(DOMAIN_EVENT, (event) => this.handleEvent(event))
        logger.info('Mentions: Listener ativo')
    },

    sanitize(text, limit = null) {
        if (!text || typeof text !== 'string') return ''
        let cleanText = text.replace(MENTION_REGEX, '@$1')
        if (limit && cleanText.length > limit) {
            cleanText = cleanText.substring(0, limit).trim() + '...'
        }
        return cleanText
    },

    async handleEvent(event) {
        try {
            if (!MENTIONABLE_ENTITY_TYPES.includes(event.entityType)) return
            if (!MENTIONABLE_ACTIONS.includes(event.action)) return

            const text = event.changes?.after
            if (!text || typeof text !== 'string') return

            const currentIds = this._extractIds(text)
            const previousIds = this._extractIds(event.changes?.before)
            const idsToNotify = currentIds.filter(id => !previousIds.includes(id))
            if (idsToNotify.length === 0) return

            const validUsers = await UserRepository.validUsersForMention(idsToNotify, event.actor.id, event.boardId)
            const finalIds = validUsers.map(u => u.id)
            if (finalIds.length === 0) return

            appEventEmitter.emit(DOMAIN_EVENT, {
                actor: event.actor,
                workspaceId: event.workspaceId,
                boardId: event.boardId,
                itemId: event.itemId,
                entityType: event.entityType,
                entityId: event.entityId,
                action: 'USER_MENTIONED',
                specificRecipients: finalIds,
                resource: { ...event.resource, mentionSource: MENTION_SOURCE_BY_ENTITY[event.entityType] },
            })
        } catch (error) {
            logger.warn({ error: error.message, boardId: event.boardId, itemId: event.itemId }, 'Mention processing failed')
        }
    },

    _extractIds(content) {
        if (!content || typeof content !== 'string') return []
        const matches = Array.from(content.matchAll(MENTION_REGEX))
        const ids = matches.map(m => Number(m[2])).filter(id => Number.isInteger(id) && id > 0)
        return [...new Set(ids)]
    },
}

module.exports = MentionService