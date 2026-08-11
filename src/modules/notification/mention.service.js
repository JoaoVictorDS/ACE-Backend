const { logger } = require('../../config')
const UserRepository = require('../user/user.repository')

const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g

const MentionService = {

    async resolveRecipients(event) {
        try {
            const currentIds = _extractIds(event.changes?.after)
            const previousIds = _extractIds(event.changes?.before)
            const newIds = currentIds.filter(id => !previousIds.includes(id))
            if (newIds.length === 0) return []

            const validUsers = await UserRepository.validUsersForMention(newIds, event.actor.id, event.boardId)
            return validUsers.map(user => user.id)
        } catch (error) {
            logger.warn({ error: error.message, boardId: event.boardId, itemId: event.itemId }, 'Falha ao resolver menções')
            return []
        }
    },
    
}

const _extractIds = (content) => {
    if (!content || typeof content !== 'string') return []
    const matches = Array.from(content.matchAll(MENTION_REGEX))
    return [...new Set(matches.map(m => Number(m[2])).filter(id => Number.isInteger(id) && id > 0))]
}

module.exports = MentionService