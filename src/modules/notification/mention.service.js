const { logger } = require('../../config')
const { AuthorizationError } = require('../../shared/errors')
const ERROR_CATALOG = require('../../shared/errors/error-catalog')
const UserRepository = require('../user/user.repository')

const MentionService = {

    async resolveRecipients(event) {
        try {
            const currentIds = _extractMentionIds(event.changes?.after)
            const previousIds = new Set(_extractMentionIds(event.changes?.before))

            const newIds = currentIds.filter(id => !previousIds.has(id))

            if (newIds.length === 0) return []

            const validUsers = await UserRepository.findValidUsersForMention(newIds, event.boardId)

            return validUsers
                .filter(user => user.id !== event.actor.id)
                .map(user => user.id)
        } catch (error) {
            logger.warn({ error: error.message, boardId: event.boardId, itemId: event.itemId }, 'Falha ao resolver menções')

            return []
        }
    },

    async validateContentMentions({ content, previousContent = null, boardId }) {
        const currentMentionIds = _extractMentionIds(content)
        const previousMentionIds = new Set(_extractMentionIds(previousContent))

        const newMentionIds = currentMentionIds.filter(id => !previousMentionIds.has(id))

        if (newMentionIds.length === 0) return

        const validUsers = await UserRepository.findValidUsersForMention(newMentionIds, boardId)

        if (validUsers.length !== newMentionIds.length) {
            throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('mencionar', 'USER'))
        }
    },

}

const _extractMentionIds = (content) => {
    if (!content || typeof content !== 'object') return []

    const ids = new Set()

    const traverse = (node) => {
        if (!node || typeof node !== 'object') return

        if (Array.isArray(node)) {
            node.forEach(traverse)
            return
        }

        if (node.type === 'mention') {
            const rawId = node.attrs?.id

            const id = (typeof rawId === 'string' && rawId.trim() !== '') || typeof rawId === 'number'
                ? Number(rawId)
                : NaN

            if (Number.isSafeInteger(id) && id > 0) {
                ids.add(id)
            }
        }

        if (Array.isArray(node.content)) {
            node.content.forEach(traverse)
        }
    }

    traverse(content)

    return [...ids]
}

module.exports = MentionService