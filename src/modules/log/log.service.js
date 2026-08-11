const { logger } = require('../../config')
const LogRepository = require('./log.repository')
const { PERMISSION_LEVELS, RESOURCE_TYPES } = require('../../shared/constants')
const { PermissionService, PaginationService } = require('../../shared/services')
const LogPresenter = require('./log.presenter')

const LogService = {

    async register({ actorId, workspaceId, boardId, action, entityType, entityId, payload, tx = null }) {
        try {
            await LogRepository.create({
                actor_id: actorId,
                workspace_id: workspaceId,
                board_id: boardId,
                action,
                entity_type: entityType,
                entity_id: entityId,
                payload,
            }, tx)
        } catch (error) {
            logger.error(
                { error: error.message, actorId, workspaceId, boardId, action, entityType, entityId },
                'Registro do Activity log falhou'
            )
        }
    },

    async getByWorkspace({ user, workspaceId, page, limit }) {
        await PermissionService.checkWorkspace(workspaceId, user, PERMISSION_LEVELS.VIEW)
        const [data, total] = await Promise.all([
            LogRepository.findByWorkspacePaginated(workspaceId, page, limit),
            LogRepository.countByWorkspace(workspaceId)
        ])

        return PaginationService.createPaginatedResponse(LogPresenter.formatMany(data), total, page, limit)
    },

    async getByBoard({ user, boardId, page, limit }) {
        await PermissionService.check(RESOURCE_TYPES.BOARD, boardId, user, PERMISSION_LEVELS.VIEW)
        const [data, total] = await Promise.all([
            LogRepository.findByBoardPaginated(boardId, page, limit),
            LogRepository.countByBoard(boardId)
        ])

        return PaginationService.createPaginatedResponse(LogPresenter.formatMany(data), total, page, limit)
    },
}

module.exports = LogService