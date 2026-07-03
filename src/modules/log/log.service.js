const { logger } = require('../../config')
const LogRepository = require('./log.repository')
const { PERMISSION_LEVELS, RESOURCE_TYPES } = require('../../shared/constants')
const { PermissionService, PaginationService } = require('../../shared/services')

const LogService = {

    async register({ userId, workspaceId, boardId, action, entityType, entityId, oldValue = null, newValue = null, tx = null }) {
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

            await LogRepository.create({
                user_id: userId,
                workspace_id: workspaceId,
                board_id: boardId,
                action,
                entity_type: entityType,
                entity_id: parseInt(entityId),
                old_value: formatValue(oldValue),
                new_value: formatValue(newValue),
            }, tx)

        } catch (error) {
            logger.error(
                { error: error.message, userId, workspaceId, boardId, action, entityType, entityId },
                'Activity log registration failed'
            )
        }
    },

    async getByWorkspace({ user, workspaceId, page, limit }) {
        await PermissionService.checkWorkspace(workspaceId, user, PERMISSION_LEVELS.VIEW)
        const [data, total] = await Promise.all([
            LogRepository.findByWorkspacePaginated(workspaceId, page, limit),
            LogRepository.countByWorkspace(workspaceId)
        ])

        return PaginationService.createPaginatedResponse(data, total, page, limit)
    },

    async getByBoard({ user, boardId, page, limit }) {
        await PermissionService.check(RESOURCE_TYPES.BOARD, boardId, user, PERMISSION_LEVELS.VIEW)
        const [data, total] = await Promise.all([
            LogRepository.findByBoardPaginated(boardId, page, limit),
            LogRepository.countByBoard(boardId)
        ])

        return PaginationService.createPaginatedResponse(data, total, page, limit)
    },

}

module.exports = LogService