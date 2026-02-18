const prisma = require('../config/prisma')
const PermissionService = require('./PermissionService')

const LogService = {

    async register({ userId, boardId, action, entityType, entityId, oldValue = null, newValue = null }) {
        try {
            const formatValue = (val) => {
                if (val === null || val === undefined) return null
                if (typeof val === 'object') {
                    try {
                        return JSON.stringify(val).substring(0, 500)
                    } catch {
                        return '[Object]'
                    }
                }
                return String(val).substring(0, 500)
            }

            await prisma.activityLog.create({
                data: {
                    user_id: userId,
                    board_id: boardId,
                    action,
                    entity_type: entityType,
                    entity_id: parseInt(entityId),
                    old_value: formatValue(oldValue),
                    new_value: formatValue(newValue),
                }
            })
        } catch (error) {
            console.error('⚠️ [LOG ERROR]:', error.message)
        }
    },

    async getLogsByBoard(boardId, userId) {
        await PermissionService.checkViewPermission(boardId, userId)

        return await prisma.activityLog.findMany({
            where: { board_id: boardId },
            include: {
                user: {
                    select: { name: true, email: true }
                }
            },
            orderBy: {
                created_at: 'desc'
            },
            take: 100
        })
    }

}

module.exports = LogService