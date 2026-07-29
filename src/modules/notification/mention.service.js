const { appEventEmitter, logger } = require('../../config')
const { NOTIFICATION_TYPES } = require('../../shared/constants')
const UserRepository = require('../user/user.repository')

const MentionService = {

    sanitize(text, limit = null) {
        if (!text || typeof text !== 'string') return ''

        let cleanText = text.replace(/@\[([^\]]+)\]\(([^)]+)\)/g, '@$1')

        if (limit && cleanText.length > limit) {
            cleanText = cleanText.substring(0, limit).trim() + '...'
        }

        return cleanText
    },

    async process({ actor, boardId, itemId, entityId, entityType, notificationPayload }) {
        const { before, after } = notificationPayload.changes

        try {
            const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g

            const extractIds = (content) => {
                if (!content || typeof content !== 'string') return []

                const matches = Array.from(content.matchAll(mentionRegex))
                const ids = matches
                    .map(m => Number(m[2]))
                    .filter(id => Number.isInteger(id) && id > 0)

                return [...new Set(ids)]
            }

            const currentIds = extractIds(after)
            const previousIds = extractIds(before)
            const idsToNotify = currentIds.filter(id => !previousIds.includes(id))

            if (idsToNotify.length === 0) return

            const validUsers = await UserRepository.validUsersForMention(idsToNotify, actor.id, boardId)
            const finalIds = validUsers.map(u => u.id)
            if (finalIds.length === 0) return

            appEventEmitter.emit('item.action', {
                actor,
                boardId,
                itemId,
                entityId,
                entityType,
                notificationAction: NOTIFICATION_TYPES.USER_MENTIONED,
                notificationPayload: notificationPayload,
                specificRecipients: finalIds
            })
        } catch (error) {
            logger.warn({ error: error.message }, 'Processo de Mention falhou')
        }
    }
}

module.exports = MentionService 