const prisma = require('../config/prisma')
const PermissionService = require('./PermissionService')
const { PERMISSION_LEVELS, RESOURCE_TYPES } = require('../constants')
const logger = require('../config/logger')

const LogService = {

    async register({ userId, workspaceId, boardId, action, entityType, entityId, oldValue = null, newValue = null }) {
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
                    workspace_id: workspaceId,
                    board_id: boardId,
                    action,
                    entity_type: entityType,
                    entity_id: parseInt(entityId),
                    old_value: formatValue(oldValue),
                    new_value: formatValue(newValue),
                }
            })
        } catch (error) {
            logger.error(
                { error: error.message, userId, workspaceId, boardId, action, entityType, entityId },
                'Activity log registration failed'
            )
        }
    },

    async getByWorkspace({ user, workspaceId }) {
        await PermissionService.checkWorkspace(workspaceId, user, PERMISSION_LEVELS.VIEW)

        return await prisma.activityLog.findMany({
            where: { workspace_id: workspaceId },
            include: {
                user: { select: { name: true, email: true } }
            },
            orderBy: { created_at: 'desc' },
            take: 100
        })
    },

    async getByBoard({ user, boardId }) {
        await PermissionService.check(RESOURCE_TYPES.BOARD, boardId, user, PERMISSION_LEVELS.VIEW)

        return await prisma.activityLog.findMany({
            where: { board_id: boardId },
            include: {
                user: { select: { name: true, email: true } }
            },
            orderBy: { created_at: 'desc' },
            take: 100
        })
    },

}

module.exports = LogService