const prisma = require('../config/prisma')
const appEventEmitter = require('../config/events')
const logger = require('../config/logger')

const MentionService = {

    sanitize(text, limit = null) {
        if (!text || typeof text !== 'string') return ''

        let cleanText = text.replace(/@\[([^\]]+)\]\(([^)]+)\)/g, '@$1')

        if (limit && cleanText.length > limit) {
            cleanText = cleanText.substring(0, limit).trim() + '...'
        }

        return cleanText
    },

    async process({ actor, boardId, itemId, itemTitle, text, oldText = '', context = 'description' }) {
        try {
            if (!text || typeof text !== 'string') return

            const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g

            const extractIds = (content) => {
                if (!content || typeof content !== 'string') return []

                const matches = Array.from(content.matchAll(mentionRegex))
                const ids = matches
                    .map(m => Number(m[2]))
                    .filter(id => Number.isInteger(id) && id > 0)

                return [...new Set(ids)]
            }

            const currentIds = extractIds(text)
            const previousIds = extractIds(oldText)
            const idsToNotify = currentIds.filter(id => !previousIds.includes(id))

            if (idsToNotify.length === 0) return

            const validUsers = await prisma.user.findMany({
                where: {
                    id: {
                        in: idsToNotify,
                        not: actor.id
                    },
                    is_active: true,
                    board_members: {
                        some: { board_id: boardId }
                    }
                },
                select: { id: true }
            })
            const finalIds = validUsers.map(u => u.id)
            if (finalIds.length === 0) return

            appEventEmitter.emit('item.action', {
                actor,
                boardId,
                itemId,
                action: 'USER_MENTIONED',
                specificRecipients: finalIds,
                content: {
                    itemTitle,
                    context
                }
            })
        } catch (error) {
            logger.warn({ error: error.message, boardId, itemId, actorId: actor?.id }, 'Mention processing failed')
        }
    }
}

module.exports = MentionService 